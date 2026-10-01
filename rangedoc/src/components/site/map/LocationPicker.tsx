"use client";
/**
 * Click-to-pick map used in the admin (cities) and provider dashboard
 * (locations) to set latitude / longitude visually.
 */
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const icon = L.divIcon({
  className: "rd-marker",
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  html: `<svg viewBox="0 0 24 31" width="32" height="42"><path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 31 12 31s12-10.2 12-19.1C24 5.3 18.6 0 12 0Z" fill="#178343" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="11.5" r="4.5" fill="#fff"/></svg>`,
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))) });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 10));
  }, [lat, lng, map]);
  return null;
}

export default function LocationPicker({ lat, lng, onPick }: { lat?: number | null; lng?: number | null; onPick: (lat: number, lng: number) => void }) {
  const has = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);
  const center: [number, number] = has ? [lat!, lng!] : [39.5, -98.35];
  return (
    <MapContainer center={center} zoom={has ? 11 : 4} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler onPick={onPick} />
      {has && (
        <>
          <Marker
            position={center}
            icon={icon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const p = (e.target as L.Marker).getLatLng();
                onPick(Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6)));
              },
            }}
          />
          <Recenter lat={lat!} lng={lng!} />
        </>
      )}
    </MapContainer>
  );
}
