import { Table, Alert } from 'antd';
import { useEffect, useState } from 'react';

const TableView = ({ content }) => {
  const [columns, setColumns] = useState([]);
  const [dataSource, setDataSource] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!content) return;
    try {
      const lines = content.trim().split('\n');
      if (lines.length < 1) {
        throw new Error("O arquivo está vazio.");
      }
      
      const headers = lines[0].split(/\s*,\s*|\s*\t\s*/); 
      const generatedColumns = headers.map(h => ({ title: h, dataIndex: h, key: h }));

      const generatedData = lines.slice(1).map((line, index) => {
        const values = line.split(/\s*,\s*|\s*\t\s*/);
        const row = { key: index };
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      });

      setColumns(generatedColumns);
      setDataSource(generatedData);
      setError(null);
    } catch (e) {
      setError("Could not process file as a table. Check the format..");
    }
  }, [content]);

  if (error) {
    return <Alert message="Format Error" description={error} type="error" showIcon />;
  }

  return <Table columns={columns} dataSource={dataSource} size="small" scroll={{ x: 'max-content' }} bordered />;
};

export default TableView;