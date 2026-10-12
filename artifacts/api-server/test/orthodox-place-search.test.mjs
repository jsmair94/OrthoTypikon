import assert from "node:assert/strict";
import test from "node:test";
import {
  distanceBetweenCoordinates,
  sortPlacesWithinRadius,
} from "../src/lib/orthodox-place-search.ts";

test("nearby directory results are radius-limited and sorted closest first", () => {
  const results = sortPlacesWithinRadius(
    [
      { id: "far", name: "Far", latitude: 0, longitude: 0.8 },
      { id: "near", name: "Near", latitude: 0, longitude: 0.2 },
      { id: "outside", name: "Outside", latitude: 0, longitude: 1.5 },
    ],
    { latitude: 0, longitude: 0 },
    100,
  );

  assert.deepEqual(results.map(({ id }) => id), ["near", "far"]);
  assert.ok(results[0].distanceKm < results[1].distanceKm);
  assert.ok(results.every(({ distanceKm }) => distanceKm <= 100));
});

test("distance calculation remains finite for antipodal coordinates", () => {
  const distance = distanceBetweenCoordinates(
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 180 },
  );
  assert.ok(Number.isFinite(distance));
  assert.ok(Math.abs(distance - 20015) < 2);
});