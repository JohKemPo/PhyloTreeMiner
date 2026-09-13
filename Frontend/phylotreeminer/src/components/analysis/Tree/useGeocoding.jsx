import React, { useState, useEffect, useCallback } from 'react';

const COUNTRY_DICTIONARY = {
  "Colombia": [4.5709, -74.2973], "Uganda": [1.3733, 32.2903], "New Zealand": [-40.9006, 174.886],
  "Brazil": [-14.235, -51.9253], "USA": [37.0902, -95.7129], "Thailand": [15.87, 100.9925],
  "Philippines": [12.8797, 121.774], "Malaysia": [4.2105, 101.9758], "Indonesia": [-0.7893, 113.9213],
  "Vietnam": [14.0583, 108.2772], "China": [35.8617, 104.1954], "India": [20.5937, 78.9629],
  "Mexico": [23.6345, -102.5528], "Peru": [-9.19, -75.0152], "Venezuela": [6.4238, -66.5897],
  "French Polynesia": [-17.6797, -149.4068], "Gabon": [-0.8037, 11.6094], "Cote d'Ivoire": [7.54, -5.5471],
  "Senegal": [14.4974, -14.4524], "Canada": [56.1304, -106.3468], "Cambodia": [12.5657, 104.991],
  "Central African Republic": [6.6111, 20.9394], "Micronesia, Federated States of": [7.4256, 150.5508],
  
  "United Kingdom": [55.3781, -3.436],
  "Bangladesh": [23.685, 90.3563],
  "Somalia": [5.1521, 46.1996],
  "Japan": [36.2048, 138.2529],
  "Germany": [51.1657, 10.4515],
  "Ethiopia": [9.145, 40.4897],
  "Sudan": [12.8628, 30.2176],
  "Botswana": [-22.3285, 24.6849],
  "South Africa": [-30.5595, 22.9375],
  "Sumatra": [-0.5897, 101.3431],
  "Afghanistan": [33.9391, 67.71],
  "Nepal": [28.3949, 84.124],
  "Congo": [-4.0383, 21.7587],
  "Tanzania": [-6.369, 34.8888],
  "China Horn": [35.8617, 104.1954],
  "Korea": [35.9078, 127.7669],
  "Dahomey": [9.3077, 2.3158],
  "Kazakhstan: Oblast": [48.0196, 66.9237],
  "Guinea": [9.9456, -9.6966],
  "Sierra Leone": [8.4606, -11.7799],
  "Niger": [17.6078, 8.0817],
  "Kuwait": [29.3117, 47.4818],
  "Iran": [32.4279, 53.688],
  "Yugoslavia": [44.0165, 21.0059],
  "Syria": [34.8021, 38.9968],
  "Pakistan": [30.3753, 69.3451]
};

const useGeocoding = () => {
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);

  const getCoordinates = useCallback(async (country) => {
    if (cache[country]) return cache[country];

    if (COUNTRY_DICTIONARY[country]) {
      const coords = COUNTRY_DICTIONARY[country];
      setCache(prev => ({ ...prev, [country]: coords }));
      return coords;
    }

    setLoading(true);
    try {
      const coords = await getCoordinatesForCountryWithFallback(country);
      if (coords) {
         setCache(prev => ({ ...prev, [country]: coords }));
      }
      return coords;
    } finally {
      setLoading(false);
    }
  }, [cache]);

  return { getCoordinates, loading, cache };
};

const isValidCoordinates = (coords) => {
  return Array.isArray(coords) && coords.length === 2 && 
         coords[0] !== null && coords[1] !== null &&
         !isNaN(coords[0]) && !isNaN(coords[1]) &&
         (coords[0] !== 0 || coords[1] !== 0); 
};

const GeographicDistribution = ({ treeData }) => {
  const { getCoordinates, loading } = useGeocoding();
  const [coordinatesCache, setCoordinatesCache] = useState({});
  const [geoData, setGeoData] = useState({});

  const getCoordinatesForCountry = useCallback(async (country) => {
    if (!country) return [0, 0];
    
    if (coordinatesCache[country] && isValidCoordinates(coordinatesCache[country])) {
      return coordinatesCache[country];
    }

    const coords = await getCoordinates(country);
    const validCoords = isValidCoordinates(coords) ? coords : [0, 0];
    setCoordinatesCache(prev => ({ ...prev, [country]: validCoords }));
    return validCoords;
  }, [getCoordinates, coordinatesCache]);

  const extractAllSequences = useCallback(() => {
    return [];
  }, [treeData]);

  const processGeoData = useCallback(async (allSequences) => {
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
              const coordinates = await getCoordinatesForCountry(geoLoc);
              
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

    return countries;
  }, [getCoordinatesForCountry]);

  useEffect(() => {
    const loadGeoData = async () => {
      const allSequences = extractAllSequences();
      const processedGeoData = await processGeoData(allSequences);
      setGeoData(processedGeoData);
    };

    loadGeoData();
  }, [treeData, processGeoData, extractAllSequences]);

  const renderMapPoints = () => {
    return Object.entries(geoData).map(([country, data]) => {
      if (!data.coordinates || !isValidCoordinates(data.coordinates)) {
        console.warn(`Coordenadas inválidas para ${country}:`, data.coordinates);
        return null;
      }

      const [lat, lng] = data?.coordinates;
      
      return (
        <div key={country} style={{ position: 'absolute', left: lng, top: lat }}>
          {country} ({data.count})
        </div>
      );
    }).filter(Boolean); 
  };

  return (
    <div style={{ position: 'relative', height: '500px' }}>
      {loading && (
        <div style={{ 
          position: 'absolute', 
          top: 10, 
          right: 10, 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '5px 10px', 
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          Carregando coordenadas...
        </div>
      )}
      
      <div style={{ width: '100%', height: '100%', background: '#f0f0f0' }}>
        {renderMapPoints()}
      </div>
    </div>
  );
};

const getCoordinatesForCountryWithFallback = async (country) => {
  if (!country) return null;

  if (COUNTRY_DICTIONARY[country]) {
    return COUNTRY_DICTIONARY[country];
  }

  try {
    // Fora do escopo de F-8/services/http.js de propósito: este endpoint é o
    // Nominatim (OpenStreetMap), terceiro — não o nosso backend. `httpGet`
    // anexaria `X-User-ID` a uma chamada de terceiro, vazando identificador
    // interno para fora (o oposto do que a governança pede). Também é onde
    // F-9 já aponta o problema de fundo: geocoding deveria sair do cliente
    // e ir para o backend, com cache e rate-limit — não apenas trocar de
    // wrapper de fetch.
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(country)}&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0 && data[0]?.lat && data[0]?.lon) {
      return [parseFloat(data[0]?.lat), parseFloat(data[0]?.lon)];
    }
    
    return null;
  } catch (error) {
    console.warn(`Erro ao geocodificar ${country}:`, error);
    return null;
  }
};

const useCountryCoordinates = () => {
  const [coordinatesCache, setCoordinatesCache] = useState({});
  const [loading, setLoading] = useState(false);

  const getCoordinatesForCountry = useCallback(async (country) => {
    if (!country) return null;
    
    if (coordinatesCache[country] && isValidCoordinates(coordinatesCache[country])) {
      return coordinatesCache[country];
    }

    setLoading(true);
    try {
      const coords = await getCoordinatesForCountryWithFallback(country);
      const validCoords = isValidCoordinates(coords) ? coords : null;
      setCoordinatesCache(prev => ({ ...prev, [country]: validCoords }));
      return validCoords;
    } catch (error) {
      console.error('Erro ao obter coordenadas:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [coordinatesCache]);

  return { getCoordinatesForCountry, loading, coordinatesCache };
};

export default GeographicDistribution;
export { getCoordinatesForCountryWithFallback, isValidCoordinates, useCountryCoordinates };