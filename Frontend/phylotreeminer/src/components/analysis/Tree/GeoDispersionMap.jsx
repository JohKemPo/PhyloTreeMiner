// Tree/GeoDispersionMap.jsx
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix para ícones do Leaflet no React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const GeoDispersionMap = ({ nodes, selectedNode, onNodeSelect }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Inicializar o mapa
    mapInstance.current = L.map(mapRef.current).setView([0, 0], 2);

    // Adicionar camada base
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !nodes.length) return;

    // Limpar marcadores anteriores
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Adicionar novos marcadores
    const markers = [];
    const bounds = L.latLngBounds();

    nodes.forEach((node) => {
      // O node já deve vir com geoData processado do componente pai
      if (node.geoData && node.geoData.lat && node.geoData.lng) {
        const marker = L.marker([node.geoData.lat, node.geoData.lng])
          .addTo(mapInstance.current)
          .bindPopup(`<b>${node.name}</b><br>${node.geoData.location || ""}`);

        marker.on("click", () => {
          onNodeSelect(node);
        });

        markers.push(marker);
        bounds.extend([node.geoData.lat, node.geoData.lng]);
      }
    });

    markersRef.current = markers;

    // Ajustar zoom para mostrar todos os marcadores
    if (markers.length > 0) {
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [nodes, onNodeSelect]);

  return (
    <div
      ref={mapRef}
      style={{
        height: "100%",
        width: "100%",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    />
  );
};

export default GeoDispersionMap;