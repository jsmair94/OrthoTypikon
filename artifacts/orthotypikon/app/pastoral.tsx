import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListPrayerRequestsQueryKey,
  useCreatePrayerRequest,
  useDeletePrayerRequest,
  useListPrayerRequests,
  useReportPrayerRequest,
  type PrayerRequest,
  type PrayerRequestCreate,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { saintDays, SaintDay } from '@/data/saints';
import { ensurePrayerCommunitySession } from '@/lib/prayerCommunitySession';
import { usePreferences } from '@/hooks/usePreferences';

type NotificationsModule = typeof import('expo-notifications');
let notificationsModule: NotificationsModule | null = null;
const notificationsSupported =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

async function getNotificationsModule() {
  if (!notificationsSupported) return null;
  notificationsModule ??= await import('expo-notifications');
  return notificationsModule;
}

type PastoralTab = 'mine' | 'community' | 'names';
type SavedName = { id: string; person: string; saintId: string };
const NAMES_KEY = '@orthotypikon/name-days';
type PrayerCategory = NonNullable<PrayerRequest['category']>;
const categoryLabels: Record<PrayerCategory, string> = {
  sick: 'من أجل الشفاء',
  departed: 'من أجل راحة النفس',
  thanksgiving: 'صلاة شكر',
  other: 'نية صلاة',
};
const statusLabels: Record<PrayerRequest['status'], string> = {
  pending: 'قيد المراجعة الرعوية',
  approved: 'منشور في المجتمع',
  rejected: 'لم يُنشر',
  hidden: 'مخفي للمراجعة',
  removed: 'محذوف',
};
const pastoralCopy = {
  ar: { eyebrow: 'مجتمع آمن بإشراف رعوي', title: 'معًا في الصلاة', tabs: ['طلباتي', 'المجتمع', 'أعياد الأسماء'], offline: 'تعذر الاتصال بالخادم. أعد فتح الشاشة بعد استعادة الاتصال.', privacy: 'خصوصيتك أولًا', privacyText: 'لن يظهر أي طلب عام قبل المراجعة. يمكنك إخفاء الاسم أو التصنيف وحذف الطلب متى شئت.', placeholder: 'الاسم أو نية الصلاة', private: 'خاص بي فقط', community: 'مشاركة مع المجتمع', hiddenName: 'الاسم مخفي', shownName: 'إظهار الاسم', showCategory: 'إظهار التصنيف', hideCategory: 'إخفاء التصنيف', showDuration: 'إظهار المدة', hideDuration: 'المدة مخفية', days: 'أيام', consent: 'أوافق على إرسال الطلب وفق خيارات الخصوصية أعلاه وسياسة المراجعة الرعوية.', sending: 'جارٍ الإرسال…', send: 'إرسال طلب الصلاة', loadingMine: 'جارٍ تحميل طلباتك…', emptyMine: 'لا توجد طلبات مرسلة بعد.', share: 'مشاركة طلباتي خارج التطبيق', communityTitle: 'نحمل أثقال بعضنا بعضًا', communityText: 'يعرض هذا الموجز الطلبات العامة المعتمدة فقط. أبلغ عن أي محتوى يحتاج عناية رعوية.', loadingCommunity: 'جارٍ تحميل طلبات المجتمع…', emptyCommunity: 'لا توجد طلبات عامة معتمدة حاليًا.', namesTitle: 'لا تنسَ أن تفرح بأحبائك', namesText: 'أدخل الاسم واختر القديس الشفيع ليذكّرك التطبيق سنويًا.', namePlaceholder: 'اسم فرد العائلة أو الصديق', patron: 'القديس الشفيع · اضغط للتغيير', saveReminder: 'حفظ وتفعيل التذكير', disclaimer: 'أسماء الأعياد تبقى محلية على جهازك. التنبيه السنوي يحتاج هاتفًا حقيقيًا والسماح بالإشعارات.' },
  en: { eyebrow: 'A safe, pastorally moderated community', title: 'Together in prayer', tabs: ['My requests', 'Community', 'Name days'], offline: 'Unable to reach the server. Reopen this screen after your connection returns.', privacy: 'Your privacy first', privacyText: 'No public request appears before review. You can hide the name or category and delete your request anytime.', placeholder: 'Name or prayer intention', private: 'Only me', community: 'Share with community', hiddenName: 'Name hidden', shownName: 'Show name', showCategory: 'Show category', hideCategory: 'Hide category', showDuration: 'Show duration', hideDuration: 'Duration hidden', days: 'days', consent: 'I agree to send this request using the privacy choices above and the pastoral review policy.', sending: 'Sending…', send: 'Send prayer request', loadingMine: 'Loading your requests…', emptyMine: 'No requests sent yet.', share: 'Share my requests outside the app', communityTitle: 'Bear one another’s burdens', communityText: 'This feed shows approved public requests only. Report anything needing pastoral care.', loadingCommunity: 'Loading community requests…', emptyCommunity: 'No approved public requests right now.', namesTitle: 'Remember to celebrate your loved ones', namesText: 'Enter a name and choose a patron saint for an annual reminder.', namePlaceholder: 'Family member or friend', patron: 'Patron saint · tap to change', saveReminder: 'Save and enable reminder', disclaimer: 'Name days stay on your device. Annual reminders need a real phone and notification permission.' },
  el: { eyebrow: 'Ασφαλής κοινότητα με ποιμαντική εποπτεία', title: 'Μαζί στην προσευχή', tabs: ['Τα αιτήματά μου', 'Κοινότητα', 'Ονομαστικές εορτές'], offline: 'Δεν είναι δυνατή η σύνδεση. Ανοίξτε ξανά την οθόνη όταν επανέλθει η σύνδεση.', privacy: 'Πρώτα η ιδιωτικότητά σας', privacyText: 'Κανένα δημόσιο αίτημα δεν εμφανίζεται πριν τον έλεγχο. Μπορείτε να κρύψετε όνομα ή κατηγορία και να το διαγράψετε.', placeholder: 'Όνομα ή πρόθεση προσευχής', private: 'Μόνο εγώ', community: 'Κοινοποίηση στην κοινότητα', hiddenName: 'Κρυφό όνομα', shownName: 'Εμφάνιση ονόματος', showCategory: 'Εμφάνιση κατηγορίας', hideCategory: 'Απόκρυψη κατηγορίας', showDuration: 'Εμφάνιση διάρκειας', hideDuration: 'Κρυφή διάρκεια', days: 'ημέρες', consent: 'Συμφωνώ με τις επιλογές ιδιωτικότητας και την ποιμαντική αναθεώρηση.', sending: 'Αποστολή…', send: 'Αποστολή αιτήματος', loadingMine: 'Φόρτωση αιτημάτων…', emptyMine: 'Δεν υπάρχουν ακόμη αιτήματα.', share: 'Κοινοποίηση εκτός εφαρμογής', communityTitle: 'Βαστάζετε τα βάρη αλλήλων', communityText: 'Εμφανίζονται μόνο εγκεκριμένα δημόσια αιτήματα. Αναφέρετε περιεχόμενο που χρειάζεται φροντίδα.', loadingCommunity: 'Φόρτωση κοινοτικών αιτημάτων…', emptyCommunity: 'Δεν υπάρχουν εγκεκριμένα δημόσια αιτήματα.', namesTitle: 'Μην ξεχνάτε να χαίρεστε με τους αγαπημένους σας', namesText: 'Εισαγάγετε όνομα και επιλέξτε προστάτη Άγιο για ετήσια υπενθύμιση.', namePlaceholder: 'Μέλος οικογένειας ή φίλος', patron: 'Προστάτης Άγιος · πατήστε για αλλαγή', saveReminder: 'Αποθήκευση υπενθύμισης', disclaimer: 'Οι εορτές ονομάτων μένουν στη συσκευή. Οι υπενθυμίσεις χρειάζονται πραγματικό τηλέφωνο και άδεια ειδοποιήσεων.' },
} as const;

export default function PastoralScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { language } = usePreferences();
  const p = pastoralCopy[language];
  const localizedCategories: Record<PrayerCategory, string> = language === 'ar' ? categoryLabels : language === 'en'
    ? { sick: 'For healing', departed: 'For the departed', thanksgiving: 'Thanksgiving', other: 'Prayer intention' }
    : { sick: 'Για θεραπεία', departed: 'Για τους κεκοιμημένους', thanksgiving: 'Ευχαριστία', other: 'Πρόθεση προσευχής' };
  const localizedStatuses: Record<PrayerRequest['status'], string> = language === 'ar' ? statusLabels : language === 'en'
    ? { pending: 'Pastoral review pending', approved: 'Published', rejected: 'Not published', hidden: 'Hidden for review', removed: 'Deleted' }
    : { pending: 'Αναμονή ποιμαντικού ελέγχου', approved: 'Δημοσιεύτηκε', rejected: 'Δεν δημοσιεύτηκε', hidden: 'Κρυφό για έλεγχο', removed: 'Διαγράφηκε' };
  const [tab, setTab] = useState<PastoralTab>('mine');
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [personName, setPersonName] = useState('');
  const [category, setCategory] = useState<PrayerRequestCreate['category']>('sick');
  const [visibility, setVisibility] = useState<PrayerRequestCreate['visibility']>('private');
  const [nameVisibility, setNameVisibility] = useState<PrayerRequestCreate['nameVisibility']>('anonymous');
  const [showCategory, setShowCategory] = useState(true);
  const [showDuration, setShowDuration] = useState(false);
  const [durationDays, setDurationDays] = useState<PrayerRequestCreate['durationDays']>(7);
  const [consent, setConsent] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [selectedSaint, setSelectedSaint] = useState<SaintDay>(saintDays[0]);
  const [names, setNames] = useState<SavedName[]>([]);
  const [notificationGranted, setNotificationGranted] = useState(false);

  useEffect(() => {
    ensurePrayerCommunitySession().then(() => setSessionReady(true)).catch(() => setSessionError(true));
    AsyncStorage.getItem(NAMES_KEY).then((saved) => { if (saved) setNames(JSON.parse(saved) as SavedName[]); });
    if (notificationsSupported) {
      getNotificationsModule().then((notifications) => {
        notifications?.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      });
    }
  }, []);

  const mineParams = { scope: 'mine' as const };
  const communityParams = { scope: 'community' as const };
  const mineQuery = useListPrayerRequests(mineParams, { query: { enabled: sessionReady, queryKey: getListPrayerRequestsQueryKey(mineParams) } });
  const communityQuery = useListPrayerRequests(communityParams, { query: { enabled: sessionReady, queryKey: getListPrayerRequestsQueryKey(communityParams) } });
  const createMutation = useCreatePrayerRequest();
  const deleteMutation = useDeletePrayerRequest();
  const reportMutation = useReportPrayerRequest();

  const refreshRequests = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListPrayerRequestsQueryKey({ scope: 'mine' }) }),
      queryClient.invalidateQueries({ queryKey: getListPrayerRequestsQueryKey({ scope: 'community' }) }),
    ]);
  };

  const submitRequest = async () => {
    const name = personName.trim();
    if (!name || !consent || !sessionReady) {
      Alert.alert('قبل الإرسال', !name ? 'أدخل الاسم أو النية التي تريد الصلاة من أجلها.' : !consent ? 'يلزم تأكيد الموافقة قبل إرسال الطلب.' : 'تعذر الاتصال بمجتمع الصلاة.');
      return;
    }
    try {
      await createMutation.mutateAsync({ data: { name, category, visibility, nameVisibility, showCategory, showDuration, durationDays, consent: true } });
      setPersonName('');
      setConsent(false);
      await refreshRequests();
      Alert.alert('تم استلام الطلب', visibility === 'community' ? 'سيظهر في المجتمع بعد المراجعة الرعوية.' : 'حُفظ كطلب خاص ولن يظهر للمجتمع.');
    } catch {
      Alert.alert('تعذر الإرسال', 'تحقق من الاتصال وحاول مرة أخرى.');
    }
  };

  const removeRequest = (request: PrayerRequest) => {
    Alert.alert('حذف الطلب', 'سيُزال الطلب نهائيًا من قوائمك ومن المجتمع.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => { await deleteMutation.mutateAsync({ requestId: request.id }); await refreshRequests(); } },
    ]);
  };

  const reportRequest = (request: PrayerRequest) => {
    Alert.alert('الإبلاغ عن الطلب', 'سيُرسل إلى فريق الإشراف الرعوي للمراجعة.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'إبلاغ', style: 'destructive', onPress: async () => {
        try {
          await reportMutation.mutateAsync({ requestId: request.id, data: { reason: 'محتوى غير مناسب لمجتمع الصلاة' } });
          Alert.alert('شكرًا لك', 'وصل البلاغ إلى فريق الإشراف.');
        } catch {
          Alert.alert('تعذر الإبلاغ', 'ربما أُزيل الطلب بالفعل. حاول التحديث لاحقًا.');
        }
      } },
    ]);
  };

  const shareRequests = async () => {
    const requests = mineQuery.data?.requests.filter((request) => request.status !== 'removed') ?? [];
    const text = requests.length ? requests.map((request) => `${request.category ? localizedCategories[request.category] : p.placeholder}: ${request.name}`).join('\n') : p.emptyMine;
    await Share.share({ message: `طلب صلاة من OrthoTypikon\n${text}` });
  };

  const enableNotifications = async () => {
    if (!notificationsSupported) {
      Alert.alert('التنبيهات', 'تنبيهات أعياد الأسماء تعمل على الهاتف الحقيقي.');
      return false;
    }
    const notifications = await getNotificationsModule();
    if (!notifications) return false;
    const permission = await notifications.requestPermissionsAsync();
    setNotificationGranted(permission.granted);
    return permission.granted;
  };

  const addNameDay = async () => {
    const trimmed = familyName.trim();
    if (!trimmed) return;
    const granted = notificationGranted || await enableNotifications();
    const next = [...names, { id: Date.now().toString(), person: trimmed, saintId: selectedSaint.id }];
    setNames(next);
    setFamilyName('');
    await AsyncStorage.setItem(NAMES_KEY, JSON.stringify(next));
    if (granted) {
      const notifications = await getNotificationsModule();
      if (!notifications) return;
      await notifications.scheduleNotificationAsync({
        content: { title: `عيد اسم مبارك لـ ${trimmed}`, body: `اليوم نحتفل بـ ${selectedSaint.name}. كل عام وأنتم بخير.` },
        trigger: { type: notifications.SchedulableTriggerInputTypes.CALENDAR, month: selectedSaint.month, day: selectedSaint.day, hour: 9, minute: 0, repeats: true },
      });
    }
  };

  const saintIndex = saintDays.findIndex((saint) => saint.id === selectedSaint.id);
  const nextSaint = () => setSelectedSaint(saintDays[(saintIndex + 1) % saintDays.length]);
  const cycleDuration = () => setDurationDays(durationDays === 7 ? 30 : durationDays === 30 ? 90 : 7);
  const mine = mineQuery.data?.requests.filter((request) => request.status !== 'removed') ?? [];
  const community = communityQuery.data?.requests ?? [];

  const RequestCard = ({ request, mine: isMine }: { request: PrayerRequest; mine: boolean }) => (
    <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.itemIcon, { backgroundColor: colors.background }]}><Feather name={request.category === 'departed' ? 'moon' : 'heart'} size={18} color={colors.primary} /></View>
      <View style={styles.itemCopy}>
        <Text style={[styles.itemTitle, { color: colors.foreground }]}>{request.name}</Text>
        <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>{request.category ? localizedCategories[request.category] : p.placeholder}{request.durationDays ? ` · ${request.durationDays} ${p.days}` : ''}{isMine ? ` · ${request.visibility === 'private' ? p.private : localizedStatuses[request.status]}` : ''}</Text>
      </View>
      <Pressable testID={isMine ? `delete-request-${request.id}` : `report-request-${request.id}`} onPress={() => isMine ? removeRequest(request) : reportRequest(request)} hitSlop={8}>
        <Feather name={isMine ? 'trash-2' : 'flag'} size={17} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}><Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]} hitSlop={10}><Feather name="arrow-right" size={20} color={colors.primary} /></Pressable><View style={styles.topCopy}><Text style={[styles.eyebrow, { color: colors.primary }]}>{p.eyebrow}</Text><Text style={[styles.title, { color: colors.foreground }]}>{p.title}</Text></View></View>
      <View style={[styles.tabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {([['mine', 'heart'], ['community', 'users'], ['names', 'gift']] as const).map(([value, icon], index) => <Pressable key={value} testID={`pastoral-${value}`} onPress={() => setTab(value)} style={[styles.tab, tab === value && { backgroundColor: colors.primary }]}><Feather name={icon} size={16} color={tab === value ? colors.primaryForeground : colors.mutedForeground} /><Text style={[styles.tabText, { color: tab === value ? colors.primaryForeground : colors.mutedForeground }]}>{p.tabs[index]}</Text></Pressable>)}
      </View>

      {sessionError && tab !== 'names' ? <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="wifi-off" size={17} color={colors.primary} /><Text style={[styles.noticeText, { color: colors.foreground }]}>{p.offline}</Text></View> : null}

      {tab === 'mine' ? <View style={styles.contentBlock}>
        <View style={[styles.intro, { backgroundColor: colors.primary }]}><Feather name="shield" size={22} color={colors.accent} /><Text style={[styles.introTitle, { color: colors.primaryForeground }]}>{p.privacy}</Text><Text style={[styles.introText, { color: colors.primaryForeground }]}>{p.privacyText}</Text></View>
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput testID="prayer-request-name" value={personName} onChangeText={setPersonName} placeholder={p.placeholder} placeholderTextColor={colors.mutedForeground} maxLength={100} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />
          <View style={styles.choiceRow}>{(['sick', 'departed', 'thanksgiving'] as const).map((value) => <Pressable key={value} onPress={() => setCategory(value)} style={[styles.choice, { borderColor: colors.border, backgroundColor: category === value ? colors.primary : 'transparent' }]}><Text style={[styles.choiceText, { color: category === value ? colors.primaryForeground : colors.foreground }]}>{localizedCategories[value]}</Text></Pressable>)}</View>
          <View style={styles.choiceRow}><Pressable testID="visibility-private" onPress={() => setVisibility('private')} style={[styles.choice, { borderColor: colors.border, backgroundColor: visibility === 'private' ? colors.primary : 'transparent' }]}><Text style={[styles.choiceText, { color: visibility === 'private' ? colors.primaryForeground : colors.foreground }]}>{p.private}</Text></Pressable><Pressable testID="visibility-community" onPress={() => setVisibility('community')} style={[styles.choice, { borderColor: colors.border, backgroundColor: visibility === 'community' ? colors.primary : 'transparent' }]}><Text style={[styles.choiceText, { color: visibility === 'community' ? colors.primaryForeground : colors.foreground }]}>{p.community}</Text></Pressable></View>
          <View style={styles.settingRow}><Pressable onPress={() => setNameVisibility(nameVisibility === 'named' ? 'anonymous' : 'named')} style={[styles.settingChip, { borderColor: colors.border }]}><Feather name={nameVisibility === 'anonymous' ? 'eye-off' : 'eye'} size={14} color={colors.primary} /><Text style={[styles.settingText, { color: colors.foreground }]}>{nameVisibility === 'anonymous' ? p.hiddenName : p.shownName}</Text></Pressable><Pressable onPress={() => setShowCategory(!showCategory)} style={[styles.settingChip, { borderColor: colors.border }]}><Feather name={showCategory ? 'tag' : 'slash'} size={14} color={colors.primary} /><Text style={[styles.settingText, { color: colors.foreground }]}>{showCategory ? p.showCategory : p.hideCategory}</Text></Pressable></View>
          <View style={styles.settingRow}><Pressable onPress={cycleDuration} style={[styles.settingChip, { borderColor: colors.border }]}><Feather name="clock" size={14} color={colors.primary} /><Text style={[styles.settingText, { color: colors.foreground }]}>{durationDays} {p.days}</Text></Pressable><Pressable testID="show-duration" onPress={() => setShowDuration(!showDuration)} style={[styles.settingChip, { borderColor: colors.border }]}><Feather name={showDuration ? 'eye' : 'eye-off'} size={14} color={colors.primary} /><Text style={[styles.settingText, { color: colors.foreground }]}>{showDuration ? p.showDuration : p.hideDuration}</Text></Pressable></View>
          <Pressable testID="prayer-consent" onPress={() => setConsent(!consent)} style={styles.consentRow}><Feather name={consent ? 'check-square' : 'square'} size={20} color={consent ? colors.accent : colors.mutedForeground} /><Text style={[styles.consentText, { color: colors.foreground }]}>{p.consent}</Text></Pressable>
          <Pressable testID="add-prayer-request" disabled={createMutation.isPending || !sessionReady} onPress={submitRequest} style={[styles.primaryButton, { backgroundColor: colors.accent, opacity: createMutation.isPending || !sessionReady ? 0.6 : 1 }]}><Text style={[styles.primaryButtonText, { color: colors.primary }]}>{createMutation.isPending ? p.sending : p.send}</Text></Pressable>
        </View>
        {mineQuery.isLoading ? <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{p.loadingMine}</Text> : mine.length ? mine.map((request) => <RequestCard key={request.id} request={request} mine />) : <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{p.emptyMine}</Text>}
        <Pressable onPress={shareRequests} style={[styles.shareButton, { borderColor: colors.border }]}><Feather name="share-2" size={16} color={colors.primary} /><Text style={[styles.shareText, { color: colors.primary }]}>{p.share}</Text></Pressable>
      </View> : tab === 'community' ? <View style={styles.contentBlock}>
        <View style={[styles.intro, { backgroundColor: colors.primary }]}><Feather name="users" size={22} color={colors.accent} /><Text style={[styles.introTitle, { color: colors.primaryForeground }]}>{p.communityTitle}</Text><Text style={[styles.introText, { color: colors.primaryForeground }]}>{p.communityText}</Text></View>
        {communityQuery.isLoading ? <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{p.loadingCommunity}</Text> : community.length ? community.map((request) => <RequestCard key={request.id} request={request} mine={false} />) : <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{p.emptyCommunity}</Text>}
      </View> : <View style={styles.contentBlock}>
        <View style={[styles.intro, { backgroundColor: colors.primary }]}><Feather name="gift" size={22} color={colors.accent} /><Text style={[styles.introTitle, { color: colors.primaryForeground }]}>{p.namesTitle}</Text><Text style={[styles.introText, { color: colors.primaryForeground }]}>{p.namesText}</Text></View>
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}><TextInput testID="name-day-person" value={familyName} onChangeText={setFamilyName} placeholder={p.namePlaceholder} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} /><Pressable onPress={nextSaint} style={[styles.saintPicker, { borderColor: colors.border }]}><Feather name="refresh-cw" size={15} color={colors.primary} /><View style={styles.saintPickerCopy}><Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>{p.patron}</Text><Text style={[styles.pickerValue, { color: colors.foreground }]}>{selectedSaint.name} · {selectedSaint.date}</Text></View></Pressable><Pressable testID="add-name-day" onPress={addNameDay} style={[styles.primaryButton, { backgroundColor: colors.accent }]}><Text style={[styles.primaryButtonText, { color: colors.primary }]}>{p.saveReminder}</Text></Pressable></View>
        {names.map((name) => { const saint = saintDays.find((item) => item.id === name.saintId) ?? saintDays[0]; return <View key={name.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.itemIcon, { backgroundColor: colors.background }]}><Feather name="gift" size={18} color={colors.primary} /></View><View style={styles.itemCopy}><Text style={[styles.itemTitle, { color: colors.foreground }]}>{name.person}</Text><Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>{saint.name} · {saint.date}</Text></View></View>; })}
        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>{p.disclaimer}</Text>
      </View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 }, topBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }, topCopy: { flex: 1, alignItems: 'flex-end' }, backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, eyebrow: { fontSize: 12, fontWeight: '600' }, title: { fontSize: 28, fontWeight: '700', marginTop: 4 }, tabs: { borderWidth: 1, borderRadius: 16, padding: 5, flexDirection: 'row-reverse', gap: 5 }, tab: { flex: 1, minHeight: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 5 }, tabText: { fontSize: 11, fontWeight: '600' }, contentBlock: { gap: 14 }, intro: { borderRadius: 22, padding: 20, alignItems: 'flex-end', gap: 8 }, introTitle: { fontSize: 19, fontWeight: '700', textAlign: 'right' }, introText: { opacity: 0.82, fontSize: 12, lineHeight: 20, textAlign: 'right' }, formCard: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 }, input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, textAlign: 'right', fontSize: 13 }, choiceRow: { flexDirection: 'row-reverse', gap: 7 }, choice: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, choiceText: { fontSize: 10, textAlign: 'center' }, settingRow: { flexDirection: 'row-reverse', gap: 7 }, settingChip: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center', gap: 3 }, settingText: { fontSize: 9, fontWeight: '600' }, consentRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 9 }, consentText: { flex: 1, fontSize: 11, lineHeight: 18, textAlign: 'right' }, primaryButton: { minHeight: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, primaryButtonText: { fontSize: 13, fontWeight: '700' }, itemCard: { borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 }, itemIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, itemCopy: { flex: 1, alignItems: 'flex-end', gap: 3 }, itemTitle: { fontSize: 14, fontWeight: '700', textAlign: 'right' }, itemMeta: { fontSize: 10, textAlign: 'right' }, shareButton: { minHeight: 48, borderWidth: 1, borderRadius: 13, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 }, shareText: { fontSize: 12, fontWeight: '700' }, saintPicker: { minHeight: 60, borderWidth: 1, borderRadius: 12, padding: 11, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }, saintPickerCopy: { flex: 1, alignItems: 'flex-end', gap: 4 }, pickerLabel: { fontSize: 10 }, pickerValue: { fontSize: 12, fontWeight: '700', textAlign: 'right' }, disclaimer: { fontSize: 11, lineHeight: 18, textAlign: 'center' }, emptyText: { textAlign: 'center', fontSize: 12, lineHeight: 20, paddingVertical: 14 }, notice: { borderWidth: 1, borderRadius: 14, padding: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 9 }, noticeText: { flex: 1, textAlign: 'right', fontSize: 11, lineHeight: 18 },
});