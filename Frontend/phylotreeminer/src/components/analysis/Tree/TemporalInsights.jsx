import React, { useEffect, useState, useMemo } from "react";
import { Card, Row, Col, Timeline, Tag, List, Statistic } from "antd";
import { Line } from "@ant-design/charts";

const TemporalInsights = ({ sequences }) => {
  const extractDates = () => {
    const dates = [];

    (sequences || []).forEach((sequence) => {
      const { collectionDate, geoLoc, isolate, id } = sequence;

      if (collectionDate) {
        const dateObj = parseDate(collectionDate);

        if (dateObj) {
          dates.push({
            date: dateObj,
            formattedDate: collectionDate, // Usando a data string já tratada
            geoLoc,
            isolate,
            id,
            year: dateObj.getFullYear(),
            month: dateObj.getMonth() + 1,
          });
        }
      }
    });

    return dates.sort((a, b) => a.date - b.date);
  };

  const parseDate = (dateString) => {
    try {
      if (dateString.includes("-")) {
        const parts = dateString.split("-");
        if (parts.length === 3) {
          return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }

      if (
        dateString.includes("Jan-") ||
        dateString.includes("Feb-") ||
        dateString.includes("Mar-") ||
        dateString.includes("Apr-") ||
        dateString.includes("May-") ||
        dateString.includes("Jun-") ||
        dateString.includes("Jul-") ||
        dateString.includes("Aug-") ||
        dateString.includes("Sep-") ||
        dateString.includes("Oct-") ||
        dateString.includes("Nov-") ||
        dateString.includes("Dec-")
      ) {
        const [month, year] = dateString.split("-");
        const monthMap = {
          Jan: "01",
          Feb: "02",
          Mar: "03",
          Apr: "04",
          May: "05",
          Jun: "06",
          Jul: "07",
          Aug: "08",
          Sep: "09",
          Oct: "10",
          Nov: "11",
          Dec: "12",
        };
        return new Date(`${year}-${monthMap[month]}-01`);
      }

      return new Date(dateString);
    } catch (error) {
      console.warn("Unable to parse data:", dateString);
      return null;
    }
  };

  const dates = extractDates();

  const prepareChartData = () => {
    const yearMonthData = {};

    dates.forEach((item) => {
      const key = `${item.year}-${item.month.toString().padStart(2, "0")}`;
      if (!yearMonthData[key]) {
        yearMonthData[key] = 0;
      }
      yearMonthData[key]++;
    });

    return Object.entries(yearMonthData)
      .map(([date, count]) => ({
        date,
        count,
        year: parseInt(date.split("-")[0]),
        month: parseInt(date.split("-")[1]),
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
  };

  const chartData = prepareChartData();

  const config = {
    data: chartData,
    xField: "date",
    yField: "count",
    xAxis: {
      title: {
        text: "Date",
      },
    },
    yAxis: {
      title: {
        text: "Number of Sequences",
      },
    },
    point: {
      size: 4,
      shape: "diamond",
    },
    label: {
      style: {
        fill: "#aaa",
      },
    },
    smooth: true,
    height: 200,
  };

  const totalSequences = dates.length;
  const dateRange =
    totalSequences > 0
      ? `${dates[0].formattedDate} - ${dates[dates.length - 1].formattedDate}`
      : "N/A";

  const countries = [...new Set(dates.map((d) => d.geoLoc))].filter(Boolean);

  return (
    <Card title="Time Series Analysis">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card size="small" style={{minHeight:'270px'}}>
            <Statistic title="Total Sequences" value={totalSequences} />
            <Statistic
              title="Period "
              value={dateRange}
              style={{ marginTop: 16 }}
            />
            <Statistic
              title="Countries"
              value={countries.length}
              style={{ marginTop: 16 }}
            />
          </Card>

          {/* <Card title="Timeline" size="small" style={{ marginTop: 16 }}>
            <Timeline
              items={dates.slice(-100).map((item, index) => ({
                children: (
                  <div>
                    <strong>
                      {" "}
                      {item.year}
                    </strong>
                    <div>{item.isolate ? `Isolate: ${item.isolate}` : ""}</div>
                    <Tag color="blue" size="small">
                      {item.geoLoc}
                    </Tag>
                  </div>
                ),
              }))}
              style={{ height: "400px", overflow: "auto", paddingTop: 16 }}
            />
          </Card> */}
        </Col>

        <Col xs={24} lg={16}>
          <Card title="Time Distribution" size="small">
            <Line {...config} height={200} />
          </Card>

          {/* <Card
            title="Sequences by Year"
            size="small"
            style={{ marginTop: 16 }}
          >
            <List
              size="small"
              style={{maxHeight:'400px', overflow:'auto'}}
              dataSource={Array.from(new Set(dates.map((d) => d.year))).sort()}
              renderItem={(year) => {
                const yearCount = dates.filter((d) => d.year === year).length;
                return (
                  <List.Item>
                    <span>{year}</span>
                    <Tag>{yearCount} sequence(s)</Tag>
                  </List.Item>
                );
              }}
            />
          </Card> */}
        </Col>
      </Row>
    </Card>
  );
};

export default TemporalInsights;
