/**
 * Geo helpers: distance maths + nearest city lookup.
 */

const EARTH_RADIUS_MILES = 3958.8;

/** Great-circle distance between two lat/lng points, in miles (Haversine formula) */
export function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(a));
}

/**
 * A rectangle around a point – used as a fast database pre-filter
 * before calculating exact distances.
 */
export function boundingBox(lat: number, lng: number, radiusMiles: number) {
  const latDelta = radiusMiles / 69; // ~69 miles per degree of latitude
  const lngDelta = radiusMiles / (69 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  return { minLat: lat - latDelta, maxLat: lat + latDelta, minLng: lng - lngDelta, maxLng: lng + lngDelta };
}

export function formatMiles(miles: number | null | undefined) {
  if (miles == null || !Number.isFinite(miles)) return "";
  if (miles < 0.2) return "Nearby";
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} miles`;
}
