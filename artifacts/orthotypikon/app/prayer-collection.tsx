import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/usePreferences';
import {
  getPrayerCollection,
  PRAYER_COLLECTION_IDS,
  type PrayerCollectionEntry,
} from '@/data/prayerCollections';

function PrayerCollectionContent({ collectionId }: { collectionId: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, t } = useI18n();
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const isRTL = language === 'ar';
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const collection = getPrayerCollection(language, collectionId);
  const categoryIndex = PRAYER_COLLECTION_IDS.indexOf(
    collectionId as (typeof PRAYER_COLLECTION_IDS)[number],
  );
  const title = categoryIndex >= 0
    ? t.library.prayerSections[categoryIndex]
    : t.prayerCollection.unavailableTitle;
  const selectedEntry = collection?.entries.find((entry) => entry.id === selectedEntryId);

  const goBack = () => {
    if (selectedEntryId) {
      setSelectedEntryId(null);
      return;
    }
    router.back();
  };

  const renderEntry = (entry: PrayerCollectionEntry) => (
    <Pressable
      key={entry.id}
      testID={`prayer-collection-entry-${entry.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${entry.title}. ${entry.reference}`}
      onPress={() => setSelectedEntryId(entry.id)}
      style={({ pressed }) => [
        styles.entryCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <View style={[styles.entryIcon, { backgroundColor: colors.secondary }]}>
        <Feather
          name={collectionId === 'gospels' || collectionId === 'epistles' ? 'book-open' : 'heart'}
          size={18}
          color={colors.primary}
        />
      </View>
      <View style={[styles.entryCopy, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.entryTitle, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>
          {entry.title}
        </Text>
        <Text style={[styles.reference, { color: colors.mutedForeground, textAlign: isRTL ? 'right' : 'left' }]}>
          {entry.reference}
        </Text>
      </View>
      <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={colors.mutedForeground} />
    </Pressable>
  );

  return (
    <ScrollView
      testID="prayer-collection-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: insets.top + webTopInset + 18,
          paddingBottom: insets.bottom + webBottomInset + 32,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable
          testID="prayer-collection-back"
          accessibilityRole="button"
          accessibilityLabel={selectedEntry ? t.prayerCollection.backToList : t.prayerCollection.back}
          onPress={goBack}
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={10}
        >
          <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={20} color={colors.primary} />
        </Pressable>
        <View style={[styles.topCopy, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.eyebrow, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>
            {t.prayerCollection.eyebrow}
          </Text>
          <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>
            {selectedEntry?.title ?? title}
          </Text>
        </View>
      </View>

      {!collection ? (
        <View style={[styles.unavailableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="book-open" size={24} color={colors.primary} />
          <Text style={[styles.body, { color: colors.mutedForeground, textAlign: isRTL ? 'right' : 'left' }]}>
            {t.prayerCollection.unavailableText}
          </Text>
        </View>
      ) : selectedEntry ? (
        <View style={[styles.readingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.reference, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>
            {selectedEntry.reference}
          </Text>
          <Text
            testID="prayer-collection-reading"
            style={[
              styles.readingText,
              {
                color: colors.foreground,
                textAlign: isRTL ? 'right' : 'left',
                writingDirection: isRTL ? 'rtl' : 'ltr',
              },
            ]}
          >
            {selectedEntry.text}
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.description, { color: colors.mutedForeground, textAlign: isRTL ? 'right' : 'left' }]}>
            {collection.description}
          </Text>
          <View style={styles.entries}>
            {collection.entries.map(renderEntry)}
          </View>
        </>
      )}
    </ScrollView>
  );
}

export default function PrayerCollectionScreen() {
  const { collection } = useLocalSearchParams<{ collection?: string }>();
  const collectionId = Array.isArray(collection) ? collection[0] : collection;
  return <PrayerCollectionContent key={collectionId ?? 'unavailable'} collectionId={collectionId ?? ''} />;
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 18 },
  topBar: { alignItems: 'center', gap: 12 },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topCopy: { flex: 1, gap: 4 },
  eyebrow: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 25, fontWeight: '800' },
  description: { fontSize: 14, lineHeight: 23 },
  entries: { gap: 10 },
  entryCard: { minHeight: 78, borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  entryCopy: { flex: 1, gap: 5 },
  entryTitle: { fontSize: 15, fontWeight: '700' },
  reference: { fontSize: 12, lineHeight: 19 },
  readingCard: { borderWidth: 1, borderRadius: 22, padding: 22, gap: 18 },
  readingText: { fontSize: 19, lineHeight: 34 },
  unavailableCard: { borderWidth: 1, borderRadius: 22, padding: 20, gap: 12 },
  body: { fontSize: 15, lineHeight: 24 },
});
