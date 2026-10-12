import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import test from 'node:test';
import ts from 'typescript';

const packageRequire = createRequire(import.meta.url);
const languages = ['ar', 'en', 'el'];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let currentLanguage = 'ar';

const screenText = {
  ar: {
    eyebrow: 'المطبخ',
    title: 'وصفات الطعام',
    recipesToday: 'جميع الوصفات',
    listHint: 'اختر أكلة لعرض المكونات وطريقة الطبخ',
    guidance: 'هذا الدليل مبدئي للتذكير والتنظيم، ولا يغني عن إرشاد الأب الروحي أو مراعاة الحالة الصحية. قد تختلف تفاصيل الصوم بحسب التقليد والرعية.',
    recipes: 'وصفات',
    tapForDetails: 'اضغط لعرض التفاصيل',
    ingredients: 'المكونات',
    preparation: 'طريقة الطبخ',
    closeDetails: 'إغلاق تفاصيل الوصفة',
  },
  en: {
    eyebrow: 'Kitchen',
    title: 'Food recipes',
    recipesToday: 'All recipes',
    listHint: 'Choose a dish to see its ingredients and method',
    guidance: 'This is a preliminary guide for reflection and organization. It does not replace guidance from your spiritual father or consideration of your health. Fasting details may vary by tradition and parish.',
    recipes: 'recipes',
    tapForDetails: 'Tap to view details',
    ingredients: 'Ingredients',
    preparation: 'Method',
    closeDetails: 'Close recipe details',
  },
  el: {
    eyebrow: 'Κουζίνα',
    title: 'Συνταγές φαγητών',
    recipesToday: 'Όλες οι συνταγές',
    listHint: 'Επιλέξτε ένα πιάτο για τα υλικά και την εκτέλεση',
    guidance: 'Αυτός ο οδηγός είναι προκαταρκτικός και προσφέρεται για υπενθύμιση και οργάνωση· δεν αντικαθιστά την καθοδήγηση του πνευματικού σας ή την προσοχή στην κατάσταση της υγείας σας. Οι λεπτομέρειες της νηστείας μπορεί να διαφέρουν ανάλογα με την παράδοση και την ενορία.',
    recipes: 'συνταγές',
    tapForDetails: 'Πατήστε για λεπτομέρειες',
    ingredients: 'Υλικά',
    preparation: 'Εκτέλεση',
    closeDetails: 'Κλείσιμο λεπτομερειών συνταγής',
  },
};

function mockHost(name) {
  return function HostComponent({ children, ...props }) {
    return React.createElement(name, props, children);
  };
}

function loadRecipeData() {
  const source = readFileSync(new URL('../data/fasting2026.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const dataModule = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(
    () => ({
      getCalendarEntryForType: () => undefined,
      shiftDateKey: (date) => date,
    }),
    dataModule,
    dataModule.exports,
  );
  return dataModule.exports.getAllRecipes();
}

const recipes = loadRecipeData();
const mockColors = {
  background: '#101A24',
  card: '#182838',
  border: '#304453',
  primary: '#D5A95B',
  secondary: '#263746',
  accent: '#E4B967',
  foreground: '#F6F2EA',
  mutedForeground: '#B7C0C3',
};
const mockNative = {
  Modal: mockHost('Modal'),
  Pressable: mockHost('Pressable'),
  ScrollView: mockHost('ScrollView'),
  StyleSheet: { create: (styles) => styles, hairlineWidth: 1 },
  Text: mockHost('Text'),
  View: mockHost('View'),
};

const screenMocks = {
  '@expo/vector-icons': {
    Feather: ({ name, ...props }) => React.createElement('Feather', { ...props, name }),
  },
  'expo-router': { useRouter: () => ({ back() {} }) },
  'react-native': mockNative,
  'react-native-safe-area-context': {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
  },
  '@/hooks/useColors': { useColors: () => mockColors },
  '@/hooks/usePreferences': {
    useI18n: () => ({
      language: currentLanguage,
      t: { fasting: screenText[currentLanguage] },
    }),
  },
  '@/data/fasting2026': { getAllRecipes: () => recipes },
};

function buildScreen() {
  const source = readFileSync(new URL('../app/fasting.tsx', import.meta.url), 'utf8');
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
    (specifier) => screenMocks[specifier] ?? packageRequire(specifier),
    screenModule,
    screenModule.exports,
  );
  return screenModule.exports.default;
}

const RecipesScreen = buildScreen();

test('the recipe list shows every available dish without fasting calendar dates', () => {
  currentLanguage = 'ar';
  let renderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(RecipesScreen));
  });

  assert.equal(recipes.length, 9);
  for (const recipe of recipes) {
    assert.ok(renderer.root.findByProps({ testID: `recipe-card-${recipe.id}` }));
  }

  const renderedTree = JSON.stringify(renderer.toJSON());
  assert.doesNotMatch(renderedTree, /2026-/i);
  act(() => renderer.unmount());
});

test('the fasting guidance appears before the recipes in all supported languages', () => {
  for (const language of languages) {
    currentLanguage = language;
    let renderer;
    act(() => {
      renderer = TestRenderer.create(React.createElement(RecipesScreen));
    });

    assert.equal(
      renderer.root.findByProps({ testID: 'recipe-guidance-text' }).props.children,
      screenText[language].guidance,
    );

    const listChildren = renderer.root.findByType('ScrollView').children;
    const guidanceIndex = listChildren.findIndex((child) => child.props?.testID === 'recipe-guidance');
    const firstRecipeIndex = listChildren.findIndex((child) => child.props?.testID === `recipe-card-${recipes[0].id}`);
    assert.ok(guidanceIndex >= 0 && guidanceIndex < firstRecipeIndex);

    act(() => renderer.unmount());
  }
});

test('selecting a dish opens its ingredients and numbered cooking steps', () => {
  currentLanguage = 'ar';
  let renderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(RecipesScreen));
  });

  for (const recipe of recipes) {
    act(() => {
      renderer.root.findByProps({ testID: `recipe-card-${recipe.id}` }).props.onPress();
    });

    assert.equal(renderer.root.findByType('Modal').props.visible, true);
    const visibleText = renderer.root.findAllByType('Text').map((node) => node.props.children);
    assert.ok(visibleText.includes('المكونات'));
    assert.ok(visibleText.includes('طريقة الطبخ'));
    assert.ok(visibleText.includes(recipe.ingredients[0]));
    assert.ok(visibleText.includes(recipe.steps[0]));

    act(() => {
      renderer.root.findByProps({ accessibilityLabel: 'إغلاق تفاصيل الوصفة' }).props.onPress();
    });
    assert.equal(renderer.root.findByType('Modal').props.visible, false);
  }

  act(() => renderer.unmount());
});

test('every recipe has complete English and Greek titles, ingredients, and cooking steps', () => {
  for (const recipe of recipes) {
    for (const language of languages.slice(1)) {
      const copy = recipe.translations[language];
      assert.ok(copy.title);
      assert.ok(copy.subtitle);
      assert.ok(copy.time);
      assert.ok(copy.ingredients.length > 0);
      assert.ok(copy.steps.length > 0);
    }
  }
});
