import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import test from 'node:test';
import ts from 'typescript';

import {
  PRAYER_COLLECTION_IDS,
  prayerCollections,
} from '../data/prayerCollections.ts';

const packageRequire = createRequire(import.meta.url);
const preferencesSource = readFileSync(
  new URL('../hooks/usePreferences.tsx', import.meta.url),
  'utf8',
);
const languages = ['ar', 'en', 'el'];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const localizedCollectionUi = {
  ar: {
    eyebrow: 'من المكتبة الروحية',
    back: 'العودة إلى المكتبة',
    backToList: 'العودة إلى المجموعة',
    unavailableTitle: 'المجموعة غير متاحة',
    unavailableText: 'تعذر العثور على هذه المجموعة.',
  },
  en: {
    eyebrow: 'From the spiritual library',
    back: 'Back to the library',
    backToList: 'Back to the collection',
    unavailableTitle: 'Collection unavailable',
    unavailableText: 'This collection could not be found.',
  },
  el: {
    eyebrow: 'Από την πνευματική βιβλιοθήκη',
    back: 'Πίσω στη βιβλιοθήκη',
    backToList: 'Πίσω στη συλλογή',
    unavailableTitle: 'Η συλλογή δεν είναι διαθέσιμη',
    unavailableText: 'Δεν ήταν δυνατή η εύρεση αυτής της συλλογής.',
  },
};
const localizedCategoryLabels = {
  ar: ['الإنجيل المسموع', 'صلوات يومية', 'صلوات متنوعة', 'ابتهالات', 'كنوز الرسائل'],
  en: ['Audio Gospel', 'Daily prayers', 'Various prayers', 'Supplications', 'Treasures of the Epistles'],
  el: ['Ακουστό Ευαγγέλιο', 'Καθημερινές προσευχές', 'Διάφορες προσευχές', 'Δεήσεις', 'Θησαυροί των Επιστολών'],
};

let currentLanguage = 'en';
let currentCollection = 'gospels';
let pushedRoutes = [];

function localizedPrayerSections(language) {
  const copyStart = preferencesSource.indexOf('export const screenCopy = {');
  const localeStart = preferencesSource.indexOf(`  ${language}: {`, copyStart);
  const localeEnd = languages
    .map((candidate) => preferencesSource.indexOf(`  ${candidate}: {`, localeStart + 1))
    .filter((index) => index !== -1)
    .sort((left, right) => left - right)[0] ?? preferencesSource.length;
  const localeSource = preferencesSource.slice(localeStart, localeEnd);
  const match = localeSource.match(/prayerSections:\s*\[([^\]]+)\]/);
  assert.ok(match, `Missing ${language} prayer sections`);
  return [...match[1].matchAll(/'([^']*)'/g)].map(([, label]) => label);
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
  foreground: '#111',
  muted: '#eee',
  mutedForeground: '#666',
};
const mockNative = {
  Image: mockHost('Image'),
  Platform: { OS: 'android' },
  Pressable: mockHost('Pressable'),
  ScrollView: mockHost('ScrollView'),
  StyleSheet: { create: (styles) => styles, absoluteFillObject: {} },
  Text: mockHost('Text'),
  View: mockHost('View'),
};

function buildScreen(sourcePath, mocks) {
  const source = readFileSync(new URL(sourcePath, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const screenModule = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(
    (specifier) => mocks[specifier] ?? packageRequire(specifier),
    screenModule,
    screenModule.exports,
  );
  return screenModule.exports.default;
}

function styleLayers(style) {
  return (Array.isArray(style) ? style.flat(Infinity) : [style]).filter(
    (layer) => layer && typeof layer === 'object',
  );
}

const libraryScreenMocks = {
  '@expo/vector-icons': { Feather: ({ name, ...props }) => React.createElement('Feather', { ...props, name }) },
  'expo-router': {
    useLocalSearchParams: () => ({}),
    useRouter: () => ({ push: (route) => pushedRoutes.push(route) }),
  },
  'react-native': mockNative,
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
  '@/hooks/useColors': { useColors: () => mockColors },
  '@/hooks/usePreferences': {
    useI18n: () => ({
      language: currentLanguage,
      t: {
        library: {
          kicker: 'Library',
          title: 'Spiritual library',
          subtitle: 'Explore',
          topics: 'Learn',
          tools: 'Tools',
          prayers: 'Prayers',
          sections: Array(15).fill('Topic'),
          toolTitles: Array(6).fill('Tool'),
          prayerSections: localizedPrayerSections(currentLanguage),
        },
      },
    }),
  },
  '@/components/LibraryTopicImage': { LibraryTopicImage: mockHost('Image') },
  '@/data/prayerCollections': {
    PRAYER_COLLECTION_IDS,
  },
  '@/data/exploreItems': {
    exploreItems: [
      { key: 'library', imageUrl: 'https://api.example/api/explore-images/library', imageResizeMode: 'stretch', route: '/library', color: '#25394A' },
      { key: 'prayer', imageUrl: 'https://api.example/api/explore-images/prayer', imageResizeMode: 'stretch', route: '/prayer', color: '#8C5948' },
      { key: 'kitchen', imageUrl: 'https://api.example/api/explore-images/kitchen', imageResizeMode: 'contain', route: '/fasting', color: '#271A12' },
      { key: 'learn', imageUrl: 'https://api.example/api/explore-images/learn', imageResizeMode: 'stretch', route: '/learn', color: '#6C7C96' },
      { key: 'pastoral', imageUrl: 'https://api.example/api/explore-images/pastoral', imageResizeMode: 'stretch', route: '/pastoral', color: '#8C5948' },
      { key: 'places', imageUrl: 'https://api.example/api/explore-images/places', imageResizeMode: 'stretch', route: '/places', color: '#B47732' },
      { key: 'prayers', imageUrl: 'https://api.example/api/explore-images/prayers', imageResizeMode: 'stretch', route: '/library', color: '#534E50' },
    ],
  },
};

const PrayerCollectionLibraryScreen = buildScreen(
  '../app/(tabs)/library.tsx',
  libraryScreenMocks,
);

test('the moved Gospel card is absent from Prayers and the remaining cards keep their collections', () => {
  for (const language of languages) {
    currentLanguage = language;
    pushedRoutes = [];
    let renderer;
    act(() => {
      renderer = TestRenderer.create(React.createElement(PrayerCollectionLibraryScreen));
    });

    assert.equal(
      renderer.root.findAllByProps({ testID: 'library-prayers-rail-4' }).length,
      0,
      'Prayers should no longer contain the moved Gospel card',
    );

    for (const [index, collection] of PRAYER_COLLECTION_IDS.filter((id) => id !== 'gospels').entries()) {
      const card = renderer.root.findByProps({ testID: `library-prayers-rail-${index}` });
      assert.equal(
        card.props.accessibilityLabel,
        localizedCategoryLabels[language][index + 1],
      );
      act(() => card.props.onPress());
      assert.deepEqual(pushedRoutes.at(-1), {
        pathname: '/prayer-collection',
        params: { collection },
      });
    }

    act(() => renderer.unmount());
  }
});

test('Library topic images use the full-width frame while unmatched tool icons keep their square frame', () => {
  currentLanguage = 'en';
  let renderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(PrayerCollectionLibraryScreen));
  });

  const topicCard = renderer.root.findByProps({ testID: 'library-topics-rail-0' });
  const topicImage = topicCard.findByProps({ topic: 'patristics' });
  assert.equal(topicImage.props.resizeMode, 'contain');
  const topicFrame = topicCard.findAllByType('View').find((node) =>
    styleLayers(node.props.style).some((layer) => layer.width === '100%' && layer.height === 97),
  );
  assert.ok(topicFrame, 'topic image frame should span the card width at Explore height');

  const toolCard = renderer.root.findByProps({ testID: 'library-tools-rail-1' });
  const toolArtwork = toolCard.findAllByType('View').find((node) =>
    styleLayers(node.props.style).some((layer) => layer.width === 96 && layer.height === 96),
  );
  assert.ok(toolArtwork, 'unmatched East Compass artwork should keep its existing square frame');

  act(() => renderer.unmount());
});

test('matching spiritual tools reuse Explore covers and card measurements', () => {
  currentLanguage = 'en';
  let renderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(PrayerCollectionLibraryScreen));
  });

  const matches = [
    { index: 0, route: '/prayer' },
    { index: 2, route: '/fasting' },
    { index: 3, route: '/learn' },
    { index: 4, route: '/pastoral' },
    { index: 5, route: '/places' },
  ];

  for (const { index, route } of matches) {
    const exploreItem = libraryScreenMocks['@/data/exploreItems'].exploreItems.find(
      (item) => item.route === route,
    );
    const card = renderer.root.findByProps({ testID: `library-tools-rail-${index}` });
    const image = card.findByType('Image');
    const imageFrame = card.findAllByType('View').find((node) =>
      styleLayers(node.props.style).some((layer) => layer.width === '100%' && layer.height === 97),
    );
    const cardStyle = typeof card.props.style === 'function'
      ? card.props.style({ pressed: false })
      : card.props.style;
    const cardLayers = styleLayers(cardStyle);
    const groupLayers = styleLayers(card.parent.props.style);

    assert.ok(exploreItem, `Explore should include the ${route} destination`);
    assert.deepEqual(image.props.source, { uri: exploreItem.imageUrl });
    assert.equal(image.props.resizeMode, exploreItem.imageResizeMode);
    assert.ok(imageFrame, `${route} should use the Explore artwork dimensions`);
    assert.ok(cardLayers.some((layer) => layer.width === '100%' && layer.height === 148));
    assert.ok(groupLayers.some((layer) => layer.width === 137));
  }

  act(() => renderer.unmount());
});

test('Learn and Prayers cards match Explore card dimensions', () => {
  currentLanguage = 'en';
  let renderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(PrayerCollectionLibraryScreen));
  });

  assert.equal(renderer.root.findAllByProps({ topic: 'bible' }).length, 0);

  for (const testID of ['library-topics-rail-0', 'library-prayers-rail-0']) {
    const card = renderer.root.findByProps({ testID });
    const cardStyle = typeof card.props.style === 'function'
      ? card.props.style({ pressed: false })
      : card.props.style;

    assert.ok(
      styleLayers(cardStyle).some((layer) => layer.width === '100%' && layer.height === 148),
      `${testID} should use Explore's 148px card height`,
    );
    assert.ok(
      styleLayers(card.parent.props.style).some((layer) => layer.width === 137),
      `${testID} should use Explore's 137px card width`,
    );
  }

  act(() => renderer.unmount());
});

const BibleScreen = buildScreen('../app/bible.tsx', {
  '@expo/vector-icons': { Feather: ({ name, ...props }) => React.createElement('Feather', { ...props, name }) },
  'expo-router': { useRouter: () => ({ back: () => {} }) },
  'react-native': mockNative,
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
  '@/hooks/useColors': { useColors: () => ({ ...mockColors, heroStart: '#123', heroForeground: '#fff', accentForeground: '#123' }) },
  '@/hooks/usePreferences': {
    useI18n: () => ({
      language: currentLanguage,
      t: {},
    }),
  },
  '@/data/prayerCollections': {
    getPrayerCollection: (language, collectionId) =>
      prayerCollections[language]?.[collectionId] ?? null,
  },
});

test('the New Testament lists all 27 books without folder numbering and keeps Gospel excerpts with their book', () => {
  const books = [
    ['matthew', 'متى'],
    ['mark', 'مرقس'],
    ['luke', 'لوقا'],
    ['john', 'يوحنا'],
    ['acts', 'أعمال الرسل'],
    ['romans', 'رومية'],
    ['1-corinthians', 'كورنثوس الأولى'],
    ['2-corinthians', 'كورنثوس الثانية'],
    ['galatians', 'غلاطية'],
    ['ephesians', 'أفسس'],
    ['philippians', 'فيلبي'],
    ['colossians', 'كولوسي'],
    ['1-thessalonians', 'تسالونيكي الأولى'],
    ['2-thessalonians', 'تسالونيكي الثانية'],
    ['1-timothy', 'تيموثاوس الأولى'],
    ['2-timothy', 'تيموثاوس الثانية'],
    ['titus', 'تيطس'],
    ['philemon', 'فليمون'],
    ['hebrews', 'العبرانيين'],
    ['james', 'يعقوب'],
    ['1-peter', 'بطرس الأولى'],
    ['2-peter', 'بطرس الثانية'],
    ['1-john', 'يوحنا الأولى'],
    ['2-john', 'يوحنا الثانية'],
    ['3-john', 'يوحنا الثالثة'],
    ['jude', 'يهوذا'],
    ['revelation', 'رؤيا يوحنا'],
  ];

  for (const language of languages) {
    currentLanguage = language;
    let renderer;
    act(() => {
      renderer = TestRenderer.create(React.createElement(BibleScreen));
    });

    assert.equal(books.length, 27);
    assert.equal(renderer.root.findAllByProps({ testID: 'bible-section-gospels' }).length, 0);
    assert.equal(renderer.root.findAllByProps({ testID: 'bible-section-letters' }).length, 0);
    assert.equal(renderer.root.findAllByProps({ testID: 'bible-section-revelation' }).length, 0);

    for (const [bookId, arabicName] of books) {
      const bookCard = renderer.root.findByProps({ testID: `bible-section-book-${bookId}` });
      if (language === 'ar') {
        assert.equal(bookCard.props.accessibilityLabel, arabicName);
      }
      assert.doesNotMatch(bookCard.props.accessibilityLabel, /[0-9٠-٩\-–—]/);
    }

    for (const bookId of ['matthew', 'mark', 'luke', 'john']) {
      act(() => renderer.root.findByProps({ testID: `bible-section-book-${bookId}` }).props.onPress());
      const selectedEntryId = `gospel-${bookId}`;
      for (const entry of prayerCollections[language].gospels.entries) {
        const renderedReadings = renderer.root
          .findAllByProps({ testID: `bible-gospel-reading-${entry.id}` })
          .filter((node) => node.type === 'Text');
        assert.equal(
          renderedReadings.length,
          entry.id === selectedEntryId ? 1 : 0,
          `Only ${selectedEntryId} should appear when ${bookId} is selected in ${language}`,
        );
      }
    }

    act(() => renderer.unmount());
  }
});

const prayerCollectionScreenMocks = {
  '@expo/vector-icons': { Feather: ({ name, ...props }) => React.createElement('Feather', { ...props, name }) },
  'expo-router': {
    useLocalSearchParams: () => ({ collection: currentCollection }),
    useRouter: () => ({ back: () => {} }),
  },
  'react-native': mockNative,
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
  '@/hooks/useColors': { useColors: () => mockColors },
  '@/hooks/usePreferences': {
    useI18n: () => ({
      language: currentLanguage,
      t: {
        library: { prayerSections: localizedCategoryLabels[currentLanguage] },
        prayerCollection: localizedCollectionUi[currentLanguage],
      },
    }),
  },
  '@/data/prayerCollections': {
    getPrayerCollection: (language, collectionId) =>
      prayerCollections[language]?.[collectionId] ?? null,
    PRAYER_COLLECTION_IDS,
  },
};
const PrayerCollectionScreen = buildScreen(
  '../app/prayer-collection.tsx',
  prayerCollectionScreenMocks,
);

test('collection lists open localized reading views and return to their lists', () => {
  currentCollection = 'gospels';

  for (const language of languages) {
    currentLanguage = language;
    let renderer;
    act(() => {
      renderer = TestRenderer.create(React.createElement(PrayerCollectionScreen));
    });

    const entry = renderer.root.findByProps({ testID: 'prayer-collection-entry-gospel-matthew' });
    act(() => entry.props.onPress());
    const reading = renderer.root.findByProps({ testID: 'prayer-collection-reading' });
    assert.equal(reading.props.children, prayerCollections[language].gospels.entries[0].text);
    assert.equal(renderer.root.findByProps({ testID: 'prayer-collection-back' }).props.accessibilityLabel, localizedCollectionUi[language].backToList);

    act(() => renderer.root.findByProps({ testID: 'prayer-collection-back' }).props.onPress());
    assert.equal(
      renderer.root.findByProps({ testID: 'prayer-collection-entry-gospel-matthew' }).props.accessibilityLabel,
      `${prayerCollections[language].gospels.entries[0].title}. ${prayerCollections[language].gospels.entries[0].reference}`,
    );
    act(() => renderer.unmount());
  }
});
