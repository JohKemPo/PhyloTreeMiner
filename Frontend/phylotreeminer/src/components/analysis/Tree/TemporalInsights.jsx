import React, { useEffect, useState, useMemo } from "react";
import { Card, Row, Col, Timeline, Tag, List, Statistic } from "antd";
import { Line } from "@ant-design/charts";

const TemporalInsights = ({ sequences,timelineData }) => {
  const processedSequences = useMemo(() => {
    const parseDate = (dateString) => {
      if (!dateString || dateString === "Unknown Date") return null;
      try {
        // Formato DD-MM-YYYY
        if (dateString.includes("-")) {
          const parts = dateString.split("-");
          if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
        // Formato Jan-2020
        const monthMap = {
          Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
          Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
        };
        const match = dateString.match(/([a-zA-Z]{3})-(\d{4})/);
        if (match) return new Date(`${match[2]}-${monthMap[match[1]]}-01`);

        const d = new Date(dateString);
        return isNaN(d.getTime()) ? null : d;
      } catch (e) { return null; }
    };

    return sequences
      .map(seq => ({
        ...seq,
        dateObj: parseDate(seq.collectionDate || seq.year)
      }))
      .filter(item => item.dateObj !== null)
      .sort((a, b) => a.dateObj - b.dateObj);
  }, [sequences]);


  const chartData = useMemo(() => {
    if (timelineData && timelineData.length > 0) {
      return timelineData
        .filter(item => item.year !== "Unknown Date")
        .map(item => ({
          date: item.year.toString(),
          count: item.count
        }))
        .sort((a, b) => parseInt(a.date) - parseInt(b.date));
    }

    const monthlyGroups = {};
    processedSequences.forEach((item) => {
      const key = `${item.dateObj.getFullYear()}-${(item.dateObj.getMonth() + 1).toString().padStart(2, "0")}`;
      monthlyGroups[key] = (monthlyGroups[key] || 0) + 1;
    });

    return Object.entries(monthlyGroups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [timelineData, processedSequences]);

  const stats = useMemo(() => {
    const total = sequences.length;
    const countries = new Set(sequences.map(s => s.country).filter(c => c && c !== "Unknown")).size;
    let range = "N/A";

    if (processedSequences.length > 0) {
      const first = processedSequences[0].collectionDate || processedSequences[0].year;
      const last = processedSequences[processedSequences.length - 1].collectionDate || processedSequences[processedSequences.length - 1].year;
      range = `${first} - ${last}`;
    }

    return { total, countries, range };
  }, [sequences, processedSequences]);

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

  return (
    <Card title="Time Series Analysis">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card size="small" style={{ minHeight: '270px' }}>
            <Statistic title="Total Sequences" value={stats.total} />
            <Statistic title="Period" value={stats.range} style={{ marginTop: 16 }} />
            <Statistic title="Countries" value={stats.countries} style={{ marginTop: 16 }} />
          </Card>

         
        </Col>

        <Col xs={24} lg={16}>
          <Card title="Time Distribution" size="small">
            <Line {...config} height={200} />
          </Card>

        </Col>
      </Row>
    </Card>
  );
};

export default TemporalInsights;
