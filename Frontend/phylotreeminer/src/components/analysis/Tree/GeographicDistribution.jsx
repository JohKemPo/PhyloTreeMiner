import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Card, Row, Col, Tag, List, Spin, Space, Button } from "antd";
import {
  getCoordinatesForCountryWithFallback,
  isValidCoordinates,
} from "./useGeocoding";
import { ExportOutlined } from "@ant-design/icons";
import { MapContainer, TileLayer, Circle, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const COUNTRY_COORDINATES_CACHE = new Map();

const createLeafletIcon = () => {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
};

const COUNTRY_COLORS = [
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#f9ca24",
  "#6c5ce7",
  "#a29bfe",
  "#fd79a8",
  "#e17055",
  "#00b894",
  "#00cec9",
  "#0984e3",
  "#d63031",
  "#fdcb6e",
  "#636e72",
  "#b2bec3",
];

const getCountryColor = (countryName) => {
  let hash = 0;
  for (let i = 0; i < countryName.length; i++) {
    hash = countryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COUNTRY_COLORS[Math.abs(hash) % COUNTRY_COLORS.length];
};

const calculateRadius = (count, maxCount) => {
  const minRadius = 10000; // 10km
  const maxRadius = 400000; // 300km
  const scale = Math.sqrt(count / maxCount);
  return minRadius + (maxRadius - minRadius) * scale;
};

const getCachedCoordinates = async (country) => {
  if (COUNTRY_COORDINATES_CACHE.has(country)) {
    return COUNTRY_COORDINATES_CACHE.get(country);
  }

  const coordinates = await getCoordinatesForCountryWithFallback(country);
  COUNTRY_COORDINATES_CACHE.set(country, coordinates);
  return coordinates;
};

const clearCountryCache = (country = null) => {
  if (country) {
    COUNTRY_COORDINATES_CACHE.delete(country);
  } else {
    COUNTRY_COORDINATES_CACHE.clear();
  }
};

const useGeoDataProcessing = (sequences) => {
  const [geoData, setGeoData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processGeoData = async () => {
      if (!sequences || sequences.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const countries = {};
      const uniqueCountries = new Set();
      const sequencesByCountry = {};

      for (const sequence of sequences) {
        try {
          const { country, accessionId, isolate, year } = sequence;

          if (country && country !== "Unknown") {
            uniqueCountries.add(country);

            if (!sequencesByCountry[country]) {
              sequencesByCountry[country] = [];
            }

            sequencesByCountry[country].push({
              id: accessionId,
              isolate,
              collectionDate: year,
            });
          }
        } catch (error) {
          console.warn("Error processing sequence:", sequence, error);
        }
      }

      const processWithConcurrency = async (
        items,
        processor,
        concurrency = 1,
      ) => {
        const results = [];
        let index = 0;

        const processNext = async () => {
          if (index >= items.length) return;
          const currentIndex = index++;
          const item = items[currentIndex];

          try {
            const result = await processor(item);
            results[currentIndex] = result;

            await new Promise((resolve) => setTimeout(resolve, 1100));
          } catch (error) {
            results[currentIndex] = { error, country: item };
            console.warn(`Error processing country ${item}:`, error);
          }
          await processNext();
        };

        const workers = Array(Math.min(concurrency, items.length))
          .fill(null)
          .map(processNext);
        await Promise.all(workers);
        return results;
      };

      try {
        const countriesArray = Array.from(uniqueCountries);
        const coordinatesResults = await processWithConcurrency(
          countriesArray,
          async (country) => {
            const coordinates = await getCachedCoordinates(country);
            return { country, coordinates };
          },
          1,
        );

        coordinatesResults.forEach((result) => {
          if (!result.error && isValidCoordinates(result.coordinates)) {
            countries[result.country] = {
              count: sequencesByCountry[result.country].length,
              sequences: sequencesByCountry[result.country],
              coordinates: result.coordinates,
            };
          }
        });

        setGeoData(countries);
      } catch (error) {
        console.error("Error processing coordinates:", error);
      } finally {
        setLoading(false);
      }
    };

    processGeoData();
  }, [sequences]);

  const reloadCountryData = useCallback(async (country) => {
    clearCountryCache(country);
    setLoading(true);
    try {
      const coordinates = await getCachedCoordinates(country);
      setGeoData((prev) => {
        if (prev[country]) {
          return {
            ...prev,
            [country]: { ...prev[country], coordinates: coordinates },
          };
        }
        return prev;
      });
    } catch (error) {
      console.error(`Error reloading country ${country}:`, error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { geoData, loading, reloadCountryData };
};

const GeographicDistribution = ({ sequences }) => {
  const [isClient, setIsClient] = useState(false);
  const { geoData, loading, reloadCountryData } =
    useGeoDataProcessing(sequences);

  useEffect(() => {
    setIsClient(true);
    createLeafletIcon();
  }, []);

  const countryData = useMemo(() => {
    const data = Object.entries(geoData)
      .map(([country, data]) => ({
        country,
        count: data.count,
        coordinates: data.coordinates,
        sequences: data.sequences,
        color: getCountryColor(country),
      }))
      .filter((item) => isValidCoordinates(item.coordinates));

    const maxCount =
      data.length > 0 ? Math.max(...data.map((item) => item.count)) : 0;

    return data.map((item) => ({
      ...item,
      radius: calculateRadius(item.count, maxCount),
    }));
  }, [geoData]);

  if (!isClient) {
    return (
      <div
        style={{
          height: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading Map...
      </div>
    );
  }

  if (loading) {
    return (
      <Card
        title="Geographic Distribution of Sequences"
        style={{ marginBottom: 24 }}
      >
        <div
          style={{
            height: "400px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Spin size="large" tip="Loading geographic data..." />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Geographical Distribution of Sequences"
      style={{ marginBottom: 24 }}
      // extra={
      //   <div style={{ fontSize: '12px', color: '#666' }}>
      //     Cache: {COUNTRY_COORDINATES_CACHE.size} países
      //   </div>
      // }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <div
            style={{ height: "450px", borderRadius: "8px", overflow: "hidden" }}
          >
            <MapContainer
              center={[20, 0]}
              zoom={2.45}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              {countryData.map((country, index) => (
                <Circle
                  key={index}
                  center={country.coordinates}
                  radius={country.radius}
                  pathOptions={{
                    fillColor: country.color,
                    color: "#333",
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.6,
                  }}
                >
                  <Tooltip permanent={false} direction="center" opacity={0.9}>
                    <div
                      style={{
                        textAlign: "center",
                        fontWeight: "bold",
                        fontSize: "14px",
                        color: "#333",
                      }}
                    >
                      <Space direction="vertical">
                        <span>{country.country}</span>
                        <p>{country.count} Sequences</p>
                      </Space>
                    </div>
                  </Tooltip>

                  <Popup>
                    <div style={{ minWidth: "200px" }}>
                      <h4 style={{ margin: "0 0 8px 0", color: country.color }}>
                        {country.country}
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "12px",
                          padding: "8px",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "4px",
                        }}
                      >
                        <Tag color="blue" style={{ margin: 0 }}>
                          {country.count} sequence(s)
                        </Tag>
                        <button
                          onClick={() => reloadCountryData(country.country)}
                          style={{
                            marginLeft: "8px",
                            padding: "2px 6px",
                            fontSize: "10px",
                            border: "1px solid #ddd",
                            borderRadius: "3px",
                            cursor: "pointer",
                            backgroundColor: "#f0f0f0",
                          }}
                          title="Recarregar coordenadas"
                        >
                          ↻
                        </button>
                      </div>

                      <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                        <h5 style={{ margin: "8px 0" }}>sequences:</h5>
                        {country.sequences.map((seq, idx) => (
                          <div
                            key={idx}
                            style={{
                              marginBottom: "8px",
                              padding: "6px",
                              borderLeft: `3px solid ${country.color}`,
                              backgroundColor: "#f8f9fa",
                            }}
                          >
                            <div style={{ fontSize: "12px", color: "#666" }}>
                              Isolate: <i>{seq.isolate === "Unknown" ? seq.isolate : '-' }</i>
                            </div>
                            <div style={{ fontSize: "12px", color: "#666" }}>
                              ID: {seq.id}
                            </div>
                            <div style={{ fontSize: "12px", color: "#666" }}>
                              Date: {seq.collectionDate || "N/A"}
                            </div>
                            <div style={{ fontSize: "12px", color: "#78B2FF" }}>
                              <a
                                href={`https://www.ncbi.nlm.nih.gov/nuccore/${seq.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  icon={<ExportOutlined />}
                                  size="small"
                                  type="link"
                                >
                                  More info
                                </Button>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Popup>
                </Circle>
              ))}
            </MapContainer>
          </div>
        </Col>

        <Col xs={24} md={8}>
          <Card title="Summary by Country" size="small">
            {countryData.length > 0 ? (
              <List
                style={{ height: "400px", overflow: "auto" }}
                dataSource={countryData.sort((a, b) => b.count - a.count)}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <div
                            style={{
                              width: "12px",
                              height: "12px",
                              borderRadius: "50%",
                              backgroundColor: item.color,
                              marginRight: "8px",
                            }}
                          />
                          {item.country}
                        </div>
                      }
                      description={
                        <div>
                          <Tag color="blue">{item.count} sequence(s)</Tag>
                          {item.sequences.slice(0, 3).map((seq, idx) => (
                            <div
                              key={idx}
                              style={{ fontSize: "12px", marginTop: "4px" }}
                            >
                              {seq.id || seq.isolate }
                            </div>
                          ))}
                          {item.sequences.length > 3 && (
                            <div style={{ fontSize: "12px", color: "#888" }}>
                              +{item.sequences.length - 3} more...
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <div
                style={{ textAlign: "center", padding: "20px", color: "#999" }}
              >
                No geographic data available
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default GeographicDistribution;
