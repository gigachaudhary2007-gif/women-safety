import { Coordinates, GpsReading, RoutePoint, JourneySettings } from '../types';
import { calculateDistanceMeters } from './geolocation';

/**
 * Calculates the shortest distance in meters from a given GPS coordinate
 * to an arbitrary multi-segment polyline route.
 */
export function calculateShortestDistanceToPolyline(
  point: Coordinates,
  polyline: RoutePoint[]
): number {
  if (!polyline || polyline.length === 0) return 0;
  if (polyline.length === 1) {
    return calculateDistanceMeters(point, polyline[0]);
  }

  let minDistance = Infinity;

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];

    const distToSegment = distanceToSegment(point, a, b);
    if (distToSegment < minDistance) {
      minDistance = distToSegment;
    }
  }

  return Math.round(minDistance);
}

/**
 * Distance from point P to line segment AB in meters.
 * Projects P onto AB clamped to [0, 1] and computes Haversine distance.
 */
function distanceToSegment(p: Coordinates, a: Coordinates, b: Coordinates): number {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;

  // If segment length is effectively zero, return distance to A
  if (dx === 0 && dy === 0) {
    return calculateDistanceMeters(p, a);
  }

  // Vector projection parameter t
  const t = ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));

  const closestPoint: Coordinates = {
    lat: a.lat + clampedT * dy,
    lng: a.lng + clampedT * dx,
  };

  return calculateDistanceMeters(p, closestPoint);
}

/**
 * Validates a GPS reading to filter out low-accuracy or impossible coordinate jumps.
 */
export function isValidGpsReading(
  reading: GpsReading,
  previousReading?: GpsReading,
  maxAccuracyMeters: number = 50
): { isValid: boolean; reason?: string } {
  // 1. Accuracy check
  if (reading.accuracy > maxAccuracyMeters) {
    return {
      isValid: false,
      reason: `GPS accuracy too low (${Math.round(reading.accuracy)}m > ${maxAccuracyMeters}m limit)`,
    };
  }

  // 2. Velocity jump check against previous reading
  if (previousReading) {
    const elapsedSeconds = Math.max(1, (reading.timestamp - previousReading.timestamp) / 1000);
    const distMoved = calculateDistanceMeters(previousReading, reading);
    const speedKmh = (distMoved / elapsedSeconds) * 3.6;

    // Filter impossible teleport jumps (> 180 km/h in civilian urban travel)
    if (speedKmh > 180 && distMoved > 100) {
      return {
        isValid: false,
        reason: `Impossible GPS location jump (${Math.round(distMoved)}m in ${Math.round(elapsedSeconds)}s = ${Math.round(speedKmh)} km/h)`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Checks if a vehicle has remained stationary longer than the configured stop timeout (4-5 minutes).
 */
export function isProlongedUnexpectedStop(
  currentReading: GpsReading,
  lastMovementReading: GpsReading | undefined,
  stopTimeoutSeconds: number = 300 // default 5 minutes
): { isStopped: boolean; stoppedDurationSeconds: number } {
  if (!lastMovementReading) {
    return { isStopped: false, stoppedDurationSeconds: 0 };
  }

  const distMoved = calculateDistanceMeters(lastMovementReading, currentReading);
  const stoppedDurationSeconds = Math.max(0, (currentReading.timestamp - lastMovementReading.timestamp) / 1000);

  // If vehicle has moved less than 20 meters over elapsed duration
  if (distMoved < 20 && stoppedDurationSeconds >= stopTimeoutSeconds) {
    return { isStopped: true, stoppedDurationSeconds: Math.round(stoppedDurationSeconds) };
  }

  return { isStopped: false, stoppedDurationSeconds: Math.round(stoppedDurationSeconds) };
}

/**
 * Generates an interpolated planned corridor with realistic route geometry between origin & destination.
 */
export function generatePlannedCorridor(
  origin: Coordinates,
  destination: Coordinates,
  numWaypoints: number = 10
): RoutePoint[] {
  const points: RoutePoint[] = [];

  for (let i = 0; i <= numWaypoints; i++) {
    const t = i / numWaypoints;
    // Introduce slight curved corridor offset to mirror actual urban road curvature
    const curveOffset = Math.sin(t * Math.PI) * 0.0025;

    points.push({
      order: i,
      lat: Number((origin.lat + t * (destination.lat - origin.lat) + curveOffset).toFixed(6)),
      lng: Number((origin.lng + t * (destination.lng - origin.lng) + curveOffset * 0.8).toFixed(6)),
    });
  }

  return points;
}
