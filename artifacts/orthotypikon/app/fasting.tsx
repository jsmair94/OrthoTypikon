import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { getAllRecipes, type Recipe } from '@/data/fasting2026';
import { useI18n } from '@/hooks/usePreferences';

export default function FastingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, language } = useI18n();
  const recipes = getAllRecipes();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const selectedCopy = selectedRecipe
    ? language === 'ar' ? selectedRecipe : selectedRecipe.translations[language]
    : null;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]} hitSlop={10}><Feather name="arrow-right" size={20} color={colors.primary} /></Pressable>
        <View style={styles.topCopy}><Text style={[styles.eyebrow, { color: colors.primary }]}>{t.fasting.eyebrow}</Text><Text style={[styles.title, { color: colors.foreground }]}>{t.fasting.title}</Text></View>
      </View>

      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.fasting.recipesToday}</Text>
          <Text style={[styles.listHint, { color: colors.mutedForeground }]}>{t.fasting.listHint}</Text>
        </View>
        <Text style={[styles.link, { color: colors.primary }]}>{recipes.length} {t.fasting.recipes}</Text>
      </View>

      <View
        testID="recipe-guidance"
        style={[
          styles.guidanceCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            flexDirection: language === 'ar' ? 'row-reverse' : 'row',
          },
        ]}
      >
        <Feather name="info" size={16} color={colors.primary} style={styles.guidanceIcon} />
        <Text
          testID="recipe-guidance-text"
          style={[
            styles.guidanceText,
            {
              color: colors.mutedForeground,
              textAlign: language === 'ar' ? 'right' : 'left',
              writingDirection: language === 'ar' ? 'rtl' : 'ltr',
            },
          ]}
        >
          {t.fasting.guidance}
        </Text>
      </View>

      {recipes.map((recipe) => {
        const copy = language === 'ar' ? recipe : recipe.translations[language];
        return (
          <Pressable
            key={recipe.id}
            testID={`recipe-card-${recipe.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${copy.title}. ${t.fasting.tapForDetails}`}
            onPress={() => setSelectedRecipe(recipe)}
            style={({ pressed }) => [
              styles.recipeCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <View style={[styles.recipeIcon, { backgroundColor: colors.secondary }]}><Feather name="coffee" size={20} color={colors.primary} /></View>
            <View style={styles.recipeBody}>
              <Text style={[styles.recipeTitle, { color: colors.foreground }]}>{copy.title}</Text>
              <Text style={[styles.recipeSubtitle, { color: colors.mutedForeground }]}>{copy.subtitle}</Text>
              <View style={styles.recipeMeta}>
                <Feather name="clock" size={12} color={colors.mutedForeground} />
                <Text style={[styles.recipeTime, { color: colors.mutedForeground }]}>{copy.time}</Text>
              </View>
            </View>
            <Feather name={language === 'ar' ? 'chevron-left' : 'chevron-right'} size={18} color={colors.mutedForeground} />
          </Pressable>
        );
      })}

      <Modal
        visible={selectedRecipe !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedRecipe(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {selectedRecipe && selectedCopy && (
              <>
                <View style={styles.modalHeader}>
                  <Pressable
                    onPress={() => setSelectedRecipe(null)}
                    accessibilityRole="button"
                    accessibilityLabel={t.fasting.closeDetails}
                    hitSlop={10}
                    style={[styles.closeButton, { backgroundColor: colors.secondary }]}
                  >
                    <Feather name="x" size={20} color={colors.foreground} />
                  </Pressable>
                  <View style={styles.modalTitleGroup}>
                    <Text style={[styles.modalTitle, { color: colors.foreground }]}>{selectedCopy.title}</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>{selectedCopy.subtitle} · {selectedCopy.time}</Text>
                  </View>
                </View>
                <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailHeading, { color: colors.foreground }]}>{t.fasting.ingredients}</Text>
                    {selectedCopy.ingredients.map((ingredient, index) => (
                      <View key={`${selectedRecipe.id}-ingredient-${index}`} style={styles.detailRow}>
                        <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
                        <Text style={[styles.detailText, { color: colors.mutedForeground }]}>{ingredient}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailHeading, { color: colors.foreground }]}>{t.fasting.preparation}</Text>
                    {selectedCopy.steps.map((step, index) => (
                      <View key={`${selectedRecipe.id}-step-${index}`} style={styles.stepRow}>
                        <View style={[styles.stepNumber, { backgroundColor: colors.secondary }]}>
                          <Text style={[styles.stepNumberText, { color: colors.primary }]}>{index + 1}</Text>
                        </View>
                        <Text style={[styles.detailText, styles.stepText, { color: colors.foreground }]}>{step}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 },
  topBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  topCopy: { flex: 1, alignItems: 'flex-end' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', marginTop: 4, textAlign: 'right' },
  heading: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  headingCopy: { flex: 1, alignItems: 'flex-end', gap: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  listHint: { fontSize: 11, textAlign: 'right', lineHeight: 17 },
  link: { fontSize: 12, fontWeight: '600' },
  guidanceCard: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'flex-start', gap: 10 },
  guidanceIcon: { paddingTop: 1 },
  guidanceText: { flex: 1, fontSize: 11, lineHeight: 18 },
  recipeCard: { minHeight: 82, borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  recipeIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  recipeBody: { flex: 1, alignItems: 'flex-end', gap: 4 },
  recipeTitle: { fontSize: 15, fontWeight: '700', textAlign: 'right' },
  recipeSubtitle: { fontSize: 11, textAlign: 'right' },
  recipeMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  recipeTime: { fontSize: 10 },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 24, backgroundColor: 'rgba(10, 17, 25, 0.68)' },
  modalCard: { width: '100%', maxWidth: 560, height: '82%', maxHeight: 680, borderWidth: 1, borderRadius: 24, padding: 18, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(100, 100, 100, 0.25)' },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  modalTitleGroup: { flex: 1, alignItems: 'flex-end', gap: 4 },
  modalTitle: { fontSize: 19, fontWeight: '800', textAlign: 'right' },
  modalSubtitle: { fontSize: 11, textAlign: 'right' },
  detailScroll: { flex: 1, marginTop: 12 },
  detailContent: { gap: 22, paddingBottom: 16 },
  detailSection: { gap: 12 },
  detailHeading: { fontSize: 16, fontWeight: '800', textAlign: 'right', marginBottom: 2 },
  detailRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  bullet: { width: 7, height: 7, borderRadius: 4 },
  detailText: { flex: 1, fontSize: 14, lineHeight: 23, textAlign: 'right' },
  stepRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  stepNumber: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontSize: 12, fontWeight: '800' },
  stepText: { paddingTop: 1 },
});