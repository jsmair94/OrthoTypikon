import * as Speech from 'expo-speech';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { currentSaint } from '@/data/saints';
import { useI18n } from '@/hooks/usePreferences';

type LearningTab = 'audio' | 'icon' | 'dictionary';

const terms = [
  { term: 'أناثيما', greek: 'Ανάθεμα', pronunciation: 'أناثيما', definition: 'إعلان انفصال كنسي رسمي عن شركة الإيمان، وهو مصطلح تاريخي جاد لا يعني مجرد اللعن في الاستعمال اليومي.' },
  { term: 'تروبارية', greek: 'Τροπάριον', pronunciation: 'تروبارِيُون', definition: 'ترنيمة قصيرة تلخّص معنى العيد أو تذكار القديس وتُرتّل في صلوات الكنيسة.' },
  { term: 'أنتيفونا', greek: 'Ἀντίφωνον', pronunciation: 'أنتيفُون', definition: 'مزمور أو ترنيمة تُرتّل بالتناوب بين جوقتين، وتُستخدم في الليتورجيا الإلهية.' },
  { term: 'السنكسار', greek: 'Συναξάριον', pronunciation: 'سينَكساريون', definition: 'كتاب يجمع سير القديسين وقراءات أعياد السنة الكنسية بحسب الأيام.' },
  { term: 'ليتورجيا', greek: 'Λειτουργία', pronunciation: 'ليتورغيا', definition: 'الخدمة العامة أو عمل الشعب، وتُستخدم للدلالة على خدمة القداس الإلهي.' },
];

export default function LearnScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, language } = useI18n();
  const saintText = language === 'ar' ? currentSaint : language === 'en'
    ? { ...currentSaint, name: 'Saint Mary of Egypt', shortBio: 'A saint of repentance and hope', audioText: 'Today we remember Saint Mary of Egypt, whose life became a profound journey from distance to repentance, prayer, and hope in God’s mercy.' }
    : { ...currentSaint, name: 'Οσία Μαρία η Αιγυπτία', shortBio: 'Αγία της μετάνοιας και της ελπίδας', audioText: 'Σήμερα θυμόμαστε την Οσία Μαρία την Αιγυπτία, της οποίας η ζωή έγινε βαθιά πορεία μετάνοιας, προσευχής και ελπίδας στο έλεος του Θεού.' };
  const [tab, setTab] = useState<LearningTab>('audio');
  const [speaking, setSpeaking] = useState(false);
  const [playedOnce, setPlayedOnce] = useState(false);
  const [query, setQuery] = useState('');
  const [openTerm, setOpenTerm] = useState<string | null>(null);
  const [iconOpen, setIconOpen] = useState(false);

  const filteredTerms = useMemo(() => terms.filter((item) => `${item.term} ${item.greek}`.includes(query.trim())), [query]);

  const toggleSpeech = async () => {
    if (speaking) {
      await Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    setPlayedOnce(true);
    Speech.speak(saintText.audioText, { language: language === 'ar' ? 'ar-SA' : language === 'el' ? 'el-GR' : 'en-US', rate: 0.92, onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false) });
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
       <View style={styles.topBar}><Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]} hitSlop={10}><Feather name="arrow-right" size={20} color={colors.primary} /></Pressable><View style={styles.topCopy}><Text style={[styles.eyebrow, { color: colors.primary }]}>{t.learn.eyebrow}</Text><Text style={[styles.title, { color: colors.foreground }]}>{t.learn.title}</Text></View></View>
      <View style={[styles.tabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
         {([['audio', t.learn.audioTab, 'volume-2'], ['icon', t.learn.iconTab, 'image'], ['dictionary', t.learn.dictionaryTab, 'book-open']] as const).map(([id, label, icon]) => <Pressable key={id} testID={`learn-tab-${id}`} onPress={() => setTab(id)} style={[styles.tab, tab === id && { backgroundColor: colors.primary }]}><Feather name={icon} size={16} color={tab === id ? colors.primaryForeground : colors.mutedForeground} /><Text style={[styles.tabText, { color: tab === id ? colors.primaryForeground : colors.mutedForeground }]}>{label}</Text></Pressable>)}
      </View>

      {tab === 'audio' && <View style={styles.contentBlock}>
         <View style={[styles.heroCard, { backgroundColor: colors.primary }]}><View style={styles.heroIcon}><Feather name="headphones" size={22} color={colors.accent} /></View><Text style={styles.heroEyebrow}>{t.learn.saintAudio}</Text><Text style={styles.heroTitle}>{saintText.name}</Text><Text style={styles.heroDescription}>{saintText.shortBio}</Text></View>
         <View style={[styles.audioCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.audioRow}><Pressable testID="audio-toggle" onPress={toggleSpeech} style={[styles.playButton, { backgroundColor: colors.accent }]}><Feather name={speaking ? 'square' : 'play'} size={20} color={colors.primary} /></Pressable><View style={styles.audioCopy}><Text style={[styles.audioTitle, { color: colors.foreground }]}>{speaking ? t.learn.stop : playedOnce ? t.learn.replay : t.learn.listen}</Text><Text style={[styles.audioSubtitle, { color: colors.mutedForeground }]}>{playedOnce && !speaking ? t.learn.completedAudio : t.learn.audioHint}</Text></View></View><Text style={[styles.audioText, { color: colors.foreground }]}>{saintText.audioText}</Text></View>
      </View>}

      {tab === 'icon' && <View style={styles.contentBlock}>
         <View style={[styles.iconCard, { backgroundColor: colors.primary }]}><View style={styles.iconArtwork}><Feather name="star" size={40} color={colors.accent} /></View><Text style={styles.iconLabel}>{t.learn.todayIcon}</Text><Text style={styles.iconTitle}>{t.learn.iconTitle}</Text><Text style={styles.iconCaption}>{t.learn.iconCaption}</Text></View>
         <Pressable testID="icon-explanation" onPress={() => setIconOpen((value) => !value)} style={[styles.expandCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.expandHeader}><Feather name={iconOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} /><Text style={[styles.expandTitle, { color: colors.foreground }]}>{t.learn.iconQuestion}</Text></View>{iconOpen && <Text style={[styles.expandText, { color: colors.mutedForeground }]}>يرمز اللون الذهبي إلى النور الإلهي الذي لا يغيب، بينما تشير النجمة الثلاثية على ثوب والدة الإله إلى بتوليتها قبل الميلاد وفيه وبعده.</Text>}</Pressable>
      </View>}

      {tab === 'dictionary' && <View style={styles.contentBlock}>
         <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="search" size={17} color={colors.mutedForeground} /><TextInput value={query} onChangeText={setQuery} placeholder={t.learn.search} placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} /></View>
        {filteredTerms.map((item) => <Pressable key={item.term} onPress={() => setOpenTerm(openTerm === item.term ? null : item.term)} style={[styles.termCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.termHeader}><Feather name={openTerm === item.term ? 'chevron-up' : 'chevron-down'} size={17} color={colors.primary} /><View style={styles.termNames}><Text style={[styles.term, { color: colors.foreground }]}>{item.term}</Text><Text style={[styles.greek, { color: colors.accent }]}>{item.greek} · {item.pronunciation}</Text></View></View>{openTerm === item.term && <Text style={[styles.definition, { color: colors.mutedForeground }]}>{item.definition}</Text>}</Pressable>)}
         {!filteredTerms.length && <Text style={[styles.empty, { color: colors.mutedForeground }]}>{t.learn.noTerm}</Text>}
      </View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 }, topBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }, topCopy: { flex: 1, alignItems: 'flex-end' }, backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, eyebrow: { fontSize: 12, fontWeight: '600' }, title: { fontSize: 28, fontWeight: '700', marginTop: 4 }, tabs: { borderWidth: 1, borderRadius: 16, padding: 5, flexDirection: 'row-reverse', gap: 5 }, tab: { flex: 1, minHeight: 66, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 4 }, tabText: { fontSize: 10, fontWeight: '600', textAlign: 'center' }, contentBlock: { gap: 14 }, heroCard: { borderRadius: 23, padding: 21, alignItems: 'flex-end', gap: 8 }, heroIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(228,185,103,0.18)', alignItems: 'center', justifyContent: 'center' }, heroEyebrow: { color: '#D9E0E3', fontSize: 11, marginTop: 3 }, heroTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', textAlign: 'right' }, heroDescription: { color: '#D9E0E3', fontSize: 13, lineHeight: 20, textAlign: 'right' }, audioCard: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 16 }, audioRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }, playButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, audioCopy: { flex: 1, alignItems: 'flex-end', gap: 4 }, audioTitle: { fontSize: 15, fontWeight: '700', textAlign: 'right' }, audioSubtitle: { fontSize: 11, textAlign: 'right' }, audioText: { fontSize: 14, lineHeight: 25, textAlign: 'right' }, iconCard: { borderRadius: 23, padding: 22, alignItems: 'center', gap: 8 }, iconArtwork: { width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(228,185,103,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(228,185,103,0.6)' }, iconLabel: { color: '#D9E0E3', fontSize: 11, marginTop: 6 }, iconTitle: { color: '#FFF', fontSize: 19, fontWeight: '700', textAlign: 'center' }, iconCaption: { color: '#D9E0E3', fontSize: 12 }, expandCard: { borderWidth: 1, borderRadius: 18, padding: 17, gap: 13 }, expandHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }, expandTitle: { flex: 1, fontSize: 15, fontWeight: '700', textAlign: 'right' }, expandText: { fontSize: 13, lineHeight: 23, textAlign: 'right' }, search: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }, searchInput: { flex: 1, textAlign: 'right', fontSize: 13, padding: 0 }, termCard: { borderWidth: 1, borderRadius: 17, padding: 16, gap: 12 }, termHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }, termNames: { flex: 1, alignItems: 'flex-end' }, term: { fontSize: 16, fontWeight: '700', textAlign: 'right' }, greek: { fontSize: 11, marginTop: 4, textAlign: 'right' }, definition: { fontSize: 13, lineHeight: 21, textAlign: 'right' }, empty: { textAlign: 'right', fontSize: 13, padding: 12 },
});