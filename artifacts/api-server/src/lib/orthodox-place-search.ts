export type GeographicCoordinate = {
  latitude: number;
  longitude: number;
};

export function distanceBetweenCoordinates(
  from: GeographicCoordinate,
  to: GeographicCoordinate,
) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const fromLatitude = radians(from.latitude);
  const toLatitude = radians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const boundedHaversine = Math.min(1, Math.max(0, haversine));
  return 6371 * 2 * Math.atan2(
    Math.sqrt(boundedHaversine),
    Math.sqrt(1 - boundedHaversine),
  );
}

export function sortPlacesWithinRadius<T extends GeographicCoordinate & { name: string }>(
  places: T[],
  center: GeographicCoordinate,
  radiusKm: number,
) {
  return places
    .map((place) => ({
      ...place,
      distanceKm: distanceBetweenCoordinates(center, place),
    }))
    .filter((place) => place.distanceKm <= radiusKm)
    .sort((first, second) =>
      first.distanceKm - second.distanceKm || first.name.localeCompare(second.name),
    );
}