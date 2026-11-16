// ============================================================
// WayGo - Mapa operativo (Leaflet + OpenStreetMap)
// Muestra conductores activos y solicitudes (origen/destino)
// ============================================================
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const BOGOTA = [4.6097, -74.0817]

const STATUS_COLOR = {
  AVAILABLE: '#10b981',
  BUSY: '#f59e0b',
  PUBLISHED: '#3b82f6',
  RECEIVING_OFFERS: '#8b5cf6',
  ASSIGNED: '#10b981',
  EN_ROUTE: '#f59e0b',
  IN_SERVICE: '#ef4444',
}

export default function OperationalMap({ drivers = [], requests = [], onDriverClick, onRequestClick }) {
  // Centro: primer conductor con ubicacion o Bogota
  const center = drivers.find((d) => d.lat && d.lng)
    ? [drivers.find((d) => d.lat && d.lng).lat, drivers.find((d) => d.lat && d.lng).lng]
    : BOGOTA

  return (
    <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%', borderRadius: 12 }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {drivers.filter((d) => d.lat && d.lng).map((d) => (
        <CircleMarker
          key={`d-${d.userId}`}
          center={[d.lat, d.lng]}
          radius={8}
          pathOptions={{ color: STATUS_COLOR[d.operationalStatus] || '#64748b', fillColor: STATUS_COLOR[d.operationalStatus] || '#64748b', fillOpacity: 0.8 }}
          eventHandlers={{ click: () => onDriverClick?.(d) }}
        >
          <Popup>{d.name} · {d.vehicle ? `${d.vehicle.brand} ${d.vehicle.plate}` : 'sin vehiculo'} · {d.operationalStatus}</Popup>
        </CircleMarker>
      ))}

      {requests.map((r) => (
        <span key={`r-${r.id}`}>
          {r.pickup?.lat && r.pickup?.lng && (
            <CircleMarker center={[r.pickup.lat, r.pickup.lng]} radius={6}
              pathOptions={{ color: STATUS_COLOR[r.status] || '#3b82f6', fillColor: STATUS_COLOR[r.status] || '#3b82f6', fillOpacity: 0.5 }}
              eventHandlers={{ click: () => onRequestClick?.(r) }}>
              <Popup>#{r.requestNumber} Origen · {r.pickup.address}</Popup>
            </CircleMarker>
          )}
          {r.dropoff?.lat && r.dropoff?.lng && (
            <CircleMarker center={[r.dropoff.lat, r.dropoff.lng]} radius={6}
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.5 }}
              eventHandlers={{ click: () => onRequestClick?.(r) }}>
              <Popup>#{r.requestNumber} Destino · {r.dropoff.address}</Popup>
            </CircleMarker>
          )}
        </span>
      ))}
    </MapContainer>
  )
}
