import React, { useState, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Timeline,
  Tag,
  List,
  Statistic,
  Table,
  Select,
  DatePicker,
  Typography,
  Divider,
  Space,
  Progress,
  Alert,
  Tooltip,
  InputNumber,
} from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { InfoCircleOutlined } from "@ant-design/icons";
import TableExporter from "../../../utils/TableExporter";

const { Title, Text } = Typography;
const { Option } = Select;

const OWIDAnalysisDashboard = ({ analysisData }) => {
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [sequencePagination, setSequencePagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [filterType, setFilterType] = useState("total_sequences");
  const [minValue, setMinValue] = useState(0);
  const [countryPagination, setCountryPagination] = useState({
    current: 1,
    pageSize: 5,
  });

  const DataExplanationAlerts = () => (
    <>
      <Alert
        message="Data Understanding"
        description={
          <div>
            <p>
              <strong>DALYs (Disability-Adjusted Life Years)</strong> measure
              overall disease burden, expressed as the number of years lost due
              to ill-health, disability, or early death.
            </p>
            <p>
              <strong>Phylogenetic Support</strong> indicates confidence in
              evolutionary relationships - higher support values (0.8+) suggest
              more reliable transmission patterns.
            </p>
            <p>
              <strong>Support-Epidemiology Correlation</strong> shows how
              genetic diversity patterns relate to epidemiological metrics like
              case counts.
            </p>
            <p>
              Data obtained by cross-referencing with{" "}
              <a
                href="https://ourworldindata.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                Our World in Data
              </a>{" "}
              - a scientific online publication focusing on large global
              problems.
            </p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
    </>
  );

  const formatSupport = (support) => {
    if (!support && support !== 0) return "N/A";
    return `${(support * 100).toFixed(1)}%`;
  };

  const getSupportColor = (support) => {
    if (support >= 0.8) return "green";
    if (support >= 0.6) return "blue";
    if (support >= 0.4) return "orange";
    return "red";
  };

  const getSupportLevel = (support) => {
    if (support >= 0.8) return "High Confidence";
    if (support >= 0.6) return "Moderate Confidence";
    if (support >= 0.4) return "Low Confidence";
    return "Very Low Confidence";
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return "N/A";
    if (num < 1000) return num.toFixed(2);
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
    if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
    return `${(num / 1000000000).toFixed(1)}B`;
  };

  const formatSmallNumber = (num) => {
    if (!num && num !== 0) return "N/A";
    if (num < 0.001) return num.toExponential(2);
    if (num < 1) return num.toFixed(4);
    return num.toFixed(2);
  };

  const aggregatedData = useMemo(() => {
    const countryData = {};
    const yearData = {};
    const sequenceData = [];
    const supportInsights = [];

    Object.values(analysisData.sequence_analysis).forEach((sequence) => {
      const { country, year } = sequence.sequence_info;
      const owidData = sequence.owid_data;
      const supportAnalysis = sequence.support_analysis || {};
      const avgSupport = supportAnalysis.average_support || 0;

      // Aggregate by country
      if (!countryData[country]) {
        countryData[country] = {
          country,
          totalCases: 0,
          totalDeaths: 0,
          totalDALYs: 0,
          totalPrevalence: 0,
          sequenceCount: 0,
          totalSupport: 0,
          supportInsights: [],
        };
      }

      // Aggregate by year
      if (!yearData[year]) {
        yearData[year] = {
          year,
          totalCases: 0,
          totalDeaths: 0,
          totalDALYs: 0,
          totalPrevalence: 0,
          sequenceCount: 0,
          totalSupport: 0,
          countries: new Set(),
        };
      }

      Object.values(owidData).forEach((dataset) => {
        if (dataset.data && dataset.data[0]) {
          const data = dataset.data[0];

          // Cases (prevalence)
          if (
            data.number_of_new_cases_of_zika_virus__in_both_sexes_aged_all_ages
          ) {
            const cases =
              data.number_of_new_cases_of_zika_virus__in_both_sexes_aged_all_ages;
            countryData[country].totalCases += cases;
            yearData[year].totalCases += cases;

            // Store support-epi insights
            if (cases > 0 && avgSupport > 0) {
              supportInsights.push({
                country,
                year,
                cases,
                support: avgSupport,
                correlation:
                  avgSupport > 0.7 && cases > 1000
                    ? "positive"
                    : avgSupport < 0.4 && cases > 1000
                      ? "negative"
                      : "neutral",
              });
            }
          }

          // Deaths
          if (
            data.deaths_that_are_from_zika_virus__in_both_sexes_aged_all_ages
          ) {
            countryData[country].totalDeaths +=
              data.deaths_that_are_from_zika_virus__in_both_sexes_aged_all_ages;
            yearData[year].totalDeaths +=
              data.deaths_that_are_from_zika_virus__in_both_sexes_aged_all_ages;
          }

          // DALYs
          if (
            data.dalys_that_are_from_zika_virus__in_both_sexes_aged_all_ages
          ) {
            countryData[country].totalDALYs +=
              data.dalys_that_are_from_zika_virus__in_both_sexes_aged_all_ages;
            yearData[year].totalDALYs +=
              data.dalys_that_are_from_zika_virus__in_both_sexes_aged_all_ages;
          }

          // Current prevalence
          if (
            data.current_number_of_cases_of_zika_virus__in_both_sexes_aged_all_ages
          ) {
            countryData[country].totalPrevalence +=
              data.current_number_of_cases_of_zika_virus__in_both_sexes_aged_all_ages;
            yearData[year].totalPrevalence +=
              data.current_number_of_cases_of_zika_virus__in_both_sexes_aged_all_ages;
          }
        }
      });

      countryData[country].sequenceCount++;
      countryData[country].totalSupport += avgSupport;

      yearData[year].sequenceCount++;
      yearData[year].totalSupport += avgSupport;
      yearData[year].countries.add(country);

      sequenceData.push({
        id: sequence.sequence_info.id,
        country,
        year,
        description: sequence.sequence_info.description,
        support: avgSupport,
        supportLevel: getSupportLevel(avgSupport),
        supportColor: getSupportColor(avgSupport),
        epidemiologicalInsights:
          sequence.context_analysis?.epidemiological_insights || [],
        cases:
          owidData.gbd_prevalence_zika_virus__both_sexes__all_ages?.data[0]
            ?.number_of_new_cases_of_zika_virus__in_both_sexes_aged_all_ages ||
          0,
        currentCases:
          owidData.gbd_prevalence_zika_virus__both_sexes__all_ages?.data[0]
            ?.current_number_of_cases_of_zika_virus__in_both_sexes_aged_all_ages ||
          0,
        deaths:
          owidData.gbd_cause_zika_virus__both_sexes__all_ages?.data[0]
            ?.deaths_that_are_from_zika_virus__in_both_sexes_aged_all_ages || 0,
        dalys:
          owidData.gbd_cause_zika_virus__both_sexes__all_ages?.data[0]
            ?.dalys_that_are_from_zika_virus__in_both_sexes_aged_all_ages || 0,
        deathRate:
          owidData.gbd_cause_zika_virus__both_sexes__all_ages?.data[0]
            ?.deaths_that_are_from_zika_virus_per_100_000_people__in_both_sexes_aged_all_ages ||
          0,
        dalysRate:
          owidData.gbd_cause_zika_virus__both_sexes__all_ages?.data[0]
            ?.dalys_from_zika_virus_per_100_000_people_in__both_sexes_aged_all_ages ||
          0,
      });
    });

    Object.keys(countryData).forEach((country) => {
      countryData[country].averageSupport =
        countryData[country].totalSupport / countryData[country].sequenceCount;
    });

    Object.keys(yearData).forEach((year) => {
      yearData[year].averageSupport =
        yearData[year].totalSupport / yearData[year].sequenceCount;
    });

    return {
      countries: Object.values(countryData),
      years: Object.values(yearData)
        .sort((a, b) => a.year - b.year)
        .map((year) => ({
          ...year,
          countryCount: year.countries.size,
        })),
      sequences: sequenceData,
      supportInsights,
      supportEpiCorrelation:
        analysisData.support_epidemiology_correlation || {},
    };
  }, [analysisData]);

  const filteredAndSortedCountries = useMemo(() => {
    // console.log(`Aggregate data: ${JSON.stringify(aggregatedData, null, 2)}`);

    return Object.entries(aggregatedData.supportEpiCorrelation.country_analysis)
      .filter(([_, data]) => data.total_sequences > 0)
      .filter(([_, data]) => data[filterType] >= minValue)
      .sort(([, a], [, b]) => b[filterType] - a[filterType]);
  }, [aggregatedData, filterType, minValue]);

  const filteredData = useMemo(() => {
    let filtered = aggregatedData.sequences;

    if (selectedCountry !== "All") {
      filtered = filtered.filter((item) => item.country === selectedCountry);
    }

    if (selectedYear !== "All") {
      filtered = filtered.filter(
        (item) => item.year === parseInt(selectedYear),
      );
    }

    return filtered;
  }, [aggregatedData, selectedCountry, selectedYear]);

  const chartData = useMemo(
    () => ({
      casesByCountry: aggregatedData.countries
        .sort((a, b) => b.totalCases - a.totalCases)
        .slice(0, 10),

      timeline: aggregatedData.years.map((year) => ({
        year: year.year,
        cases: year.totalCases,
        deaths: year.totalDeaths,
        dalys: year.totalDALYs,
        sequences: year.sequenceCount,
        countries: year.countryCount,
      })),

      filteredTimeline: filteredData
        .reduce((acc, item) => {
          const existing = acc.find((d) => d.year === item.year);
          if (existing) {
            existing.cases += item.cases;
            existing.deaths += item.deaths;
            existing.dalys += item.dalys;
            existing.sequences++;
          } else {
            acc.push({
              year: item.year,
              cases: item.cases,
              deaths: item.deaths,
              dalys: item.dalys,
              sequences: 1,
            });
          }
          return acc;
        }, [])
        .sort((a, b) => a.year - b.year),
    }),
    [aggregatedData, filteredData],
  );

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  const sequenceColumns = [
    // {
    //   title: "Sequence ID",
    //   dataIndex: "id",
    //   key: "id",
    //   sorter: (a, b) => a.id.localeCompare(b.id),
    //   fixed: "left",
    //   width: 150,
    // },
    // {
    //   title: (
    //     <Tooltip title="Phylogenetic support value from FPMax analysis">
    //       Support <InfoCircleOutlined />
    //     </Tooltip>
    //   ),
    //   dataIndex: "support",
    //   key: "support",
    //   sorter: (a, b) => a.support - b.support,
    //   render: (support, record) => (
    //     <Tag color={record.supportColor}>{formatSupport(support)}</Tag>
    //   ),
    //   width: 100,
    // },
    {
      title: "Country",
      dataIndex: "country",
      key: "country",
      sorter: (a, b) => a.country.localeCompare(b.country),
      filters: [...new Set(aggregatedData.sequences.map((s) => s.country))].map(
        (country) => ({
          text: country,
          value: country,
        }),
      ),
      onFilter: (value, record) => record.country === value,
      width: 120,
    },
    {
      title: "Year",
      dataIndex: "year",
      key: "year",
      sorter: (a, b) => a.year - b.year,
      filters: [...new Set(aggregatedData.sequences.map((s) => s.year))]
        .sort()
        .map((year) => ({
          text: year.toString(),
          value: year,
        })),
      onFilter: (value, record) => record.year === value,
      width: 80,
    },
    {
      title: (
        <Tooltip title="Number of new cases reported">
          New Cases <InfoCircleOutlined />
        </Tooltip>
      ),
      dataIndex: "cases",
      key: "cases",
      sorter: (a, b) => a.cases - b.cases,
      render: (value) => formatNumber(value),
      width: 100,
    },
    {
      title: (
        <Tooltip title="Current active cases">
          Current Cases <InfoCircleOutlined />
        </Tooltip>
      ),
      dataIndex: "currentCases",
      key: "currentCases",
      sorter: (a, b) => a.currentCases - b.currentCases,
      render: (value) => formatNumber(value),
      width: 100,
    },
    {
      title: (
        <Tooltip title="Number of deaths attributed">
          Deaths <InfoCircleOutlined />
        </Tooltip>
      ),
      dataIndex: "deaths",
      key: "deaths",
      sorter: (a, b) => a.deaths - b.deaths,
      render: (value) => formatSmallNumber(value),
      width: 90,
    },
    {
      title: (
        <Tooltip title="Disability-Adjusted Life Years - measure of overall disease burden">
          DALYs <InfoCircleOutlined />
        </Tooltip>
      ),
      dataIndex: "dalys",
      key: "dalys",
      sorter: (a, b) => a.dalys - b.dalys,
      render: (value) => formatSmallNumber(value),
      width: 90,
    },
    {
      title: (
        <Tooltip title="Death rate per 100,000 people">
          Death Rate <InfoCircleOutlined />
        </Tooltip>
      ),
      dataIndex: "deathRate",
      key: "deathRate",
      sorter: (a, b) => a.deathRate - b.deathRate,
      render: (value) =>
        value < 0.001 ? value.toExponential(2) : value.toFixed(4),
      width: 100,
    },
  ];

  const countryColumns = [
    {
      title: "Country",
      dataIndex: "country",
      key: "country",
      sorter: (a, b) => a.country.localeCompare(b.country),
      filters: aggregatedData.countries.map((country) => ({
        text: country.country,
        value: country.country,
      })),
      onFilter: (value, record) => record.country === value,
    },
    {
      title: "Sequences",
      dataIndex: "sequenceCount",
      key: "sequenceCount",
      sorter: (a, b) => a.sequenceCount - b.sequenceCount,
    },
    {
      title: (
        <Tooltip title="Average phylogenetic support for sequences from this country">
          Avg Support <InfoCircleOutlined />
        </Tooltip>
      ),
      dataIndex: "averageSupport",
      key: "averageSupport",
      sorter: (a, b) => a.averageSupport - b.averageSupport,
      render: (support) => (
        <Tag color={getSupportColor(support)}>{formatSupport(support)}</Tag>
      ),
    },
    {
      title: "New Cases",
      dataIndex: "totalCases",
      key: "totalCases",
      sorter: (a, b) => a.totalCases - b.totalCases,
      render: (value) => formatNumber(value),
    },
    {
      title: "New Cases",
      dataIndex: "totalCases",
      key: "totalCases",
      sorter: (a, b) => a.totalCases - b.totalCases,
      render: (value) => formatNumber(value),
    },
    {
      title: "Current Cases",
      dataIndex: "totalPrevalence",
      key: "totalPrevalence",
      sorter: (a, b) => a.totalPrevalence - b.totalPrevalence,
      render: (value) => formatNumber(value),
    },
    {
      title: "Deaths",
      dataIndex: "totalDeaths",
      key: "totalDeaths",
      sorter: (a, b) => a.totalDeaths - b.totalDeaths,
      render: (value) => formatSmallNumber(value),
    },
    {
      title: "DALYs",
      dataIndex: "totalDALYs",
      key: "totalDALYs",
      sorter: (a, b) => a.totalDALYs - b.totalDALYs,
      render: (value) => formatSmallNumber(value),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Title level={2}>
        {analysisData.analysis_metadata.organism_detected} Analysis by OWID (Our
        World in Data - University of Oxford)
      </Title>

      <DataExplanationAlerts />

      <Card style={{ marginBottom: 24 }}>
        <Space size="large" wrap>
          <div>
            <Text strong>Country:</Text>
            <Select
              value={selectedCountry}
              onChange={setSelectedCountry}
              style={{ width: 200, marginLeft: 8 }}
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              <Option value="All">All Countries</Option>
              {aggregatedData.countries.map((country) => (
                <Option key={country.country} value={country.country}>
                  {country.country}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong>Year:</Text>
            <Select
              value={selectedYear}
              onChange={setSelectedYear}
              style={{ width: 120, marginLeft: 8 }}
            >
              <Option value="All">All Years</Option>
              {aggregatedData.years.map((year) => (
                <Option key={year.year} value={year.year}>
                  {year.year}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <Text type="secondary">
              Showing {filteredData.length} of {aggregatedData.sequences.length}{" "}
              sequences
              {selectedCountry !== "All" && ` from ${selectedCountry}`}
              {selectedYear !== "All" && ` in ${selectedYear}`}
            </Text>
          </div>
        </Space>
      </Card>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Sequences"
              value={` ${analysisData.summary_statistics.sequences_with_owid_data} / ${analysisData.summary_statistics.total_sequences_analyzed} with data`}
            />
            <Progress
              percent={parseFloat(analysisData.summary_statistics.success_rate)}
              size="small"
              format={(percent) => `${percent}% success`}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title="Avg Phylogenetic Support"
              value={formatSupport(
                aggregatedData.sequences.reduce(
                  (sum, seq) => sum + (seq.support || 0),
                  0,
                ) / aggregatedData.sequences.length,
              )}
              suffix="confidence"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title="Countries with Data"
              value={analysisData.summary_statistics.unique_countries.length}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title="Analysis Period"
              value={`${analysisData.summary_statistics.year_range.min}`}
              suffix={`- ${analysisData.summary_statistics.year_range.max}`}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic title="Filtered Sequences" value={filteredData.length} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={32} lg={24} style={{ marginBottom: 16 }}>
          <Card size="small" title="Support Distribution by Country">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[...aggregatedData.countries].sort(
                  (a, b) => b?.averageSupport - a?.averageSupport,
                )}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="country"
                  angle={-90}
                  textAnchor="end"
                  height={120}
                />
                <YAxis domain={[0, 0.9]} />
                <RechartsTooltip formatter={(value) => formatSupport(value)} />
                <Bar
                  dataKey="averageSupport"
                  name="Average Support"
                  fill="#8884d8"
                >
                  {aggregatedData.countries.slice(0, 10).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getSupportColor(entry.averageSupport)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* {aggregatedData.supportEpiCorrelation?.country_analysis && (
        <Card
          title="Key Support-Epidemiology Insights"
          style={{ marginTop: 16, marginBottom: 16 }}
        >
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Select
                value={filterType}
                onChange={setFilterType}
                style={{ width: 180 }}
                options={[
                  { value: "total_sequences", label: "Sequences" },
                  { value: "avg_epi_value", label: "Avg. Cases" },
                  { value: "avg_support", label: "Avg. Support" },
                ]}
              />
              <InputNumber
                min={0}
                value={minValue}
                onChange={setMinValue}
                placeholder="Min"
              />
            </Space>

            <List
              style={{ height: "400px", overflow: "auto" }}
              size="small"
              dataSource={filteredAndSortedCountries}
              renderItem={([country, data]) => (
                <List.Item>
                  <Alert
                    message={
                      <Space direction="vertical">
                        <Text strong>{country}</Text>
                        <Text>
                          {data.total_sequences} sequences · Avg Support:{" "}
                          {data.avg_support.toFixed(2)} · Avg Cases:{" "}
                          {data.avg_epi_value.toFixed(0)}
                        </Text>

                        {data.avg_support > 0.7 &&
                          data.avg_epi_value > 1000 && (
                            <Text type="success">
                              High support with high incidence - suggests
                              sustained transmission
                            </Text>
                          )}

                        {data.avg_support < 0.4 &&
                          data.avg_epi_value > 1000 && (
                            <Text type="warning">
                              Low support despite high incidence - possible
                              multiple independent introductions
                            </Text>
                          )}
                      </Space>
                    }
                    type={
                      data.avg_support > 0.7
                        ? "success"
                        : data.avg_support < 0.4
                        ? "warning"
                        : "info"
                    }
                    showIcon
                    style={{ width: "100%" }}
                  />
                </List.Item>
              )}
            />
          </div>
        </Card>
      )} */}

      <Row gutter={16} style={{ marginBottom: 24, marginTop: 16 }}>
        {/* <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                Cases by Country (Top 10)
                <Text type="secondary" style={{ fontSize: "12px" }}>
                  Units: Number of cases
                </Text>
              </Space>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.casesByCountry}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="country"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tickFormatter={formatNumber} />
                <RechartsTooltip formatter={(value) => formatNumber(value)} />
                <Legend />
                <Bar dataKey="totalCases" name="Total Cases" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col> */}

        {aggregatedData.supportInsights.length != 0 && (
          <Col xs={24} lg={12}>
            <Card size="small" title="Support vs Cases Correlation">
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart data={aggregatedData.supportInsights}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="cases"
                    type="number"
                    name="Cases"
                    tickFormatter={formatNumber}
                  />
                  <YAxis
                    dataKey="support"
                    type="number"
                    name="Support"
                    // domain={[0, 0.3]}
                  />
                  <ZAxis range={[100, 100]} />
                  <RechartsTooltip
                    formatter={(value, name) => [
                      name === "support"
                        ? formatSupport(value)
                        : formatNumber(value),
                      name,
                    ]}
                  />
                  <Scatter name="Sequences" fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        )}

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                Temporal Evolution
                <Text type="secondary" style={{ fontSize: "12px" }}>
                  Units: Cases (count), Deaths (count)
                </Text>
              </Space>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis yAxisId="left" tickFormatter={formatNumber} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={formatSmallNumber}
                />
                <RechartsTooltip
                  formatter={(value, name) => [
                    name === "deaths"
                      ? formatSmallNumber(value)
                      : formatNumber(value),
                    name,
                  ]}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cases"
                  name="Cases"
                  stroke="#8884d8"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="deaths"
                  name="Deaths"
                  stroke="#ff4d4f"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="sequences"
                  name="Sequences"
                  stroke="#52c41a"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title="Countries with Highest Impact"
            extra={
              <Text type="secondary" style={{ fontSize: "12px" }}>
                Showing {aggregatedData.countries.length} countries
              </Text>
            }
          >
            <Table
              size="small"
              columns={countryColumns}
              dataSource={aggregatedData.countries.map((item, index) => ({
                ...item,
                key: index,
              }))}
              pagination={{
                current: countryPagination.current,
                pageSize: countryPagination.pageSize,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} countries`,
                pageSizeOptions: ["5", "10", "20", "50"],
                onShowSizeChange: (current, size) => {
                  setCountryPagination({
                    current: 1,
                    pageSize: size,
                  });
                },
                onChange: (page, pageSize) => {
                  setCountryPagination({
                    current: page,
                    pageSize: pageSize,
                  });
                },
              }}
              scroll={{ x: 800 }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Filtered Data Timeline">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.filteredTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <RechartsTooltip formatter={(value) => formatNumber(value)} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sequences" name="Sequences" fill="#52c41a" />
                <Bar dataKey="cases" name="Cases" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row> */}

      <Card
        title={`Analyzed Sequences (${filteredData.length})`}
        extra={
          <Text type="secondary" style={{ fontSize: "12px" }}>
            Units: Cases (count), Deaths (count), DALYs (count), Rates (per
            100,000)
          </Text>
        }
      >
        <TableExporter
          columns={sequenceColumns}
          dataSource={filteredData}
          filename="OWIDdata.csv"
        />
        <Table
          columns={sequenceColumns}
          dataSource={filteredData.map((item, index) => ({
            ...item,
            key: index,
          }))}
          pagination={{
            current: sequencePagination.current,
            pageSize: sequencePagination.pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} sequences`,
            pageSizeOptions: ["10", "20", "50", "100"],
            onShowSizeChange: (current, size) => {
              setSequencePagination({
                current: 1,
                pageSize: size,
              });
            },
            onChange: (page, pageSize) => {
              setSequencePagination({
                current: page,
                pageSize: pageSize,
              });
            },
          }}
          scroll={{ x: 1000 }}
          size="middle"
        />
      </Card>

      {/* <Card
        title="Sample Collection Timeline (top 10)"
        style={{ marginTop: 24 }}
      >
        <Alert
          message="Timeline Explanation"
          description="This timeline shows the distribution of sample collections over time. Each point represents a year with available genetic sequence data, showing the number of sequences collected and countries involved in that period."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Timeline>
          {aggregatedData.years
            .slice(-10)
            .reverse()
            .map((year) => (
              <Timeline.Item
                key={year.year}
                color={
                  year.sequenceCount > 50
                    ? "green"
                    : year.sequenceCount > 10
                    ? "orange"
                    : "red"
                }
              >
                <Text strong>{year.year}</Text>
                <br />
                <Text type="secondary">
                  {year.sequenceCount} sequences from {year.countryCount}{" "}
                  countries
                  {year.totalCases > 0 &&
                    `, ${formatNumber(year.totalCases)} cases`}
                </Text>
              </Timeline.Item>
            ))}
        </Timeline>
      </Card> */}

      <Card style={{ marginTop: 24, backgroundColor: "#f0f8ff" }}>
        <Alert
          message="Data Source Attribution"
          description={
            <div>
              <p>
                <strong>Our World in Data (OWID)</strong> - A scientific online
                publication that focuses on large global problems such as
                poverty, disease, hunger, climate change, war, existential
                risks, and inequality. The data presented here combines genetic
                sequence information with OWID's comprehensive global health
                datasets to provide epidemiological context.
              </p>
              <p>
                <strong>Global Burden of Disease (GBD)</strong> - Provides a
                comprehensive picture of what disables and kills people across
                countries, time, age, and sex.
              </p>
            </div>
          }
          type="info"
          showIcon
        />
      </Card>
    </div>
  );
};

export default OWIDAnalysisDashboard;
