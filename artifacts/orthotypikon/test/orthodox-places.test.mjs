import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import ts from 'typescript';
import {
  attemptPlaceReportSubmission,
  buildOverpassQuery,
  categoryFromOsmTags,
  distanceBetweenCoordinates,
  isPlaceReportDetailsValid,
  mergeNearbyPlaces,
  parseOverpassPlaces,
} from '../lib/orthodoxPlaces.ts';

const screenSource = readFileSync(
  new URL('../app/places.tsx', import.meta.url),
  'utf8',
);
const preferencesSource = readFileSync(
  new URL('../hooks/usePreferences.tsx', import.meta.url),
  'utf8',
);
const packageRequire = createRequire(import.meta.url);
let currentLanguage = 'en';
let nearbyPlaces = [];

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function placesCopyFor(language) {
  const screenCopyStart = preferencesSource.indexOf('export const screenCopy = {');
  const localeStart = preferencesSource.indexOf(`  ${language}: {`, screenCopyStart);
  assert.notEqual(localeStart, -1, `Missing ${language} screen copy`);

  const nextLocale = ['ar', 'en', 'el']
    .filter((candidate) => candidate !== language)
    .map((candidate) => preferencesSource.indexOf(`  ${candidate}: {`, localeStart + 1))
    .filter((index) => index !== -1)
    .sort((left, right) => left - right)[0] ?? preferencesSource.length;
  const localeSource = preferencesSource.slice(localeStart, nextLocale);
  const placesStart = localeSource.indexOf('    places: {');
  assert.notEqual(placesStart, -1, `Missing ${language} places copy`);
  const placesEnd = localeSource.indexOf('\n    },', placesStart);
  assert.notEqual(placesEnd, -1, `Unterminated ${language} places copy`);
  return localeSource.slice(placesStart, placesEnd);
}

function placeCopyValue(language, key) {
  const placesCopy = placesCopyFor(language);
  const match = placesCopy.match(new RegExp(`\\b${key}:\\s*'([^']*)'`));
  assert.ok(match, `Missing ${language} places.${key} copy`);
  return match[1];
}

function localizedPlaces(language) {
  return new Proxy(
    {},
    {
      get(_target, key) {
        if (typeof key !== 'string') return undefined;
        try {
          return placeCopyValue(language, key);
        } catch {
          return `places.${key}`;
        }
      },
    },
  );
}

function mockHost(name) {
  return function HostComponent({ children, ...props }) {
    return React.createElement(name, props, children);
  };
}

const mockColors = {
  background: '#fff',
  card: '#fff',
  border: '#ddd',
  primary: '#123',
  primaryForeground: '#fff',
  secondary: '#eee',
  accent: '#123',
  accentForeground: '#fff',
  foreground: '#111',
  mutedForeground: '#666',
  destructive: '#b00',
};

const mockNative = {
  Linking: { openURL: async () => {}, openSettings: async () => {} },
  Modal: ({ visible, children, ...props }) =>
    visible ? React.createElement('Modal', props, children) : null,
  Platform: { OS: 'android' },
  Pressable: mockHost('Pressable'),
  ScrollView: mockHost('ScrollView'),
  StyleSheet: { create: (styles) => styles },
  Text: mockHost('Text'),
  TextInput: mockHost('TextInput'),
  View: mockHost('View'),
};

const placesTestMocks = {
  'expo-location': {
    Accuracy: { Balanced: 1 },
    getCurrentPositionAsync: async () => ({
      coords: { latitude: 37.9838, longitude: 23.7275 },
    }),
    useForegroundPermissions: () => [
      { granted: true, canAskAgain: true },
      async () => ({ granted: true, canAskAgain: true }),
    ],
  },
  '@expo/vector-icons': {
    Feather: ({ name, ...props }) => React.createElement('Feather', { ...props, name }),
  },
  'expo-router': { useRouter: () => ({ back: () => {} }) },
  'react-native': mockNative,
  'react-native-keyboard-controller': {
    KeyboardAvoidingView: mockHost('KeyboardAvoidingView'),
  },
  'react-native-safe-area-context': {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
  },
  '@/hooks/useColors': { useColors: () => mockColors },
  '@/hooks/usePreferences': {
    useI18n: () => ({
      language: currentLanguage,
      t: {
        notFound: { back: 'Back' },
        places: localizedPlaces(currentLanguage),
      },
    }),
  },
  '@/lib/orthodoxPlaces': {
    attemptPlaceReportSubmission,
    fetchNearbyOrthodoxPlaces: async () => nearbyPlaces,
    isPlaceReportDetailsValid,
  },
};

const compiledScreen = ts.transpileModule(screenSource, {
  compilerOptions: {
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const screenModule = { exports: {} };
new Function('require', 'module', 'exports', compiledScreen)(
  (specifier) => placesTestMocks[specifier] ?? packageRequire(specifier),
  screenModule,
  screenModule.exports,
);
const PlacesScreen = screenModule.exports.default;

function placeFixture(id, source, isVerified) {
  return {
    id,
    name: `Orthodox Church ${id}`,
    category: 'church',
    latitude: 37.984,
    longitude: 23.7275,
    distanceKm: 0.3,
    address: 'Athens',
    osmUrl: '',
    source,
    jurisdiction: 'Greek Orthodox Archdiocese',
    sourceName: source === 'directory' ? 'Parish directory' : 'OpenStreetMap',
    sourceUrl: 'https://example.org/place',
    verificationDetails: '',
    isVerified,
  };
}

function renderedText(root) {
  const values = [];
  const collect = (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      values.push(String(child));
    } else if (Array.isArray(child)) {
      child.forEach(collect);
    }
  };
  for (const node of root.findAllByType('Text')) collect(node.props.children);
  return values;
}

async function press(renderer, testID) {
  await act(async () => {
    renderer.root.findByProps({ testID }).props.onPress();
    await new Promise((resolve) => setImmediate(resolve));
  });
}

async function mountResults(language, places) {
  currentLanguage = language;
  nearbyPlaces = places;
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(PlacesScreen));
  });
  await press(renderer, 'places-use-location');
  return renderer;
}

test('distanceBetweenCoordinates calculates great-circle distance in kilometers', () => {
  const distance = distanceBetweenCoordinates(
    { latitude: 0, longitude: 0 },
    { latitude: 1, longitude: 0 },
  );

  assert.ok(Math.abs(distance - 111.2) < 0.2);
});

test('categoryFromOsmTags recognizes schools, monasteries, and churches', () => {
  assert.equal(categoryFromOsmTags({ amenity: 'school' }), 'school');
  assert.equal(categoryFromOsmTags({ building: 'monastery' }), 'monastery');
  assert.equal(
    categoryFromOsmTags({ amenity: 'place_of_worship', name: 'St. George Church' }),
    'church',
  );
  assert.equal(categoryFromOsmTags({ amenity: 'restaurant' }), null);
});

test('parseOverpassPlaces keeps Greek Orthodox entries in range and sorts by distance', () => {
  const center = { latitude: 37.9838, longitude: 23.7275 };
  const places = parseOverpassPlaces(
    {
      elements: [
        {
          type: 'way',
          id: 2,
          center: { lat: 37.985, lon: 23.7275 },
          tags: {
            amenity: 'school',
            denomination: 'greek_orthodox',
            name: 'Orthodox School',
          },
        },
        {
          type: 'node',
          id: 1,
          lat: 37.984,
          lon: 23.7275,
          tags: {
            amenity: 'place_of_worship',
            denomination: 'greek_orthodox',
            name: 'Greek Orthodox Parish',
            'addr:city': 'Athens',
          },
        },
        {
          type: 'node',
          id: 3,
          lat: 38.2,
          lon: 23.7275,
          tags: {
            amenity: 'place_of_worship',
            denomination: 'greek_orthodox',
            name: 'Far Church',
          },
        },
        {
          type: 'node',
          id: 4,
          lat: 37.9841,
          lon: 23.7275,
          tags: {
            amenity: 'place_of_worship',
            denomination: 'serbian_orthodox',
            name: 'Serbian Orthodox Church',
          },
        },
      ],
    },
    center,
    5,
    'en',
  );

  assert.deepEqual(
    places.map(({ id, category }) => ({ id, category })),
    [
      { id: 'node/1', category: 'church' },
      { id: 'way/2', category: 'school' },
    ],
  );
  assert.equal(places[0].address, 'Athens');
  assert.match(places[0].osmUrl, /openstreetmap\.org\/node\/1$/);
});

test('buildOverpassQuery uses the requested radius and center', () => {
  const query = buildOverpassQuery(
    { latitude: 37.9838, longitude: 23.7275 },
    25,
  );

  assert.match(query, /around:25000,37\.983800,23\.727500/);
  assert.match(query, /denomination/);
});

test('mergeNearbyPlaces keeps the verified directory fallback and prefers it over OSM duplicates', () => {
  const directoryPlace = {
    id: 'directory-1',
    name: 'St George Orthodox Church',
    category: 'church',
    latitude: 37.984,
    longitude: 23.7275,
    distanceKm: 0.03,
    address: 'Athens',
    osmUrl: '',
    source: 'directory',
    jurisdiction: 'Greek Orthodox Archdiocese',
    sourceName: 'Parish website',
    sourceUrl: 'https://example.org/parish',
    verificationDetails: 'Confirmed by the parish directory.',
    isVerified: true,
  };
  const mapDuplicate = {
    ...directoryPlace,
    id: 'node/10',
    source: 'openstreetmap',
    sourceName: 'OpenStreetMap',
    sourceUrl: 'https://www.openstreetmap.org/node/10',
    verificationDetails: '',
    isVerified: false,
  };
  const mapOnly = {
    ...mapDuplicate,
    id: 'node/11',
    name: 'Other Orthodox Church',
    latitude: 37.99,
    distanceKm: 1.2,
  };

  const directoryOnlyFallback = mergeNearbyPlaces([directoryPlace], []);
  assert.deepEqual(directoryOnlyFallback.map(({ id }) => id), ['directory-1']);

  const merged = mergeNearbyPlaces([directoryPlace], [mapDuplicate, mapOnly]);
  assert.deepEqual(merged.map(({ id }) => id), ['directory-1', 'node/11']);
  assert.equal(merged[0].isVerified, true);
});

test('place report dialog and submission feedback have Arabic, English, and Greek copy', () => {
  const expectedCopy = {
    ar: {
      verified: 'تم التحقق',
      unverified: 'غير متحقق منه',
      reportIncorrect: 'الإبلاغ عن خطأ',
      reportTitle: 'الإبلاغ عن تفاصيل غير صحيحة',
      reportDetails: 'أخبرنا ما التفاصيل التي تحتاج إلى تصحيح.',
      reportPlaceholder: 'العنوان أو الاسم أو الموقع غير صحيح…',
      reportSend: 'إرسال البلاغ',
      reportCancel: 'إلغاء',
      reportSent: 'شكرًا، وصل بلاغك إلى فريق مراجعة الدليل.',
      reportError: 'تعذر إرسال البلاغ الآن. حاول مرة أخرى لاحقًا.',
    },
    en: {
      verified: 'Verified',
      unverified: 'Not verified',
      reportIncorrect: 'Report a problem',
      reportTitle: 'Report incorrect details',
      reportDetails: 'Tell us which listing details need correction.',
      reportPlaceholder: 'The address, name, or location is incorrect…',
      reportSend: 'Send report',
      reportCancel: 'Cancel',
      reportSent: 'Thank you. Your report was sent for review.',
      reportError: 'Your report could not be sent. Please try again later.',
    },
    el: {
      verified: 'Επαληθευμένο',
      unverified: 'Μη επαληθευμένο',
      reportIncorrect: 'Αναφορά προβλήματος',
      reportTitle: 'Αναφορά λανθασμένων στοιχείων',
      reportDetails: 'Πείτε μας ποια στοιχεία της καταχώρισης χρειάζονται διόρθωση.',
      reportPlaceholder: 'Η διεύθυνση, το όνομα ή η τοποθεσία είναι λανθασμένα…',
      reportSend: 'Αποστολή αναφοράς',
      reportCancel: 'Ακύρωση',
      reportSent: 'Ευχαριστούμε. Η αναφορά σας στάλθηκε για έλεγχο.',
      reportError: 'Δεν ήταν δυνατή η αποστολή της αναφοράς. Δοκιμάστε ξανά αργότερα.',
    },
  };

  for (const [language, expected] of Object.entries(expectedCopy)) {
    for (const [key, value] of Object.entries(expected)) {
      assert.equal(placeCopyValue(language, key), value, `${language} places.${key}`);
    }
  }
});

test('place report validation trims details and requires at least five characters', async () => {
  assert.equal(isPlaceReportDetailsValid(''), false);
  assert.equal(isPlaceReportDetailsValid('   '), false);
  assert.equal(isPlaceReportDetailsValid('  abc '), false);
  assert.equal(isPlaceReportDetailsValid('  abcde '), true);

  let sendCalled = false;
  assert.equal(
    await attemptPlaceReportSubmission('directory-1', '  abc ', async () => {
      sendCalled = true;
    }),
    'invalid',
  );
  assert.equal(sendCalled, false, 'Invalid details must not be submitted');
});

test('successful place report submission sends trimmed details and closes with localized success feedback', async () => {
  const sent = [];
  const result = await attemptPlaceReportSubmission(
    'directory-1',
    '  The address is wrong.  ',
    async (placeId, details) => sent.push({ placeId, details }),
  );

  assert.equal(result, 'sent');
  assert.deepEqual(sent, [
    { placeId: 'directory-1', details: 'The address is wrong.' },
  ]);
});

test('failed place report submission leaves the modal open and shows localized failure feedback', async () => {
  const result = await attemptPlaceReportSubmission(
    'directory-1',
    'The address is wrong.',
    async () => {
      throw new Error('network unavailable');
    },
  );

  assert.equal(result, 'failed');
});

test('rendered place cards and report flow work in Arabic, English, and Greek', async () => {
  const originalFetch = globalThis.fetch;
  const languages = ['ar', 'en', 'el'];
  const places = [
    placeFixture('dir-verified', 'directory', true),
    placeFixture('dir-unverified', 'directory', false),
    placeFixture('map-unverified', 'openstreetmap', false),
  ];

  try {
    for (const language of languages) {
      const requests = [];
      globalThis.fetch = async (url, options) => {
        requests.push({ url: String(url), options });
        return { ok: true, status: 201 };
      };

      let renderer;
      try {
        renderer = await mountResults(language, places);
        const cardText = renderedText(renderer.root);

        assert.ok(cardText.includes(placeCopyValue(language, 'verified')));
        assert.ok(cardText.includes(placeCopyValue(language, 'unverified')));
        assert.ok(cardText.includes(placeCopyValue(language, 'reportIncorrect')));
        assert.equal(
          renderer.root
            .findAllByType('Pressable')
            .filter((button) => button.props.testID === 'places-report-dir-verified')
            .length,
          1,
        );
        assert.equal(
          renderer.root
            .findAllByType('Pressable')
            .filter((button) => button.props.testID === 'places-report-dir-unverified')
            .length,
          1,
        );
        assert.equal(
          renderer.root
            .findAllByType('Pressable')
            .filter((button) => button.props.testID === 'places-report-map-unverified')
            .length,
          0,
        );

        await press(renderer, 'places-report-dir-unverified');
        let modalText = renderedText(renderer.root);
        for (const key of ['reportTitle', 'reportDetails', 'reportSend', 'reportCancel']) {
          assert.ok(modalText.includes(placeCopyValue(language, key)), `${language} modal copy: ${key}`);
        }
        assert.ok(modalText.includes('Orthodox Church dir-unverified'));
        assert.equal(
          renderer.root.findByProps({ testID: 'places-report-details' }).props.placeholder,
          placeCopyValue(language, 'reportPlaceholder'),
        );

        assert.equal(
          renderer.root.findByProps({ testID: 'places-submit-report' }).props.disabled,
          true,
          'The send action starts disabled for empty details',
        );
        await act(async () => {
          renderer.root.findByProps({ testID: 'places-report-details' }).props.onChangeText('bad');
        });
        assert.equal(
          renderer.root.findByProps({ testID: 'places-submit-report' }).props.disabled,
          true,
          'Details shorter than five trimmed characters remain invalid',
        );
        assert.equal(requests.length, 0);

        await act(async () => {
          renderer.root
            .findByProps({ testID: 'places-report-details' })
            .props.onChangeText('  Incorrect address  ');
        });
        assert.equal(
          renderer.root.findByProps({ testID: 'places-submit-report' }).props.disabled,
          false,
        );
        await press(renderer, 'places-submit-report');

        assert.ok(renderedText(renderer.root).includes(placeCopyValue(language, 'reportSent')));
        assert.equal(renderer.root.findAllByType('Modal').length, 0);
        assert.equal(requests.length, 1);
        assert.match(requests[0].url, /\/places\/dir-unverified\/reports$/);
        assert.equal(requests[0].options.method, 'POST');
        assert.deepEqual(JSON.parse(requests[0].options.body), {
          details: 'Incorrect address',
        });
      } finally {
        if (renderer) await act(async () => renderer.unmount());
      }

      globalThis.fetch = async () => ({ ok: false, status: 503 });
      let failedRenderer;
      try {
        failedRenderer = await mountResults(language, places);
        await press(failedRenderer, 'places-report-dir-unverified');
        await act(async () => {
          failedRenderer.root
            .findByProps({ testID: 'places-report-details' })
            .props.onChangeText('Incorrect address');
        });
        await press(failedRenderer, 'places-submit-report');

        assert.ok(
          renderedText(failedRenderer.root).includes(placeCopyValue(language, 'reportError')),
        );
        assert.equal(failedRenderer.root.findAllByType('Modal').length, 1);
        assert.ok(renderedText(failedRenderer.root).includes('Orthodox Church dir-unverified'));
      } finally {
        if (failedRenderer) await act(async () => failedRenderer.unmount());
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});