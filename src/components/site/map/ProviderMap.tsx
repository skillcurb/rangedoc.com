"use client";
/**
 * Leaflet map (OpenStreetMap tiles – free, no API key).
 * Loaded only in the browser via next/dynamic (see ProviderMapLazy).
 *
 *  - markers: every point to show
 *  - selectedId: highlighted marker; the map flies to it
 */
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapMarker = { id: number | string; lat: number; lng: number; title: string; subtitle?: string; href?: string };

// SVG pin icons (avoids Leaflet's default image paths, which break with bundlers)
function pin(color: string, size: number) {
  return L.divIcon({
    className: "rd-marker",
    iconSize: [size, size * 1.3],
    iconAnchor: [size / 2, size * 1.3],
    popupAnchor: [0, -size * 1.2],
    html: `<svg viewBox="0 0 24 31" width="${size}" height="${size * 1.3}"><path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 31 12 31s12-10.2 12-19.1C24 5.3 18.6 0 12 0Z" fill="${color}" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="11.5" r="4.5" fill="#fff"/></svg>`,
  });
}
const DEFAULT_ICON = pin("#178343", 28);
const ACTIVE_ICON = pin("#0c2250", 38);

/** Moves the map when the selection or markers change */
function FlyController({ markers, selectedId, center }: { markers: MapMarker[]; selectedId?: number | string | null; center?: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    // A hidden (0×0) map can't calculate positions – skip until it's visible
    const size = map.getSize();
    if (!size.x || !size.y) return;
    const sel = markers.find((m) => m.id === selectedId);
    if (sel) {
      map.flyTo([sel.lat, sel.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
    } else if (markers.length > 1) {
      map.fitBounds(L.latLngBounds(markers.map((m) => [m.lat, m.lng])), { padding: [30, 30], maxZoom: 13 });
    } else if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 13);
    } else if (center) {
      map.setView([center.lat, center.lng], 11);
    }
  }, [map, markers, selectedId, center]);
  return null;
}

export default function ProviderMap({
  markers,
  selectedId,
  center,
  onSelect,
  className,
}: {
  markers: MapMarker[];
  selectedId?: number | string | null;
  center?: { lat: number; lng: number } | null;
  onSelect?: (id: number | string) => void;
  className?: string;
}) {
  const start = markers[0] ?? center ?? { lat: 39.5, lng: -98.35 }; // USA centre fallback
  return (
    <MapContainer center={[start.lat, start.lng]} zoom={markers.length ? 12 : 4} scrollWheelZoom={false} className={className} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={m.id === selectedId ? ACTIVE_ICON : DEFAULT_ICON}
          zIndexOffset={m.id === selectedId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect?.(m.id) }}
        >
          <Popup>
            <strong>{m.title}</strong>
            {m.subtitle && <div style={{ fontSize: 12, color: "#5d6985" }}>{m.subtitle}</div>}
            {m.href && (
              <a href={m.href} style={{ fontSize: 12 }}>
                View profile →
              </a>
            )}
          </Popup>
        </Marker>
      ))}
      <FlyController markers={markers} selectedId={selectedId} center={center} />
    </MapContainer>
  );
}
