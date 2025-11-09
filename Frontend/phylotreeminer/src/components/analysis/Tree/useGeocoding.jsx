import React, { useState, useEffect, useCallback } from 'react';

const useGeocoding = () => {
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);

  const getCoordinates = useCallback(async (country) => {
    if (cache[country]) {
      return cache[country];
    }

    const commonCountries = {
      Colombia: [4.5709, -74.2973],
      Uganda: [1.3733, 32.2903],
      "New Zealand": [-40.9006, 174.886],
      Brazil: [-14.235, -51.9253],
      USA: [37.0902, -95.7129],
      Thailand: [15.87, 100.9925],
      Philippines: [12.8797, 121.774],
      Malaysia: [4.2105, 101.9758],
      Indonesia: [-0.7893, 113.9213],
      Vietnam: [14.0583, 108.2772],
      China: [35.8617, 104.1954],
      India: [20.5937, 78.9629],
      Mexico: [23.6345, -102.5528],
      Peru: [-9.19, -75.0152],
      Venezuela: [6.4238, -66.5897],
      "French Polynesia": [-17.6797, -149.4068],
      Gabon: [-0.8037, 11.6094],
      "Cote d'Ivoire": [7.54, -5.5471],
      Senegal: [14.4974, -14.4524],
      Canada: [56.1304, -106.3468],
      Cambodia: [12.5657, 104.991],
      "Central African Republic": [6.6111, 20.9394],
      "Micronesia, Federated States of": [7.4256, 150.5508],
    };

    if (commonCountries[country]) {
      const coords = commonCountries[country];
      setCache(prev => ({ ...prev, [country]: coords }));
      return coords;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(country)}&limit=1`
      );
      
      if (!response.ok) throw new Error('Erro na API de geocoding');

      const data = await response.json();
      
      if (data && data.length > 0 && data[0]?.lat && data[0]?.lon) {
        const coords = [parseFloat(data[0]?.lat), parseFloat(data[0]?.lon)];
        setCache(prev => ({ ...prev, [country]: coords }));
        return coords;
      }

      return [0, 0];

    } catch (error) {
      console.warn(`Erro ao geocodificar ${country}:`, error);
      return [0, 0];
    } finally {
      setLoading(false);
    }
  }, [cache]);

  return { getCoordinates, loading, cache };
};

const isValidCoordinates = (coords) => {
  return Array.isArray(coords) && coords.length === 2 && 
         coords[0] !== null && coords[1] !== null &&
         !isNaN(coords[0]) && !isNaN(coords[1]);
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
  if (!country) return [0, 0];

  const commonCountries = {
    Colombia: [4.5709, -74.2973],
    Uganda: [1.3733, 32.2903],
    "New Zealand": [-40.9006, 174.886],
    Brazil: [-14.235, -51.9253],
    USA: [37.0902, -95.7129],
    Thailand: [15.87, 100.9925],
    Philippines: [12.8797, 121.774],
    Malaysia: [4.2105, 101.9758],
    Indonesia: [-0.7893, 113.9213],
    Vietnam: [14.0583, 108.2772],
    China: [35.8617, 104.1954],
    India: [20.5937, 78.9629],
    Mexico: [23.6345, -102.5528],
    Peru: [-9.19, -75.0152],
    Venezuela: [6.4238, -66.5897],
    "French Polynesia": [-17.6797, -149.4068],
    Gabon: [-0.8037, 11.6094],
    "Cote d'Ivoire": [7.54, -5.5471],
    Senegal: [14.4974, -14.4524],
    Canada: [56.1304, -106.3468],
    Cambodia: [12.5657, 104.991],
    "Central African Republic": [6.6111, 20.9394],
    "Micronesia, Federated States of": [7.4256, 150.5508],
  };

  if (commonCountries[country]) {
    return commonCountries[country];
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(country)}&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0 && data[0]?.lat && data[0]?.lon) {
      return [parseFloat(data[0]?.lat), parseFloat(data[0]?.lon)];
    }
    
    return [0, 0];
  } catch (error) {
    console.warn(`Erro ao geocodificar ${country}:`, error);
    return [0, 0];
  }
};

const useCountryCoordinates = () => {
  const [coordinatesCache, setCoordinatesCache] = useState({});
  const [loading, setLoading] = useState(false);

  const getCoordinatesForCountry = useCallback(async (country) => {
    if (!country) return [0, 0];
    
    if (coordinatesCache[country] && isValidCoordinates(coordinatesCache[country])) {
      return coordinatesCache[country];
    }

    setLoading(true);
    try {
      const coords = await getCoordinatesForCountryWithFallback(country);
      const validCoords = isValidCoordinates(coords) ? coords : [0, 0];
      setCoordinatesCache(prev => ({ ...prev, [country]: validCoords }));
      return validCoords;
    } catch (error) {
      console.error('Erro ao obter coordenadas:', error);
      return [0, 0];
    } finally {
      setLoading(false);
    }
  }, [coordinatesCache]);

  return { getCoordinatesForCountry, loading, coordinatesCache };
};

export default GeographicDistribution;
export { getCoordinatesForCountryWithFallback, isValidCoordinates, useCountryCoordinates };