import React from 'react';
import { Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

interface TableExporterProps {
  columns: any[];
  dataSource: any[];
  filename?: string;
  buttonText?: string;
}

const TableExporter: React.FC<TableExporterProps> = ({ 
  columns, 
  dataSource, 
  filename = 'export.csv',
  buttonText = 'Export CSV'
}) => {

  const extractText = (node: any): string => {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    
    if (React.isValidElement(node)) {
      const children = (node.props as any)?.children;
      return children !== undefined ? extractText(children) : '';
    }
    
    if (Array.isArray(node)) {
      return node.map(extractText).join(' ');
    }

    return String(node);
  };

  const convertToCSV = () => {
    const validCols = columns.filter(col => col.dataIndex || col.key);
    
    const header = validCols.map(col => `"${col.title || col.key}"`).join(',');

    const rows = dataSource.map(record => {
      return validCols.map(col => {
        let value = record[col.dataIndex];


        if (col.render) {
          value = extractText(col.render(value, record));
        }


        const cellContent = String(value ?? '').replace(/"/g, '""');
        return `"${cellContent}"`;
      }).join(',');
    });

    return [header, ...rows].join('\n');
  };

  const handleDownload = () => {
    const csvContent = convertToCSV();
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button 
      icon={<DownloadOutlined />} 
      onClick={handleDownload}
      style={{ marginBottom: 16 }}
    >
      {buttonText}
    </Button>
  );
};

export default TableExporter;