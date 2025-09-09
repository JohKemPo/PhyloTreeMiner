import React from 'react';
import { Typography, Card, Divider, Tag, Space } from 'antd';
import { CodeOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const PhylogeneticQueriesDocumentation = () => {
  return (
    <div style={{ padding: '32px', maxWidth: '100vw', margin: '0 auto', height: '80vh', overflow: 'auto' }}>
      <Title level={1} style={{ color: '#1890ff', borderBottom: '2px solid #1890ff', paddingBottom: '10px' }}>
        <CodeOutlined /> Cypher Queries Documentation for Phylogenetic Tree
      </Title>

      <Paragraph>
        This document presents an organized collection of Cypher queries for
        working with phylogenetic data in Neo4j, including practical examples
        and detailed explanations.
      </Paragraph>

      <Title level={2} style={{ color: '#1890ff', marginTop: '24px' }}>
        Data Upload Explained
      </Title>

      <Title level={3}>1. Main Node Creation</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <pre><code>{`CREATE (t:Tree {name: 'tree_dataset_final_clustalo_upgma_parsimony'});`}</code></pre>
      </Card>
      <Paragraph>This query creates the root of the tree.</Paragraph>

      <Title level={3}>2. Subtree Creation and Relationships</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <pre><code>{`MATCH (parent:Tree {name: '...'})
CREATE (child:Subtree {name: '...'})
CREATE (parent)-[:HAS_SUBTREE]->(child);`}</code></pre>
      </Card>
      <Paragraph>This query links the main tree to subtrees.</Paragraph>

      <Title level={3}>3. Statistical Support Insertion</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <pre><code>{`MATCH (child:Subtree {name: '...'})
MERGE (s:Support {value: 0.1})
CREATE (child)-[:HAS_SUPPORT]->(s);`}</code></pre>
      </Card>
      <Paragraph>This query defines the node's reliability.</Paragraph>

      <Title level={3}>4. Biological Metadata Insertion</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <pre><code>{`MATCH (child:Subtree {name: '...'})
MERGE (m:Metadata {value: '{...json...}'})
CREATE (child)-[:HAS_METADATA]->(m);`}</code></pre>
      </Card>
      <Paragraph>
        This query stores data about organisms, sequences, articles, etc.
      </Paragraph>

      <Divider />

      <Title level={2} style={{ color: '#1890ff', marginTop: '24px' }}>
        Query Tutorial (Cypher in Neo4j)
      </Title>

      <Title level={3}>1. View Complete Tree</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (t:Tree)-[:HAS_SUBTREE*]->(n)
RETURN t, n;`}</code></pre>
          <Tag color="blue">Return: Graph</Tag>
        </Space>
      </Card>
      <Paragraph>Shows the tree and all branches.</Paragraph>

      <Title level={3}>2. Find All Stored Viruses</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (m:Metadata)
WHERE m.value CONTAINS 'Zika virus'
RETURN m;`}</code></pre>
          <Tag color="green">Return: Tabular</Tag>
        </Space>
      </Card>
      <Paragraph>Lists metadata that mention "Zika virus".</Paragraph>

      <Title level={3}>3. Search by Collection Year</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (m:Metadata)
WHERE m.value CONTAINS '"collection_date": ["2007"]'
RETURN m;`}</code></pre>
          <Tag color="green">Return: Tabular</Tag>
        </Space>
      </Card>
      <Paragraph>
        Shows sequences collected in <Text strong>2007</Text>.
      </Paragraph>

      <Title level={3}>4. View Associated Scientific Publications</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (m:Metadata)
WHERE m.value CONTAINS '"journal"'
RETURN m.value;`}</code></pre>
          <Tag color="green">Return: Tabular</Tag>
        </Space>
      </Card>
      <Paragraph>Extracts articles related to the sequences.</Paragraph>

      <Title level={3}>5. Check Node Reliability</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (s:Support)
RETURN s.value, count(*)
ORDER BY s.value DESC;`}</code></pre>
          <Tag color="green">Return: Tabular</Tag>
        </Space>
      </Card>
      <Paragraph>Shows the most common support values.</Paragraph>

      <Title level={3}>6. Find Host Organisms</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (m:Metadata)
WHERE m.value CONTAINS '"host": ["Homo sapiens"]'
RETURN m;`}</code></pre>
          <Tag color="green">Return: Tabular</Tag>
        </Space>
      </Card>
      <Paragraph>
        Sequences that had <Text strong>humans</Text> as hosts.
      </Paragraph>

      <Title level={3}>7. Explore Taxonomy</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (m:Metadata)
WHERE m.value CONTAINS '"taxonomy":'
RETURN m;`}</code></pre>
          <Tag color="green">Return: Tabular</Tag>
        </Space>
      </Card>
      <Paragraph>Shows the biological classification of each sequence.</Paragraph>

      <Title level={3}>8. Isolates Count by Country</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (m:Metadata)
WHERE m.value CONTAINS '"geo_loc_name":'
RETURN m.value AS metadata;`}</code></pre>
          <Tag color="green">Return: Tabular</Tag>
        </Space>
      </Card>
      <Paragraph>Lists collection locations; can be refined to count by country.</Paragraph>

      <Title level={3}>9. Hierarchical Structure</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH path=(t:Tree)-[:HAS_SUBTREE*]->(n)
RETURN path;`}</code></pre>
          <Tag color="blue">Return: Graph</Tag>
        </Space>
      </Card>
      <Paragraph>
        Visualizes the <Text strong>hierarchical structure</Text> of the tree.
      </Paragraph>

      <Title level={3}>10. Sequences with Specific Proteins</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (m:Metadata)
WHERE m.value CONTAINS '"product": ["envelope glycoprotein"]'
RETURN m;`}</code></pre>
          <Tag color="green">Return: Tabular</Tag>
        </Space>
      </Card>
      <Paragraph>Searches for genes/proteins of interest.</Paragraph>

      <Title level={3}>11. View Subtree with Support</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH path=(t:Tree)-[:HAS_SUBTREE*]->(subtree)-[:HAS_SUPPORT]->(support)
WHERE support.value > 0.8
RETURN path;`}</code></pre>
          <Tag color="blue">Return: Graph</Tag>
        </Space>
      </Card>
      <Paragraph>Shows only nodes with high statistical support.</Paragraph>

      <Title level={3}>12. Connected Metadata Network</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (m1:Metadata)-[:HAS_METADATA]-(subtree1:Subtree),
      (subtree1)-[:HAS_SUBTREE*]-(subtree2:Subtree),
      (subtree2)-[:HAS_METADATA]-(m2:Metadata)
WHERE m1.value CONTAINS 'Brazil' AND m2.value CONTAINS 'Zika'
RETURN m1, subtree1, subtree2, m2;`}</code></pre>
          <Tag color="blue">Return: Graph</Tag>
        </Space>
      </Card>
      <Paragraph>Connects metadata from different related subtrees.</Paragraph>

      <Divider />

      <Title level={2} style={{ color: '#1890ff', marginTop: '24px' }}>
        Neo4j Query Tutorial - Biological Insights
      </Title>

      <Title level={3}>1. Temporal Distribution - Isolates per Year</Title>
      <Paragraph>
        We want to know <Text strong>how many viruses were collected each year</Text>.
      </Paragraph>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (m:Metadata)
WHERE m.value CONTAINS '"collection_date":'
WITH m, apoc.convert.fromJsonMap(m.value) AS meta
RETURN meta.metadata.annotations.collection_date[0] AS collection_year,
       count(*) AS total_isolates
ORDER BY collection_year;`}</code></pre>
          <Tag color="green">Return: Tabular</Tag>
        </Space>
      </Card>
      <Paragraph>
        <Text strong>Explanation</Text>:
      </Paragraph>
      <ul>
        <li>
          <Tag><code>apoc.convert.fromJsonMap(m.value)</code></Tag> → converts JSON text
          into an object for data filtering.
        </li>
        <li>
          <Tag><code>collection_date</code></Tag> → field containing the collection date.
        </li>
        <li>
          <Tag><code>count(*)</code></Tag> → counts how many records for each year.
        </li>
      </ul>
      <Paragraph>
        This allows building a <Text strong>timeline chart</Text>.
      </Paragraph>

      <Title level={3}>2. Geographic Distribution - Countries with Samples</Title>
      <Paragraph>We want to see where the viruses came from.</Paragraph>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (m:Metadata)
WHERE m.value CONTAINS '"geo_loc_name":'
WITH apoc.convert.fromJsonMap(m.value) AS meta
RETURN meta.metadata.annotations.geo_loc_name[0] AS country,
       count(*) AS total_isolates
ORDER BY total_isolates DESC;`}</code></pre>
          <Tag color="green">Return: Tabular</Tag>
        </Space>
      </Card>
      <Paragraph>
        <Text strong>Explanation</Text>:
      </Paragraph>
      <ul>
        <li>
          <Tag><code>geo_loc_name</code></Tag> → brings the country or location of the sample.
        </li>
        <li>
          We can generate a <Text strong>country ranking</Text> with the most isolates.
        </li>
      </ul>
      <Paragraph>Ideal for later mapping on a map chart.</Paragraph>

      <Title level={3}>3. Correlation Between Support and Taxonomic Diversity</Title>
      <Paragraph>
        Check if nodes with higher support contain more taxonomic diversity.
      </Paragraph>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (s:Support)<-[:HAS_SUPPORT]-(sub:Subtree)-[:HAS_METADATA]->(m:Metadata)
WITH s.value AS support,
     apoc.convert.fromJsonMap(m.value) AS meta
RETURN support,
       size(apoc.coll.toSet(meta.metadata.annotations.taxonomy)) AS taxonomic_levels
ORDER BY support DESC;`}</code></pre>
          <Tag color="green">Return: Tabular</Tag>
        </Space>
      </Card>
      <Paragraph>
        <Text strong>Explanation</Text>:
      </Paragraph>
      <ul>
        <li>
          <Tag><code>s.value</code></Tag> → statistical support value of the node.
        </li>
        <li>
          <Tag><code>taxonomy</code></Tag> → list of taxonomic levels.
        </li>
        <li>
          <Tag><code>size(apoc.coll.toSet(...))</code></Tag> → counts how many distinct
          levels exist.
        </li>
      </ul>
      <Paragraph>
        This helps to see if <Text strong>well-supported</Text> nodes really
        represent <Text strong>more diversity</Text>.
      </Paragraph>

      <Title level={3}>4. Detection of Most Cited Lineages in Scientific Articles</Title>
      <Paragraph>Which lineages appear in the most bibliographic references.</Paragraph>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (m:Metadata)
WHERE m.value CONTAINS '"references":'
WITH apoc.convert.fromJsonMap(m.value) AS meta
UNWIND meta.metadata.annotations.references AS ref
RETURN meta.metadata.annotations.source AS lineage,
       count(ref) AS total_references
ORDER BY total_references DESC
LIMIT 10;`}</code></pre>
          <Tag color="green">Return: Tabular</Tag>
        </Space>
      </Card>
      <Paragraph>
        <Text strong>Explanation</Text>:
      </Paragraph>
      <ul>
        <li>
          <Tag><code>references</code></Tag> → field with associated articles.
        </li>
        <li>
          <Tag><code>UNWIND</code></Tag> → breaks the reference list into multiple rows.
        </li>
        <li>
          <Tag><code>count(ref)</code></Tag> → counts how many times each lineage was
          cited.
        </li>
      </ul>
      <Paragraph>
        Allows detecting the <Text strong>most studied lineages</Text>.
      </Paragraph>

      <Title level={3}>5. Host Comparison (humans, mosquitoes, animals)</Title>
      <Paragraph>Discover which hosts appear and in what quantity.</Paragraph>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (m:Metadata)
WHERE m.value CONTAINS '"host":'
WITH apoc.convert.fromJsonMap(m.value) AS meta
UNWIND meta.metadata.annotations.host AS host
RETURN host, count(*) AS total_isolates
ORDER BY total_isolates DESC;`}</code></pre>
          <Tag color="green">Return: Tabular</Tag>
        </Space>
      </Card>
      <Paragraph>
        <Text strong>Explanation</Text>:
      </Paragraph>
      <ul>
        <li>
          <Tag><code>host</code></Tag> → field describing the host organism.
        </li>
        <li>
          <Tag><code>UNWIND</code></Tag> → transforms the list into rows for counting.
        </li>
      </ul>
      <Paragraph>
        This way, we see if the sequences come from{" "}
        <Text strong>humans, mosquitoes, or other animals</Text>.
      </Paragraph>

      <Title level={3}>6. fromJsonMap Treatment Example</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (m:Metadata) 
WITH apoc.convert.fromJsonMap(m.value) AS meta 
WITH meta.metadata.features AS features 
UNWIND features AS f 
WITH f.qualifiers.geo_loc_name AS geo_loc 
UNWIND geo_loc AS location 
RETURN location, count(*) AS freq 
ORDER BY freq DESC`}</code></pre>
          <Tag color="green">Return: Tabular</Tag>
        </Space>
      </Card>
      <Paragraph>
        This query demonstrates proper treatment with <Tag><code>fromJsonMap</code></Tag>{" "}
        to extract and count geographic locations from metadata.
      </Paragraph>

      <Title level={3}>7. View Clades by Geographic Region</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH path=(t:Tree)-[:HAS_SUBTREE*]->(subtree)-[:HAS_METADATA]->(m:Metadata)
WHERE m.value CONTAINS '"geo_loc_name": ["Brazil"]'
RETURN path;`}</code></pre>
          <Tag color="blue">Return: Graph</Tag>
        </Space>
      </Card>
      <Paragraph>Shows the complete structure of clades originating from Brazil.</Paragraph>

      <Divider />

      <Title level={2} style={{ color: '#1890ff', marginTop: '24px' }}>Advanced Queries</Title>
      
      <Title level={3}>Query 1 – Isolate Frequency by Country</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (m:Metadata)
WITH apoc.convert.fromJsonMap(m.value) AS meta
UNWIND meta.metadata.features AS feature
UNWIND feature.qualifiers.geo_loc_name AS location
WITH trim(split(location, ":")[0]) AS country
RETURN country, count(*) AS freq
ORDER BY freq DESC`}</code></pre>
          <Tag color="green">Return: Tabular</Tag>
        </Space>
      </Card>
      <Paragraph>
        <Text strong>Analysis:</Text>
      </Paragraph>
      <ul>
        <li>
          Parses JSON (<Tag><code>apoc.convert.fromJsonMap</code></Tag>).
        </li>
        <li>
          Accesses <Tag><code>features.qualifiers.geo_loc_name</code></Tag> → where the
          location is stored.
        </li>
        <li>
          Uses <Tag><code>split(location, ":")[0]</code></Tag> to get only the{" "}
          <Text strong>country</Text>, ignoring details like city/region.
        </li>
      </ul>
      <Paragraph>Good for country ranking.</Paragraph>
      
      <Title level={3}>Query 2 – Frequency and Average Support by Location</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (s:Support)<-[:HAS_SUPPORT]-(subtree:Subtree)-[:HAS_METADATA]->(m:Metadata)
WITH apoc.convert.fromJsonMap(m.value) AS meta, s.value AS support
UNWIND meta.metadata.features AS f
UNWIND f.qualifiers.geo_loc_name AS location
RETURN location,
       count(*) AS freq,
       round(avg(support), 2) AS avg_support
ORDER BY freq DESC`}</code></pre>
          <Tag color="green">Return: Tabular</Tag>
        </Space>
      </Card>
      <Paragraph>
        <Text strong>Analysis:</Text>
      </Paragraph>
      <ul>
        <li>
          Simplified version without redundant UNWIND on <Tag><code>support</code></Tag>.
        </li>
        <li>
          Correct in overall structure, but the original version contained an unnecessary
          UNWIND on <Tag><code>support</code></Tag>.
        </li>
      </ul>

      <Title level={3}>Query 3 – Countries with Highest Average Support</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (s:Support)<-[:HAS_SUPPORT]-(subtree:Subtree)-[:HAS_METADATA]->(m:Metadata)
WITH apoc.convert.fromJsonMap(m.value) AS meta, s.value AS support
UNWIND meta.metadata.features AS f
UNWIND f.qualifiers.geo_loc_name AS geo_loc
WITH trim(geo_loc) AS location, support
WITH trim(split(location, ":")[0]) AS country, support
WHERE country IS NOT NULL
RETURN country,
       count(*) AS freq,
       round(avg(support), 2) AS avg_support
ORDER BY avg_support DESC`}</code></pre>
          <Tag color="green">Return: Tabular</Tag>
        </Space>
      </Card>
      <Paragraph>
        <Text strong>Analysis:</Text>
      </Paragraph>
      <ul>
        <li>Correct and well structured.</li>
        <li>
          Uses <Tag><code>split(location, ":")[0]</code></Tag> → ensures only the country
          appears.
        </li>
        <li>
          Applies filter <Tag><code>WHERE country IS NOT NULL</code></Tag>.
        </li>
      </ul>
      <Paragraph>
        This query is great for analyzing{" "}
        <Text strong>average support by country</Text>.
      </Paragraph>

      <Title level={3}>Query 4 – Evolutionary Relationships Network</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH (t:Tree)-[:HAS_SUBTREE*1..3]->(parent:Subtree),
      (parent)-[:HAS_SUBTREE]->(child:Subtree),
      (parent)-[:HAS_SUPPORT]->(parentSupport:Support),
      (child)-[:HAS_SUPPORT]->(childSupport:Support),
      (parent)-[:HAS_METADATA]->(parentMeta:Metadata),
      (child)-[:HAS_METADATA]->(childMeta:Metadata)
WHERE parentSupport.value > 0.7 AND childSupport.value > 0.7
RETURN parent, child, parentSupport, childSupport, parentMeta, childMeta;`}</code></pre>
          <Tag color="blue">Return: Graph</Tag>
        </Space>
      </Card>
      <Paragraph>
        Shows evolutionary relationships between well-supported nodes with their metadata.
      </Paragraph>

      <Title level={3}>Query 5 – Phylogenetic Tree with Geographic Hotspots</Title>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <pre><code>{`MATCH path=(t:Tree)-[:HAS_SUBTREE*]->(subtree)-[:HAS_METADATA]->(m:Metadata)
WHERE m.value CONTAINS '"geo_loc_name": ["Brazil"]' 
   OR m.value CONTAINS '"geo_loc_name": ["Colombia"]'
   OR m.value CONTAINS '"geo_loc_name": ["Mexico"]'
RETURN path;`}</code></pre>
          <Tag color="blue">Return: Graph</Tag>
        </Space>
      </Card>
      <Paragraph>Visualizes the tree focusing on specific Latin American countries.</Paragraph>
    </div>
  );
};

export default PhylogeneticQueriesDocumentation;