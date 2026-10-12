import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { getCalendarEntriesForType, shiftDateKey } from '@/data/calendar2026';
import { getAnnualReminderDate, getNameDayChoices, getSavedNameChoice, NameDayChoice, SavedName } from '@/data/nameDays';
import { useI18n, usePreferences } from '@/hooks/usePreferences';

type NotificationsModule = typeof import('expo-notifications');
let notificationsModule: NotificationsModule | null = null;
const notificationsSupported =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

async function getNotificationsModule() {
  if (!notificationsSupported) return null;
  notificationsModule ??= await import('expo-notifications');
  return notificationsModule;
}

const NAMES_KEY = '@orthotypikon/name-days';

function getNameDayNotificationContent(name: SavedName, observance: NameDayChoice) {
  return {
    title: `عيد اسم مبارك لـ ${name.person}`,
    body: `اليوم نحتفل بـ ${observance.name}. كل عام وأنتم بخير.`,
    data: { nameDayId: name.id },
  };
}

async function getScheduledNameDayNotificationIds(
  notifications: NotificationsModule,
  name: SavedName,
) {
  const content = getNameDayNotificationContent(name, getSavedNameChoice(name));
  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  return scheduled
    .filter((request) => {
      if (request.identifier === name.notificationId) return true;
      if (request.content.data?.nameDayId === name.id) return true;
      return request.content.data?.nameDayId == null
        && request.content.title === content.title
        && request.content.body === content.body;
    })
    .map((request) => request.identifier);
}

async function scheduleNameDayNotification(
  notifications: NotificationsModule,
  name: SavedName,
  observance: NameDayChoice,
) {
  return notifications.scheduleNotificationAsync({
    content: getNameDayNotificationContent(name, observance),
    trigger: {
      type: notifications.SchedulableTriggerInputTypes.CALENDAR,
      ...getAnnualReminderDate(observance),
      hour: 9,
      minute: 0,
      repeats: true,
    },
  });
}

const pastoralCopy = {
  ar: {
    eyebrow: 'تذكيرات عائلية', title: 'أعياد الأسماء',
    namesTitle: 'لا تنسَ أن تفرح بأحبائك', namesText: 'أدخل الاسم واختر القديس أو المناسبة من الرزنامة ليذكّرك التطبيق سنويًا.',
    namePlaceholder: 'اسم فرد العائلة أو الصديق', patron: 'القديس أو المناسبة · اختر من الرزنامة',
    chooseFromCalendar: 'اضغط لاختيار شفيع من تحب من الرزنامة الكنسية', pickerTitle: 'اختر من الرزنامة',
    pickerSubtitle: 'حدّد التاريخ ثم اختر القديس أو المناسبة', selectedDate: 'التاريخ المحدد',
    feast: 'المناسبة', saint: 'القديس', noObservances: 'لا توجد مناسبة أو أسماء مسجلة لهذا التاريخ.',
    closePicker: 'إغلاق الرزنامة', previousMonth: 'الشهر السابق', nextMonth: 'الشهر التالي',
    saveReminder: 'حفظ وتفعيل التذكير', nameRequired: 'أدخل الاسم أولًا.',
    choiceRequired: 'اختر قديسًا أو مناسبة من الرزنامة أولًا.',
    updateReminder: 'حفظ التعديلات', editReminder: 'تعديل التذكير', deleteReminder: 'حذف التذكير',
    cancelEdit: 'إلغاء التعديل', cancel: 'إلغاء', deleteReminderTitle: 'حذف تذكير عيد الاسم؟',
    deleteReminderMessage: 'سيُحذف التذكير السنوي لـ {name} وتُلغى إشعاراته.',
    deleteReminderConfirm: 'حذف', deleting: 'جارٍ الحذف…', saveFailed: 'تعذّر حفظ التغيير. حاول مرة أخرى.',
    notificationUpdateFailed: 'تعذّر تحديث الإشعار، لذلك لم تُحفظ التعديلات.',
    notificationCancelWarning: 'حُذف التذكير، لكن تعذّر إلغاء التنبيه المجدول.',
    notificationScheduleFailed: 'تعذّر تفعيل الإشعار. بقي الاسم محفوظًا دون تنبيه.',
    disclaimer: 'تبقى الأسماء على جهازك. يحتاج التنبيه السنوي إلى هاتف حقيقي والسماح بالإشعارات.',
    notifications: 'التنبيهات', phoneOnly: 'تعمل تنبيهات أعياد الأسماء على الهاتف الحقيقي.',
  },
  en: {
    eyebrow: 'PERSONAL REMINDERS', title: 'Name days',
    namesTitle: 'Remember to celebrate your loved ones', namesText: 'Enter a name, then choose a saint or feast from the calendar for an annual reminder.',
    namePlaceholder: 'Family member or friend', patron: 'Saint or feast · choose from calendar',
    chooseFromCalendar: 'Tap to choose the patron saint of someone you love from the church calendar', pickerTitle: 'Choose from the calendar',
    pickerSubtitle: 'Select a date, then choose its saint or feast', selectedDate: 'Selected date',
    feast: 'Feast', saint: 'Saint', noObservances: 'No feast or commemorated names are recorded for this date.',
    closePicker: 'Close calendar', previousMonth: 'Previous month', nextMonth: 'Next month',
    saveReminder: 'Save and enable reminder', nameRequired: 'Enter a name first.',
    choiceRequired: 'Choose a saint or feast from the calendar first.',
    updateReminder: 'Save changes', editReminder: 'Edit reminder', deleteReminder: 'Delete reminder',
    cancelEdit: 'Cancel editing', cancel: 'Cancel', deleteReminderTitle: 'Delete name-day reminder?',
    deleteReminderMessage: 'This will remove the annual reminder for {name} and cancel its notification.',
    deleteReminderConfirm: 'Delete', deleting: 'Deleting…', saveFailed: 'Could not save this change. Please try again.',
    notificationUpdateFailed: 'The notification could not be updated, so no changes were saved.',
    notificationCancelWarning: 'The reminder was deleted, but its scheduled alert could not be cancelled.',
    notificationScheduleFailed: 'The notification could not be enabled. The name was saved without an alert.',
    disclaimer: 'Names stay on your device. Annual reminders need a physical phone and notification permission.',
    notifications: 'Notifications', phoneOnly: 'Name-day reminders work on a physical phone.',
  },
  el: {
    eyebrow: 'ΠΡΟΣΩΠΙΚΕΣ ΥΠΕΝΘΥΜΙΣΕΙΣ', title: 'Ονομαστικές εορτές',
    namesTitle: 'Να χαίρεστε τους αγαπημένους σας', namesText: 'Προσθέστε όνομα και επιλέξτε Άγιο ή εορτή από το ημερολόγιο για ετήσια υπενθύμιση.',
    namePlaceholder: 'Μέλος οικογένειας ή φίλος', patron: 'Άγιος ή εορτή · επιλογή από ημερολόγιο',
    chooseFromCalendar: 'Πατήστε για να επιλέξετε τον προστάτη άγιο ενός αγαπημένου σας προσώπου από το εκκλησιαστικό ημερολόγιο', pickerTitle: 'Επιλογή από το ημερολόγιο',
    pickerSubtitle: 'Επιλέξτε ημερομηνία και μετά Άγιο ή εορτή', selectedDate: 'Επιλεγμένη ημερομηνία',
    feast: 'Εορτή', saint: 'Άγιος', noObservances: 'Δεν υπάρχουν εορτές ή ονόματα για αυτή την ημερομηνία.',
    closePicker: 'Κλείσιμο ημερολογίου', previousMonth: 'Προηγούμενος μήνας', nextMonth: 'Επόμενος μήνας',
    saveReminder: 'Αποθήκευση υπενθύμισης', nameRequired: 'Εισαγάγετε πρώτα ένα όνομα.',
    choiceRequired: 'Επιλέξτε πρώτα Άγιο ή εορτή από το ημερολόγιο.',
    updateReminder: 'Αποθήκευση αλλαγών', editReminder: 'Επεξεργασία υπενθύμισης', deleteReminder: 'Διαγραφή υπενθύμισης',
    cancelEdit: 'Ακύρωση επεξεργασίας', cancel: 'Ακύρωση', deleteReminderTitle: 'Διαγραφή υπενθύμισης ονομαστικής εορτής;',
    deleteReminderMessage: 'Θα διαγραφεί η ετήσια υπενθύμιση για {name} και θα ακυρωθεί η ειδοποίησή της.',
    deleteReminderConfirm: 'Διαγραφή', deleting: 'Διαγραφή…', saveFailed: 'Δεν ήταν δυνατή η αποθήκευση. Δοκιμάστε ξανά.',
    notificationUpdateFailed: 'Δεν ήταν δυνατή η ενημέρωση της ειδοποίησης, επομένως δεν αποθηκεύτηκαν αλλαγές.',
    notificationCancelWarning: 'Η υπενθύμιση διαγράφηκε, αλλά δεν ήταν δυνατή η ακύρωση της προγραμματισμένης ειδοποίησης.',
    notificationScheduleFailed: 'Δεν ήταν δυνατή η ενεργοποίηση της ειδοποίησης. Το όνομα αποθηκεύτηκε χωρίς ειδοποίηση.',
    disclaimer: 'Τα ονόματα αποθηκεύονται στη συσκευή σας. Οι ετήσιες υπενθυμίσεις χρειάζονται φυσικό τηλέφωνο και άδεια ειδοποιήσεων.',
    notifications: 'Ειδοποιήσεις', phoneOnly: 'Οι υπενθυμίσεις ονομαστικών εορτών λειτουργούν σε πραγματικό τηλέφωνο.',
  },
} as const;

function calendarDateKey(monthIndex: number, day: number) {
  return `2026-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function displayedDayMonth(day: number, monthNumber: number, months: readonly string[], language: 'ar' | 'en' | 'el') {
  const dayText = language === 'ar' ? new Intl.NumberFormat('ar-EG').format(day) : String(day);
  const month = months[monthNumber - 1];
  return language === 'en' ? `${month} ${dayText}` : `${dayText} ${month}`;
}

export default function PastoralScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView | null>(null);
  const { language, calendarType } = usePreferences();
  const { t } = useI18n();
  const p = pastoralCopy[language];
  const [familyName, setFamilyName] = useState('');
  const [selectedObservance, setSelectedObservance] = useState<NameDayChoice | null>(null);
  const [calendarPickerVisible, setCalendarPickerVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [calendarDay, setCalendarDay] = useState(() => {
    const today = new Date();
    return Math.min(today.getDate(), new Date(2026, today.getMonth() + 1, 0).getDate());
  });
  const [names, setNames] = useState<SavedName[]>([]);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<SavedName | null>(null);
  const [isDeletingNameDay, setIsDeletingNameDay] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const isRtl = language === 'ar';
  const rowDirection = isRtl ? 'row-reverse' as const : 'row' as const;
  const textAlign = isRtl ? 'right' as const : 'left' as const;
  const markedDates = useMemo(
    () => new Set(getCalendarEntriesForType(calendarType).map((entry) => entry.date)),
    [calendarType],
  );
  const monthPrefix = `2026-${String(calendarMonth + 1).padStart(2, '0')}-`;
  const markedDays = useMemo(
    () => new Set([...markedDates].filter((date) => date.startsWith(monthPrefix)).map((date) => Number(date.slice(-2)))),
    [markedDates, monthPrefix],
  );
  const pickerDate = calendarDateKey(calendarMonth, calendarDay);
  const observanceOptions: NameDayChoice[] = markedDates.has(pickerDate)
    ? getNameDayChoices(pickerDate, calendarType)
    : [];
  const daysInMonth = new Date(2026, calendarMonth + 1, 0).getDate();
  const weekdayDate = calendarType === 'julian' ? shiftDateKey(calendarDateKey(calendarMonth, 1), 13) : calendarDateKey(calendarMonth, 1);
  const firstWeekday = new Date(`${weekdayDate}T12:00:00Z`).getUTCDay();
  const monthNames = t.calendar.months;
  const yearLabel = language === 'ar' ? '٢٠٢٦' : '2026';
  const calendarSystemLabel = calendarType === 'julian' ? t.calendar.eastern : t.calendar.western;
  const selectedDateLabel = `${displayedDayMonth(calendarDay, calendarMonth + 1, monthNames, language)} ${yearLabel}`;

  const moveCalendarMonth = (delta: number) => {
    const nextMonth = (calendarMonth + delta + 12) % 12;
    setCalendarMonth(nextMonth);
    setCalendarDay((day) => Math.min(day, new Date(2026, nextMonth + 1, 0).getDate()));
  };

  useEffect(() => {
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

  const enableNotifications = async () => {
    if (!notificationsSupported) {
      Alert.alert(p.notifications, p.phoneOnly);
      return false;
    }
    const notifications = await getNotificationsModule();
    if (!notifications) return false;
    const permission = await notifications.requestPermissionsAsync();
    setNotificationGranted(permission.granted);
    return permission.granted;
  };

  const resetNameDayForm = () => {
    setFamilyName('');
    setSelectedObservance(null);
    setEditingNameId(null);
  };

  const saveNameDay = async () => {
    const trimmed = familyName.trim();
    if (!trimmed) {
      Alert.alert(p.title, p.nameRequired);
      return;
    }
    if (!selectedObservance) {
      Alert.alert(p.pickerTitle, p.choiceRequired);
      return;
    }

    if (editingNameId) {
      const existing = names.find((name) => name.id === editingNameId);
      if (!existing) {
        resetNameDayForm();
        return;
      }

      let notifications: NotificationsModule | null = null;
      let previousNotificationIds: string[] = [];
      let replacementNotificationId: string | undefined;
      try {
        notifications = await getNotificationsModule();
        if (notifications) {
          previousNotificationIds = await getScheduledNameDayNotificationIds(notifications, existing);
          if (previousNotificationIds.length > 0) {
            replacementNotificationId = await scheduleNameDayNotification(
              notifications,
              { ...existing, person: trimmed },
              selectedObservance,
            );
          }
        }

        const updatedName: SavedName = {
          ...existing,
          person: trimmed,
          observance: selectedObservance,
          ...(notifications ? { notificationId: replacementNotificationId } : {}),
        };
        const next = names.map((name) => name.id === existing.id ? updatedName : name);
        await AsyncStorage.setItem(NAMES_KEY, JSON.stringify(next));
        setNames(next);
        resetNameDayForm();
      } catch {
        if (notifications && replacementNotificationId) {
          await notifications.cancelScheduledNotificationAsync(replacementNotificationId).catch(() => undefined);
        }
        Alert.alert(
          p.title,
          previousNotificationIds.length > 0 ? p.notificationUpdateFailed : p.saveFailed,
        );
        return;
      }

      if (notifications) {
        const obsoleteNotificationIds = previousNotificationIds.filter(
          (identifier) => identifier !== replacementNotificationId,
        );
        try {
          await Promise.all(obsoleteNotificationIds.map((identifier) =>
            notifications!.cancelScheduledNotificationAsync(identifier),
          ));
        } catch {
          Alert.alert(p.title, p.notificationUpdateFailed);
        }
      }
      return;
    }

    const granted = notificationGranted || await enableNotifications();
    const newName: SavedName = { id: Date.now().toString(), person: trimmed, observance: selectedObservance };
    const next = [...names, newName];
    setNames(next);
    await AsyncStorage.setItem(NAMES_KEY, JSON.stringify(next));
    if (granted) {
      const notifications = await getNotificationsModule();
      if (notifications) {
        try {
          const notificationId = await scheduleNameDayNotification(notifications, newName, selectedObservance);
          const savedName = { ...newName, notificationId };
          const withNotification = next.map((name) => name.id === newName.id ? savedName : name);
          await AsyncStorage.setItem(NAMES_KEY, JSON.stringify(withNotification));
          setNames(withNotification);
        } catch {
          Alert.alert(p.title, p.notificationScheduleFailed);
        }
      }
    }
    resetNameDayForm();
  };

  const startEditingNameDay = (name: SavedName) => {
    const observance = getSavedNameChoice(name);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setEditingNameId(name.id);
    setFamilyName(name.person);
    setSelectedObservance(observance);
    setCalendarMonth(observance.month - 1);
    setCalendarDay(observance.day);
  };

  const removeNameDay = async (name: SavedName) => {
    setIsDeletingNameDay(true);
    let notificationCancelFailed = false;
    try {
      const notifications = await getNotificationsModule();
      if (notifications) {
        const notificationIds = await getScheduledNameDayNotificationIds(notifications, name);
        const cancellationResults = await Promise.all(notificationIds.map(async (identifier) => {
          try {
            await notifications.cancelScheduledNotificationAsync(identifier);
            return true;
          } catch {
            return false;
          }
        }));
        notificationCancelFailed = cancellationResults.some((cancelled) => !cancelled);
      }
    } catch {
      notificationCancelFailed = true;
    }

    try {
      const next = names.filter((savedName) => savedName.id !== name.id);
      await AsyncStorage.setItem(NAMES_KEY, JSON.stringify(next));
      setNames(next);
      setPendingDeletion(null);
      if (editingNameId === name.id) resetNameDayForm();
      setDeleteNotice(notificationCancelFailed ? p.notificationCancelWarning : null);
    } catch {
      Alert.alert(p.title, p.saveFailed);
    } finally {
      setIsDeletingNameDay(false);
    }
  };

  const confirmRemoveNameDay = (name: SavedName) => {
    setDeleteNotice(null);
    setPendingDeletion(name);
  };

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]} hitSlop={10}>
            <Feather name="arrow-right" size={20} color={colors.primary} />
          </Pressable>
          <View style={styles.topCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>{p.eyebrow}</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{p.title}</Text>
          </View>
        </View>
        <View style={styles.contentBlock}>
          <View style={[styles.intro, { backgroundColor: colors.primary }]}>
            <Feather name="gift" size={22} color={colors.accent} />
            <Text style={[styles.introTitle, { color: colors.primaryForeground }]}>{p.namesTitle}</Text>
            <Text style={[styles.introText, { color: colors.primaryForeground }]}>{p.namesText}</Text>
          </View>
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              testID="name-day-person"
              value={familyName}
              onChangeText={setFamilyName}
              placeholder={p.namePlaceholder}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            />
            <Pressable
              testID="name-day-calendar-picker"
              onPress={() => setCalendarPickerVisible(true)}
              style={[styles.saintPicker, { borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={p.patron}
            >
              <Feather name="calendar" size={16} color={colors.primary} />
              <View style={styles.saintPickerCopy}>
                <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>{p.patron}</Text>
                <Text style={[styles.pickerValue, { color: colors.foreground }]}>
                  {selectedObservance
                    ? `${selectedObservance.name} · ${displayedDayMonth(selectedObservance.day, selectedObservance.month, monthNames, language)}`
                    : p.chooseFromCalendar}
                </Text>
              </View>
              <Feather name="chevron-left" size={17} color={colors.mutedForeground} />
            </Pressable>
            <Pressable
              testID={editingNameId ? 'update-name-day' : 'add-name-day'}
              onPress={saveNameDay}
              style={[styles.primaryButton, { backgroundColor: colors.accent }]}
            >
              <Text style={[styles.primaryButtonText, { color: colors.accentForeground }]}>
                {editingNameId ? p.updateReminder : p.saveReminder}
              </Text>
            </Pressable>
            {editingNameId && (
              <Pressable
                testID="cancel-name-day-edit"
                onPress={resetNameDayForm}
                style={[styles.secondaryButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>{p.cancelEdit}</Text>
              </Pressable>
            )}
          </View>
          {deleteNotice && (
            <View style={[styles.deleteNotice, { backgroundColor: colors.secondary, flexDirection: rowDirection }]}>
              <Feather name="info" size={16} color={colors.primary} />
              <Text style={[styles.deleteNoticeText, { color: colors.secondaryForeground, textAlign }]}>{deleteNotice}</Text>
            </View>
          )}
          {names.map((name) => {
            const observance = getSavedNameChoice(name);
            return (
              <View key={name.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.itemIcon, { backgroundColor: colors.background }]}><Feather name="gift" size={18} color={colors.primary} /></View>
                <View style={styles.itemCopy}>
                  <Text style={[styles.itemTitle, { color: colors.foreground }]}>{name.person}</Text>
                  <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                    {observance.name} · {displayedDayMonth(observance.day, observance.month, monthNames, language)}
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  <Pressable
                    testID={`edit-name-day-${name.id}`}
                    onPress={() => startEditingNameDay(name)}
                    style={styles.itemAction}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.editReminder}: ${name.person}`}
                    hitSlop={8}
                  >
                    <Feather name="edit-2" size={17} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    testID={`delete-name-day-${name.id}`}
                    onPress={() => confirmRemoveNameDay(name)}
                    style={styles.itemAction}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.deleteReminder}: ${name.person}`}
                    hitSlop={8}
                  >
                    <Feather name="trash-2" size={17} color={colors.destructive} />
                  </Pressable>
                </View>
              </View>
            );
          })}
          <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>{p.disclaimer}</Text>
        </View>
      </ScrollView>

      <Modal
        visible={calendarPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCalendarPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setCalendarPickerVisible(false)}
            accessibilityRole="button"
            accessibilityLabel={p.closePicker}
          />
          <View style={[styles.pickerSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 14) }]}>
            <View style={[styles.pickerHeader, { flexDirection: rowDirection }]}>
              <View style={styles.pickerHeaderCopy}>
                <Text style={[styles.modalTitle, { color: colors.foreground, textAlign }]}>{p.pickerTitle}</Text>
                <Text style={[styles.modalSubtitle, { color: colors.mutedForeground, textAlign }]}>{p.pickerSubtitle}</Text>
              </View>
              <Pressable
                testID="name-day-calendar-close"
                onPress={() => setCalendarPickerVisible(false)}
                style={[styles.closeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={p.closePicker}
                hitSlop={8}
              >
                <Feather name="x" size={18} color={colors.primary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.pickerBody} showsVerticalScrollIndicator={false}>
              <View style={[styles.calendarSystem, { alignSelf: isRtl ? 'flex-end' : 'flex-start', backgroundColor: colors.secondary, flexDirection: rowDirection }]}>
                <Feather name="calendar" size={14} color={colors.secondaryForeground} />
                <Text style={[styles.calendarSystemText, { color: colors.secondaryForeground }]}>{calendarSystemLabel}</Text>
              </View>
              <View style={[styles.monthHeader, { flexDirection: rowDirection }]}>
                <Pressable
                  testID="name-day-calendar-previous-month"
                  onPress={() => moveCalendarMonth(-1)}
                  style={[styles.monthButton, { backgroundColor: colors.secondary }]}
                  accessibilityRole="button"
                  accessibilityLabel={p.previousMonth}
                >
                  <Feather name={isRtl ? 'chevron-right' : 'chevron-left'} size={18} color={colors.secondaryForeground} />
                </Pressable>
                <View style={styles.monthHeading}>
                  <Text style={[styles.monthTitle, { color: colors.foreground }]}>{monthNames[calendarMonth]}</Text>
                  <Text style={[styles.monthYear, { color: colors.mutedForeground }]}>{yearLabel}</Text>
                </View>
                <Pressable
                  testID="name-day-calendar-next-month"
                  onPress={() => moveCalendarMonth(1)}
                  style={[styles.monthButton, { backgroundColor: colors.secondary }]}
                  accessibilityRole="button"
                  accessibilityLabel={p.nextMonth}
                >
                  <Feather name={isRtl ? 'chevron-left' : 'chevron-right'} size={18} color={colors.secondaryForeground} />
                </Pressable>
              </View>
              <View style={[styles.weekdayRow, { flexDirection: rowDirection }]}>
                {t.calendar.weekdays.map((weekday, index) => (
                  <Text key={`${weekday}-${index}`} style={[styles.weekdayText, { color: colors.mutedForeground }]}>{weekday}</Text>
                ))}
              </View>
              <View style={[styles.daysGrid, { flexDirection: rowDirection }]}>
                {Array.from({ length: firstWeekday }, (_, index) => <View key={`blank-${index}`} style={styles.dayCell} />)}
                {Array.from({ length: daysInMonth }, (_, index) => {
                  const day = index + 1;
                  const dayDate = calendarDateKey(calendarMonth, day);
                  const selected = calendarDay === day;
                  return (
                    <Pressable
                      key={dayDate}
                      testID={`name-day-calendar-day-${dayDate}`}
                      onPress={() => setCalendarDay(day)}
                      style={[
                        styles.dayCell,
                        selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${day} ${monthNames[calendarMonth]}`}
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.dayNumber, { color: selected ? colors.primaryForeground : colors.foreground }]}>
                        {language === 'ar' ? new Intl.NumberFormat('ar-EG').format(day) : day}
                      </Text>
                      {markedDays.has(day) && <View style={[styles.dayMarker, { backgroundColor: colors.accent }]} />}
                    </Pressable>
                  );
                })}
              </View>
              <View style={[styles.selectedDate, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.selectedDateLabel, { color: colors.mutedForeground }]}>{p.selectedDate}</Text>
                <Text style={[styles.selectedDateValue, { color: colors.primary }]}>{selectedDateLabel}</Text>
              </View>
              <View style={styles.observances}>
                {observanceOptions.length ? observanceOptions.map((choice) => (
                  <Pressable
                    key={choice.id}
                    testID={`name-day-choice-${choice.id}`}
                    onPress={() => {
                      setSelectedObservance(choice);
                      setCalendarPickerVisible(false);
                    }}
                    style={[styles.observanceChoice, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: rowDirection }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${choice.kind === 'feast' ? p.feast : p.saint}: ${choice.name}`}
                  >
                    <View style={[styles.observanceIcon, { backgroundColor: colors.secondary }]}>
                      <Feather name={choice.kind === 'feast' ? 'star' : 'user'} size={15} color={colors.primary} />
                    </View>
                    <View style={styles.observanceCopy}>
                      <Text style={[styles.observanceKind, { color: colors.mutedForeground, textAlign }]}>{choice.kind === 'feast' ? p.feast : p.saint}</Text>
                      <Text style={[styles.observanceName, { color: colors.foreground, textAlign }]}>{choice.name}</Text>
                    </View>
                    <Feather name={isRtl ? 'chevron-left' : 'chevron-right'} size={17} color={colors.mutedForeground} />
                  </Pressable>
                )) : (
                  <Text style={[styles.noObservances, { color: colors.mutedForeground, borderColor: colors.border, textAlign }]}>{p.noObservances}</Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={pendingDeletion !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeletingNameDay) setPendingDeletion(null);
        }}
      >
        <View style={styles.deleteModalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!isDeletingNameDay) setPendingDeletion(null);
            }}
            accessibilityRole="button"
            accessibilityLabel={p.cancel}
          />
          <View style={[styles.deleteDialog, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.deleteIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="trash-2" size={20} color={colors.destructive} />
            </View>
            <Text style={[styles.deleteTitle, { color: colors.foreground }]}>{p.deleteReminderTitle}</Text>
            <Text style={[styles.deleteMessage, { color: colors.mutedForeground }]}>
              {p.deleteReminderMessage.replace('{name}', pendingDeletion?.person ?? '')}
            </Text>
            <View style={[styles.deleteActions, { flexDirection: rowDirection }]}>
              <Pressable
                testID="cancel-name-day-delete"
                disabled={isDeletingNameDay}
                onPress={() => setPendingDeletion(null)}
                style={[styles.deleteCancelButton, { borderColor: colors.border, opacity: isDeletingNameDay ? 0.6 : 1 }]}
                accessibilityRole="button"
              >
                <Text style={[styles.deleteCancelText, { color: colors.primary }]}>{p.cancel}</Text>
              </Pressable>
              <Pressable
                testID="confirm-name-day-delete"
                disabled={isDeletingNameDay || !pendingDeletion}
                onPress={() => {
                  if (pendingDeletion) void removeNameDay(pendingDeletion);
                }}
                style={[styles.deleteConfirmButton, { backgroundColor: colors.destructive, opacity: isDeletingNameDay ? 0.6 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel={p.deleteReminderConfirm}
                accessibilityState={{ disabled: isDeletingNameDay || !pendingDeletion }}
              >
                <Text style={[styles.deleteConfirmText, { color: colors.destructiveForeground }]}>
                  {isDeletingNameDay ? p.deleting : p.deleteReminderConfirm}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 },
  topBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  topCopy: { flex: 1, alignItems: 'flex-end' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  contentBlock: { gap: 14 },
  intro: { borderRadius: 22, padding: 20, alignItems: 'flex-end', gap: 8 },
  introTitle: { fontSize: 19, fontWeight: '700', textAlign: 'right' },
  introText: { opacity: 0.82, fontSize: 12, lineHeight: 20, textAlign: 'right' },
  formCard: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, textAlign: 'right', fontSize: 13 },
  primaryButton: { minHeight: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontSize: 13, fontWeight: '700' },
  secondaryButton: { minHeight: 46, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 12, fontWeight: '600' },
  itemCard: { borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  itemIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1, alignItems: 'flex-end', gap: 3 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemAction: { minWidth: 30, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 14, fontWeight: '700', textAlign: 'right' },
  itemMeta: { fontSize: 10, textAlign: 'right' },
  saintPicker: { minHeight: 60, borderWidth: 1, borderRadius: 12, padding: 11, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  saintPickerCopy: { flex: 1, alignItems: 'flex-end', gap: 4 },
  pickerLabel: { fontSize: 10 },
  pickerValue: { fontSize: 12, fontWeight: '700', textAlign: 'right' },
  disclaimer: { fontSize: 11, lineHeight: 18, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  pickerSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '92%', minHeight: '58%', paddingHorizontal: 18, paddingTop: 18, overflow: 'hidden' },
  pickerHeader: { alignItems: 'center', gap: 12, paddingBottom: 12 },
  pickerHeaderCopy: { flex: 1, gap: 3 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalSubtitle: { fontSize: 11, lineHeight: 17 },
  closeButton: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pickerBody: { gap: 10, paddingBottom: 8 },
  calendarSystem: { alignSelf: 'flex-start', alignItems: 'center', gap: 7, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 },
  calendarSystemText: { fontSize: 10, fontWeight: '700' },
  monthHeader: { alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  monthButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  monthHeading: { alignItems: 'center', gap: 2 },
  monthTitle: { fontSize: 17, fontWeight: '700' },
  monthYear: { fontSize: 10, fontWeight: '600' },
  weekdayRow: { alignItems: 'center' },
  weekdayText: { width: '14.2857%', textAlign: 'center', paddingVertical: 5, fontSize: 9, fontWeight: '700' },
  daysGrid: { flexWrap: 'wrap' },
  dayCell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent', borderRadius: 12, position: 'relative' },
  dayNumber: { fontSize: 12, fontWeight: '600' },
  dayMarker: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2 },
  selectedDate: { borderWidth: 1, borderRadius: 14, padding: 11, gap: 3 },
  selectedDateLabel: { fontSize: 10 },
  selectedDateValue: { fontSize: 13, fontWeight: '700' },
  observances: { gap: 8 },
  observanceChoice: { minHeight: 58, borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, alignItems: 'center', gap: 10 },
  observanceIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  observanceCopy: { flex: 1, alignItems: 'flex-end', gap: 3 },
  observanceKind: { fontSize: 9, fontWeight: '600' },
  observanceName: { fontSize: 12, fontWeight: '700' },
  noObservances: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 16, fontSize: 11, lineHeight: 18 },
  deleteNotice: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', gap: 8 },
  deleteNoticeText: { flex: 1, fontSize: 11, lineHeight: 17 },
  deleteModalBackdrop: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.48)' },
  deleteDialog: { width: '100%', maxWidth: 380, borderWidth: 1, borderRadius: 22, padding: 20, alignItems: 'center', gap: 11 },
  deleteIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  deleteTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  deleteMessage: { fontSize: 12, lineHeight: 19, textAlign: 'center' },
  deleteActions: { width: '100%', gap: 10, marginTop: 4 },
  deleteCancelButton: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  deleteCancelText: { fontSize: 12, fontWeight: '700' },
  deleteConfirmButton: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  deleteConfirmText: { fontSize: 12, fontWeight: '700' },
});