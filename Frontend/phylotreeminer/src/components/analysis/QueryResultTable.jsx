import { Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import TableExporter from '../../utils/TableExporter';


const QueryResultTable = ({ results }) => {
  const [columns, setColumns] = useState([]);
  const [dataSource, setDataSource] = useState([]);

  useEffect(() => {
    if (!results || results.length === 0) {
      setColumns([]);
      setDataSource([]);
      return;
    }

    const firstItem = results[0];
    const generatedColumns = Object.keys(firstItem).map(key => ({
      title: key,
      dataIndex: key,
      key: key,
      render: (cellValue) => {
        if (typeof cellValue === 'object' && cellValue !== null) {
          if (cellValue.properties && cellValue.properties.name) {
             return <Tag>{cellValue.properties.name}</Tag>;
          }
          const jsonString = JSON.stringify(cellValue);
          return <Typography.Text copyable={{ text: jsonString }}>{jsonString.length > 75 ? jsonString.substring(0, 75) + '...' : jsonString}</Typography.Text>;
        }
        return String(cellValue);
      }
    }));

    const generatedDataSource = results.map((item, index) => ({
      ...item,
      key: index, 
    }));

    setColumns(generatedColumns);
    setDataSource(generatedDataSource);

  }, [results]);

  if (!results || results.length === 0) return null;

  return (
    <div>
      <TableExporter 
        columns={columns} 
        dataSource={dataSource} 
        filename="queryResults.csv" 
      />
      <Table 
        columns={columns} 
        dataSource={dataSource} 
        bordered
        size="small"
        scroll={{ x: 'max-content' }} 
    />
    </div>
  );
};

export default QueryResultTable;