import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, LayersControl } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'

const { BaseLayer } = LayersControl

const TIER_COLORS = {
  Critical: '#dc2626',
  Red: '#ea580c',
  Watch: '#d97706',
  Safe: '#16a34a',
}

function createClusterIcon(cluster) {
  const markers = cluster.getAllChildMarkers()
  const count = markers.length
  const tiers = markers.map(m => m.options.tierData)

  let bgColor = '#16a34a'
  if (tiers.includes('Critical')) bgColor = '#dc2626'
  else if (tiers.includes('Red')) bgColor = '#ea580c'
  else if (tiers.includes('Watch')) bgColor = '#d97706'

  return L.divIcon({
    html: `<div style="
      background: ${bgColor};
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 15px;
      font-family: 'Inter', sans-serif;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    ">${count}</div>`,
    className: '',
    iconSize: L.point(40, 40),
  })
}

export default function MapView({ villages, onSelect, pulse }) {
  return (
    <MapContainer center={[30.45, 79.0]} zoom={10} style={{ height: '100%', width: '100%' }}>
      <LayersControl position="topright">
        <BaseLayer checked name="🛰️ Google Satellite">
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            attribution="Imagery &copy; Google"
          />
        </BaseLayer>
        <BaseLayer name="🛰️ Esri Satellite">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
          />
        </BaseLayer>
        <BaseLayer name="🗻 Terrain">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri — Esri, DeLorme, NAVTEQ"
          />
        </BaseLayer>
        <BaseLayer name="🗺️ Classic (OSM)">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
        </BaseLayer>
      </LayersControl>

      <MarkerClusterGroup chunkedLoading maxClusterRadius={50} iconCreateFunction={createClusterIcon}>
        {villages.map((v) => {
          const color = TIER_COLORS[v.tier] || '#94a3b8'
          const isCritical = v.tier === 'Critical'
          return (
            <CircleMarker
              key={v.village_name}
              center={[v.latitude, v.longitude]}
              radius={isCritical ? 12 : 9}
              tierData={v.tier}
              pathOptions={{
                color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.9,
                className: isCritical && pulse ? 'pulse-marker' : '',
              }}
              eventHandlers={{ click: () => onSelect(v) }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <b>{v.village_name}</b> · #{v.priority_rank}
              </Tooltip>
              <Popup>
                <b>{v.village_name}</b> ({v.tehsil})<br />
                Rank: {v.priority_rank}<br />
                Hazard Score: {v.hazard_score}<br />
                Tier: <span style={{ color, fontWeight: 700 }}>{v.tier}</span>
              </Popup>
            </CircleMarker>
          )
        })}
      </MarkerClusterGroup>

      <style>{`
        .pulse-marker { animation: pulseGlow 0.8s ease-in-out 2; }
        @keyframes pulseGlow {
          0% { filter: drop-shadow(0 0 0px #dc2626); }
          50% { filter: drop-shadow(0 0 12px #dc2626); }
          100% { filter: drop-shadow(0 0 0px #dc2626); }
        }
      `}</style>
    </MapContainer>
  )
}