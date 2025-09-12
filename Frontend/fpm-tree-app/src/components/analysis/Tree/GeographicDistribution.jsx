import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Card, Row, Col, Tag, List, Spin, Space } from "antd";
import { getCoordinatesForCountryWithFallback, isValidCoordinates } from "./useGeocoding";
import { MapContainer, TileLayer, Circle, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7',
  '#a29bfe', '#fd79a8', '#e17055', '#00b894', '#00cec9',
  '#0984e3', '#d63031', '#fdcb6e', '#636e72', '#b2bec3'
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

const GeographicDistribution = ({ treeData }) => {
  const [isClient, setIsClient] = useState(false);
  const [geoData, setGeoData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
    createLeafletIcon();
  }, []);

  const extractAllSequences = useCallback(() => {
    if (!treeData || treeData.length === 0) return [];

    const extractFromNode = (node) => {
      let sequences = [];

      if (node.data_terminals && Array.isArray(node.data_terminals)) {
        sequences = [...sequences, ...node.data_terminals];
      }

      if (
        node.metadata &&
        node.metadata.children &&
        Array.isArray(node.metadata.children)
      ) {
        node.metadata.children.forEach((child) => {
          sequences = [...sequences, ...extractFromNode(child)];
        });
      }

      return sequences;
    };

    const allSequences = [];
    const treeNodes = treeData[0];
    let aux = Object.keys(treeNodes)[0];
    let data = treeNodes[aux];
    aux = Object.keys(treeNodes[aux]);
    data = data[aux[0]];

    allSequences.push(...extractFromNode(data));
    return allSequences;
  }, [treeData]);

  useEffect(() => {
    const processGeoData = async () => {
      setLoading(true);
      const allSequences = extractAllSequences();
      const countries = {};

      for (const sequence of allSequences) {
        try {
          const features = sequence.metadata?.features;
          if (features && Array.isArray(features) && features.length > 0) {
            const qualifiers = features[0]?.qualifiers;
            const geoLoc = qualifiers?.geo_loc_name?.[0];
            const collectionDate = qualifiers?.collection_date?.[0];
            const isolate = qualifiers?.isolate?.[0] || qualifiers?.strain?.[0];

            if (geoLoc) {
              if (!countries[geoLoc]) {
                const coordinates = await getCoordinatesForCountryWithFallback(geoLoc);
                
                countries[geoLoc] = {
                  count: 0,
                  sequences: [],
                  coordinates: coordinates,
                };
              }

              countries[geoLoc].count++;
              countries[geoLoc].sequences.push({
                id: sequence.metadata.id,
                isolate,
                collectionDate,
                newick: sequence.newick,
              });
            }
          }
        } catch (error) {
          console.warn("Erro ao processar sequência:", sequence, error);
        }
      }

      setGeoData(countries);
      setLoading(false);
    };

    if (treeData) {
      processGeoData();
    }
  }, [treeData, extractAllSequences]);

  const countryData = useMemo(() => {
    const data = Object.entries(geoData)
      .map(([country, data]) => ({
        country,
        count: data.count,
        coordinates: data.coordinates,
        sequences: data.sequences,
        color: getCountryColor(country)
      }))
      .filter(item => isValidCoordinates(item.coordinates));

    const maxCount = data.length > 0 ? Math.max(...data.map(item => item.count)) : 0;

    return data.map(item => ({
      ...item,
      radius: calculateRadius(item.count, maxCount)
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
        Carregando mapa...
      </div>
    );
  }

  if (loading) {
    return (
      <Card
        title="Distribuição Geográfica das Sequências"
        style={{ marginBottom: 24 }}
      >
        <div style={{ 
          height: "400px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center" 
        }}>
          <Spin size="large" tip="Carregando dados geográficos..." />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Distribuição Geográfica das Sequências"
      style={{ marginBottom: 24 }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <div
            style={{ height: "400px", borderRadius: "8px", overflow: "hidden" }}
          >
            <MapContainer
              center={[20, 0]}
              zoom={2}
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
                    color: '#333',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.6,
                  }}
                >
                  <Tooltip permanent={false} direction="center" opacity={0.9}>
                    <div style={{ 
                      textAlign: 'center', 
                      fontWeight: 'bold',
                      fontSize: '14px',
                      color: '#333'
                    }}>
                      <Space direction="vertical">
                        <span>{country.country}</span>
                        <p>{country.count} Sequences</p>
                      </Space>
                    </div>
                  </Tooltip>
                  
                  <Popup>
                    <div style={{ minWidth: '200px' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: country.color }}>
                        {country.country}
                      </h4>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        marginBottom: '12px',
                        padding: '8px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px'
                      }}>
                        <Tag color="blue" style={{ margin: 0 }}>
                          {country.count} sequência(s)
                        </Tag>
                      </div>
                      
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        <h5 style={{ margin: '8px 0' }}>Sequências:</h5>
                        {country.sequences.map((seq, idx) => (
                          <div
                            key={idx}
                            style={{ 
                              marginBottom: '8px', 
                              padding: '6px',
                              borderLeft: `3px solid ${country.color}`,
                              backgroundColor: '#f8f9fa'
                            }}
                          >
                            <div>
                              <strong>{seq.isolate || "N/A"}</strong>
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              ID: {seq.id}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              Data: {seq.collectionDate || "N/A"}
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
          <Card title="Resumo por País" size="small">
            {countryData.length > 0 ? (
              <List
                style={{ height: "400px", overflow: "auto" }}
                dataSource={countryData.sort((a, b) => b.count - a.count)}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: item.color,
                              marginRight: '8px'
                            }}
                          />
                          {item.country}
                        </div>
                      }
                      description={
                        <div>
                          <Tag color="blue">{item.count} sequência(s)</Tag>
                          {item.sequences.slice(0, 3).map((seq, idx) => (
                            <div
                              key={idx}
                              style={{ fontSize: "12px", marginTop: "4px" }}
                            >
                              {seq.isolate || seq.id}
                            </div>
                          ))}
                          {item.sequences.length > 3 && (
                            <div style={{ fontSize: "12px", color: "#888" }}>
                              +{item.sequences.length - 3} mais...
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
                Nenhum dado geográfico disponível
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default GeographicDistribution;