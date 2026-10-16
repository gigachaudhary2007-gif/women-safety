// Geolocation, distance calculation, and emergency beacon link generation

export interface Coordinates {
  lat: number;
  lng: number;
}

// Haversine formula to compute distance in meters between two lat/lng pairs
export function calculateDistanceMeters(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (coord1.lat * Math.PI) / 180;
  const phi2 = (coord2.lat * Math.PI) / 180;
  const deltaPhi = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const deltaLambda = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Calculate distance from point to line segment (origin to destination)
export function calculateDeviationFromPlannedRoute(
  current: Coordinates,
  origin: Coordinates,
  destination: Coordinates
): number {
  // Approximate projection onto line segment in meters
  const dTotal = calculateDistanceMeters(origin, destination);
  if (dTotal === 0) return calculateDistanceMeters(current, origin);

  // Cross-track distance
  const d1 = calculateDistanceMeters(origin, current);
  const d2 = calculateDistanceMeters(current, destination);

  // If triangle inequality holds, estimate perpendicular distance using Heron's formula
  const s = (dTotal + d1 + d2) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - dTotal) * (s - d1) * (s - d2)));
  const perpendicular = (2 * area) / dTotal;

  return Math.round(perpendicular);
}

// Get user location with graceful fallback
export function getCurrentPositionPromise(): Promise<Coordinates> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          });
        },
        () => {
          // Default fallback (Central Metropolitan coordinates e.g. London / NYC / Delhi safe central)
          resolve({ lat: 28.6139, lng: 77.2090 });
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
      );
    } else {
      resolve({ lat: 28.6139, lng: 77.2090 });
    }
  });
}

// Create Google Maps beacon link
export function createMapBeaconUrl(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

// Create WhatsApp emergency distress message link
export function createWhatsAppDistressUrl(phone: string, userName: string, lat: number, lng: number, reason: string): string {
  const mapLink = createMapBeaconUrl(lat, lng);
  const cleanPhone = phone.replace(/\D/g, '');
  const message = encodeURIComponent(
    `🚨 EMERGENCY ALERT FROM SAFEJOURNEY 🚨\n\n${userName} needs immediate assistance!\nTrigger: ${reason}\n\nLive GPS Location:\n${mapLink}\n\nCoordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}\nPlease call or verify safety immediately.`
  );
  return cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`;
}

// Create native SMS link
export function createSmsDistressUrl(phone: string, userName: string, lat: number, lng: number, reason: string): string {
  const mapLink = createMapBeaconUrl(lat, lng);
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  const body = encodeURIComponent(
    `EMERGENCY ALERT: ${userName} triggered SafeJourney SOS (${reason}). Live Location: ${mapLink}`
  );
  return `sms:${cleanPhone}?body=${body}`;
}
