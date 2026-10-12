import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import test from 'node:test';
import ts from 'typescript';

import {
  ROSARY_PRAYER_CONTENT_ID,
  ROSARY_PRAYER_IDS,
  rosaryPrayerOptions,
} from '../data/rosaryPrayerOptions.ts';

const packageRequire = createRequire(import.meta.url);
const languages = ['ar', 'en', 'el'];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test('the six rosary choices have matching localized IDs and exact Arabic labels', () => {
  const arabicLabels = [
    'مسبحة الرب يسوع',
    'مسبحة السيدة العذراء',
    'مسبحة السابق يوحنا المعمدان',
    'مسبحة رؤساء الملائكة',
    'مسبحة الراقدين',
    'مسبحة القديس باييسيوس',
  ];

  assert.deepEqual(
    rosaryPrayerOptions.ar.map((option) => option.title),
    arabicLabels,
  );
  for (const language of languages) {
    assert.deepEqual(
      rosaryPrayerOptions[language].map((option) => option.id),
      ROSARY_PRAYER_IDS,
    );
    assert.ok(rosaryPrayerOptions[language].every((option) => option.title.length > 0));
  }
  assert.equal(ROSARY_PRAYER_CONTENT_ID, 'lord-jesus');
});

function host(name) {
  return function HostComponent({ children, ...props }) {
    return React.createElement(name, props, children);
  };
}

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

const palette = {
  prayerMat: '#EFE8DA',
  prayerPaperStart: '#FFFDF6',
  prayerPaperMiddle: '#FBF5E9',
  prayerPaperEnd: '#F6ECDC',
  prayerPaperBorder: '#E4D6C4',
  prayerInsetBorder: '#C5A384',
  prayerInk: '#55463D',
  prayerMuted: '#806F62',
  prayerAccent: '#B78C6C',
  prayerKicker: '#A17B61',
  prayerOrbit: '#BB8E71',
  prayerShadow: '#5E452F',
};

const translations = {
  notFound: { back: 'العودة' },
  prayer: {
    eyebrow: 'أداة الصلاة اليومية',
    title: 'مسبحة الصلاة',
    introTitle: 'صلِّ بهدوء وحضور',
    introText: 'يا ربي يسوع المسيح، ارحمني أنا عبدك الخاطئ',
    introKicker: 'وقفة صلاة',
    introFooter: 'على مهلٍ، من القلب',
    completed: 'العقد المنجزة',
    of: 'من',
    next: 'صلِّ العقدة التالية',
    hint: 'صوت خفيف واهتزاز لمسي عند كل عقدة',
    reset: 'إعادة العداد',
    prayerText: '«يا ربي يسوع المسيح، ارحمني أنا عبدك الخاطئ»',
    audioTitle: 'صلاة يسوع',
    audioPlay: 'تشغيل الصلاة',
    audioPause: 'إيقاف الصلاة',
    audioLoading: 'جارٍ تجهيز المقطع الصوتي...',
    audioHint: 'يمكنك تشغيل الصلاة أو إيقافها في أي وقت أثناء المسبحة',
    audioFinished: 'انتهى المقطع — اضغط لإعادته',
    rosaryPickerLabel: 'اختر المسبحة',
    rosaryPickerPrompt: 'اختر صلاة المسبحة التي تريدها',
    rosaryPendingIntro: 'ستظهر كلمات هذه المسبحة عند إضافتها.',
    rosaryPendingAudio: 'لا يتوفر تسجيل صوتي لهذا الخيار بعد.',
  },
};

const mockPlayer = {
  pause() {
    pauseCalls += 1;
  },
  play() {
    playCalls += 1;
  },
  seekTo: async () => {},
};

let pauseCalls = 0;
let playCalls = 0;

const audioStatus = {
  currentTime: 0,
  duration: 471,
  didJustFinish: false,
  isBuffering: false,
  isLoaded: true,
  playbackState: 'readyToPlay',
  playing: false,
};

const mockNative = {
  Animated: {
    Value: class {
      interpolate() {
        return 0;
      }
    },
    timing: () => ({ start() {}, stop() {} }),
    View: host('AnimatedView'),
  },
  Easing: { cubic: 0, out: () => 0 },
  Platform: { OS: 'android' },
  Pressable: host('Pressable'),
  ScrollView: host('ScrollView'),
  StyleSheet: { create: (styles) => styles, hairlineWidth: 1 },
  Text: host('Text'),
  View: host('View'),
  Vibration: { vibrate() {} },
};

const PrayerScreen = buildScreen('../app/prayer.tsx', {
  '../assets/audio/jesus-prayer-rosary.mp3': {},
  '@react-native-async-storage/async-storage': {
    getItem: async () => '0',
    setItem: async () => {},
  },
  'expo-haptics': { impactAsync: async () => {}, ImpactFeedbackStyle: { Light: 'light' } },
  'expo-audio': {
    setAudioModeAsync: async () => {},
    useAudioPlayer: () => mockPlayer,
    useAudioPlayerStatus: () => audioStatus,
  },
  'expo-linear-gradient': { LinearGradient: host('LinearGradient') },
  '@expo/vector-icons': { Feather: ({ name, ...props }) => React.createElement('Feather', { ...props, name }) },
  'expo-router': { useRouter: () => ({ back() {} }) },
  'react-native': mockNative,
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
  '@/hooks/useColors': { useColors: () => palette },
  '@/hooks/usePreferences': {
    useI18n: () => ({ t: translations, language: 'ar' }),
  },
  '@/data/rosaryPrayerOptions': {
    ROSARY_PRAYER_CONTENT_ID,
    rosaryPrayerOptions,
  },
});

test('choosing another rosary updates the selection and hides unavailable text, audio, and bead actions', async () => {
  pauseCalls = 0;
  playCalls = 0;
  audioStatus.playing = false;
  audioStatus.currentTime = 0;
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(PrayerScreen));
    await Promise.resolve();
  });

  const picker = renderer.root.findByProps({ testID: 'rosary-prayer-picker' });
  assert.equal(
    renderer.root.findByProps({ testID: 'rosary-prayer-picker-label' }).props.children,
    'اختر صلاة المسبحة التي تريدها',
  );
  assert.equal(picker.props.accessibilityLabel, 'اختر المسبحة: مسبحة الرب يسوع');
  assert.ok(renderer.root.findAllByProps({ testID: 'prayer-audio-toggle' }).length > 0);
  assert.ok(renderer.root.findAllByProps({ testID: 'prayer-bead' }).length > 0);

  act(() => picker.props.onPress());
  assert.equal(
    renderer.root.findByProps({ testID: 'rosary-prayer-picker' }).props.accessibilityState.expanded,
    true,
  );
  act(() => renderer.root.findByProps({ testID: 'rosary-prayer-option-theotokos' }).props.onPress());

  const selectedPicker = renderer.root.findByProps({ testID: 'rosary-prayer-picker' });
  assert.equal(selectedPicker.props.accessibilityLabel, 'اختر المسبحة: مسبحة السيدة العذراء');
  assert.equal(selectedPicker.props.accessibilityState.expanded, false);
  assert.equal(renderer.root.findAllByProps({ testID: 'rosary-prayer-option-theotokos' }).length, 0);
  assert.equal(renderer.root.findAllByProps({ testID: 'prayer-audio-toggle' }).length, 0);
  assert.equal(renderer.root.findAllByProps({ testID: 'prayer-bead' }).length, 0);

  act(() => selectedPicker.props.onPress());
  act(() => renderer.root.findByProps({ testID: 'rosary-prayer-option-lord-jesus' }).props.onPress());
  assert.equal(renderer.root.findByProps({ testID: 'rosary-prayer-picker' }).props.accessibilityLabel, 'اختر المسبحة: مسبحة الرب يسوع');
  assert.ok(renderer.root.findAllByProps({ testID: 'prayer-audio-toggle' }).length > 0);
  assert.ok(renderer.root.findAllByProps({ testID: 'prayer-bead' }).length > 0);

  act(() => renderer.unmount());
});

test('switching rosaries waits for pending playback to start before pausing it', async () => {
  pauseCalls = 0;
  playCalls = 0;
  audioStatus.playing = false;
  audioStatus.currentTime = 0;
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(PrayerScreen));
    await Promise.resolve();
  });

  await act(async () => {
    await renderer.root.findByProps({ testID: 'prayer-audio-toggle' }).props.onPress();
  });
  assert.equal(playCalls, 1);

  audioStatus.playing = true;
  act(() => renderer.root.findByProps({ testID: 'rosary-prayer-picker' }).props.onPress());
  act(() => renderer.root.findByProps({ testID: 'rosary-prayer-option-theotokos' }).props.onPress());
  assert.equal(pauseCalls, 0);

  audioStatus.currentTime = 0.25;
  act(() => renderer.root.findByProps({ testID: 'rosary-prayer-picker' }).props.onPress());
  assert.equal(pauseCalls, 1);

  audioStatus.playing = false;
  audioStatus.currentTime = 0;
  act(() => renderer.unmount());
});
