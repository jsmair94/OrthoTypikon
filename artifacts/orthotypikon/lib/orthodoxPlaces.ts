export type PlaceCategory = 'church' | 'monastery' | 'school';

export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type NearbyOrthodoxPlace = {
  id: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  distanceKm: number;
  address: string;
  osmUrl: string;
  source: 'directory' | 'openstreetmap';
  jurisdiction: string;
  sourceName: string;
  sourceUrl: string | null;
  verificationDetails: string;
  isVerified: boolean;
};

type OsmElement = {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OsmElement[];
};

type DirectoryApiPlace = Omit<NearbyOrthodoxPlace, 'osmUrl' | 'source'>;

function apiUrl(path: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (!domain) return `/api${path}`;
  const origin = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
  return `${origin.replace(/\/+$/, '')}/api${path}`;
}

const GREEK_ORTHODOX_PATTERN =
  /greek[\s_-]*orthodox|hellenic orthodox|ελληνορθόδοξ|الروم الأرثوذكس|روم أرثوذكس/i;
const MONASTERY_PATTERN =
  /monastery|monastic|monast[iy]r|μοναστήρι|دير|صومعة/i;

export function distanceBetweenCoordinates(from: Coordinate, to: Coordinate) {
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

  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function categoryFromOsmTags(
  tags: Record<string, string>,
): PlaceCategory | null {
  const amenity = tags.amenity?.toLowerCase();
  const building = tags.building?.toLowerCase();
  const monasteryDetails = [
    tags.monastery,
    tags.name,
    tags['name:en'],
    tags['name:el'],
    tags['name:ar'],
  ]
    .filter(Boolean)
    .join(' ');

  if (amenity === 'school' || building === 'school') return 'school';
  if (
    amenity === 'monastery' ||
    building === 'monastery' ||
    tags.monastery ||
    MONASTERY_PATTERN.test(monasteryDetails)
  ) {
    return 'monastery';
  }
  if (
    amenity === 'place_of_worship' ||
    ['church', 'chapel', 'cathedral', 'temple'].includes(building ?? '')
  ) {
    return 'church';
  }
  return null;
}

function isGreekOrthodox(tags: Record<string, string>) {
  return [
    tags.denomination,
    tags.operator,
    tags.name,
    tags['name:en'],
    tags['name:el'],
    tags['name:ar'],
    tags.official_name,
  ]
    .filter(Boolean)
    .some((value) => GREEK_ORTHODOX_PATTERN.test(value));
}

function elementCoordinate(element: OsmElement): Coordinate | null {
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }
  return { latitude, longitude };
}

export function parseOverpassPlaces(
  payload: OverpassResponse,
  center: Coordinate,
  radiusKm: number,
  language: 'ar' | 'en' | 'el',
): NearbyOrthodoxPlace[] {
  const results = (payload.elements ?? [])
    .flatMap((element): NearbyOrthodoxPlace[] => {
      const tags = element.tags ?? {};
      const coordinate = elementCoordinate(element);
      const category = categoryFromOsmTags(tags);
      const name =
        tags[`name:${language}`] ??
        tags.name ??
        tags.official_name ??
        tags.operator;

      if (
        !element.type ||
        typeof element.id !== 'number' ||
        !coordinate ||
        !name ||
        !category ||
        !isGreekOrthodox(tags)
      ) {
        return [];
      }

      const distanceKm = distanceBetweenCoordinates(center, coordinate);
      if (distanceKm > radiusKm) return [];

      const address = [
        tags['addr:housenumber'],
        tags['addr:street'],
        tags['addr:city'],
        tags['addr:state'],
        tags['addr:country'],
      ]
        .filter(Boolean)
        .join(', ');

      return [
        {
          id: `${element.type}/${element.id}`,
          name,
          category,
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          distanceKm,
          address,
          osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
          source: 'openstreetmap',
          jurisdiction: '',
          sourceName: 'OpenStreetMap',
          sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
          verificationDetails: '',
          isVerified: false,
        },
      ];
    })
    .sort((first, second) => first.distanceKm - second.distanceKm);

  return results;
}

export function buildOverpassQuery(center: Coordinate, radiusKm: number) {
  const radiusMeters = Math.round(radiusKm * 1000);
  const latitude = center.latitude.toFixed(6);
  const longitude = center.longitude.toFixed(6);
  const orthodoxTerms =
    'greek[ _-]*orthodox|hellenic orthodox|ελληνορθόδοξ|الروم الأرثوذكس|روم أرثوذكس';

  return `[out:json][timeout:18];(
  nwr(around:${radiusMeters},${latitude},${longitude})["denomination"~"${orthodoxTerms}",i];
  nwr(around:${radiusMeters},${latitude},${longitude})["name"~"${orthodoxTerms}",i]["amenity"~"place_of_worship|school",i];
  nwr(around:${radiusMeters},${latitude},${longitude})["operator"~"${orthodoxTerms}",i]["amenity"~"place_of_worship|school",i];
);out center;`;
}

export async function fetchNearbyOrthodoxPlaces(
  center: Coordinate,
  radiusKm: number,
  language: 'ar' | 'en' | 'el',
  signal: AbortSignal,
) {
  const directoryRequest = fetchDirectoryPlaces(center, radiusKm, signal);
  const mapRequest = fetchOpenStreetMapPlaces(center, radiusKm, language, signal);
  const [directoryResult, mapResult] = await Promise.allSettled([
    directoryRequest,
    mapRequest,
  ]);
  if (signal.aborted) throw new Error('Nearby search was cancelled.');
  if (
    directoryResult.status === 'rejected' &&
    mapResult.status === 'rejected'
  ) {
    throw new Error('The Orthodox places directory is temporarily unavailable.');
  }

  const directoryPlaces =
    directoryResult.status === 'fulfilled'
      ? directoryResult.value.map(toDirectoryPlace)
      : [];
  const mapPlaces = mapResult.status === 'fulfilled' ? mapResult.value : [];
  return mergeNearbyPlaces(directoryPlaces, mapPlaces);
}

export function mergeNearbyPlaces(
  directoryPlaces: NearbyOrthodoxPlace[],
  mapPlaces: NearbyOrthodoxPlace[],
) {
  const uniqueMapPlaces = mapPlaces.filter(
    (mapPlace) =>
      !directoryPlaces.some((directoryPlace) =>
        isDuplicateListing(directoryPlace, mapPlace),
      ),
  );
  return [...directoryPlaces, ...uniqueMapPlaces].sort(
    (first, second) =>
      first.distanceKm - second.distanceKm ||
      first.name.localeCompare(second.name),
  );
}

function toDirectoryPlace(place: DirectoryApiPlace): NearbyOrthodoxPlace {
  return {
    ...place,
    osmUrl: place.sourceUrl ?? '',
    source: 'directory',
  };
}

function isDuplicateListing(
  directoryPlace: NearbyOrthodoxPlace,
  mapPlace: NearbyOrthodoxPlace,
) {
  if (directoryPlace.category !== mapPlace.category) return false;
  const separationKm = distanceBetweenCoordinates(directoryPlace, mapPlace);
  const sameName =
    directoryPlace.name.trim().toLocaleLowerCase() ===
    mapPlace.name.trim().toLocaleLowerCase();
  return separationKm <= 0.1 || (sameName && separationKm <= 1);
}

export async function submitOrthodoxPlaceReport(placeId: string, details: string) {
  const response = await fetch(
    apiUrl(`/places/${encodeURIComponent(placeId)}/reports`),
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ details }),
    },
  );
  if (!response.ok) {
    throw new Error(`The place report could not be sent (HTTP ${response.status}).`);
  }
}

export function isPlaceReportDetailsValid(details: string) {
  return details.trim().length >= 5;
}

export async function attemptPlaceReportSubmission(
  placeId: string,
  details: string,
  send: (placeId: string, details: string) => Promise<void> = submitOrthodoxPlaceReport,
): Promise<'invalid' | 'sent' | 'failed'> {
  const trimmedDetails = details.trim();
  if (!isPlaceReportDetailsValid(trimmedDetails)) return 'invalid';

  try {
    await send(placeId, trimmedDetails);
    return 'sent';
  } catch {
    return 'failed';
  }
}

async function fetchOpenStreetMapPlaces(
  center: Coordinate,
  radiusKm: number,
  language: 'ar' | 'en' | 'el',
  signal: AbortSignal,
) {
  const url = new URL('https://overpass-api.de/api/interpreter');
  url.searchParams.set('data', buildOverpassQuery(center, radiusKm));
  const response = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`OpenStreetMap search returned HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as OverpassResponse;
  return parseOverpassPlaces(payload, center, radiusKm, language);
}

async function fetchDirectoryPlaces(
  center: Coordinate,
  radiusKm: number,
  signal: AbortSignal,
): Promise<DirectoryApiPlace[]> {
  const query = new URLSearchParams({
    latitude: String(center.latitude),
    longitude: String(center.longitude),
    radiusKm: String(radiusKm),
  });
  const response = await fetch(apiUrl(`/places/nearby?${query.toString()}`), {
    headers: { accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    throw new Error(`The Orthodox places directory returned HTTP ${response.status}.`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('The Orthodox places directory returned an invalid response.');
  }
  return payload as DirectoryApiPlace[];
}