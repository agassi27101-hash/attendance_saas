/**
 * Returns distance in meters between two lat/lng points using the Haversine formula.
 */
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Given a user's current position and a list of zones (id, latitude, longitude, radius_meters),
 * returns the first zone the user is inside, or null if outside all of them.
 */
function findMatchingZone(lat, lng, zones) {
  for (const zone of zones) {
    const dist = distanceMeters(lat, lng, zone.latitude, zone.longitude);
    if (dist <= zone.radius_meters) {
      return { zone, distance: Math.round(dist) };
    }
  }
  return null;
}

module.exports = { distanceMeters, findMatchingZone };
