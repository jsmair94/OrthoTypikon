import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/usePreferences';

function directionIndex(degrees: number) {
  if (degrees >= 337.5 || degrees < 22.5) return 0;
  if (degrees < 67.5) return 1;
  if (degrees < 112.5) return 2;
  if (degrees < 157.5) return 3;
  if (degrees < 202.5) return 4;
  if (degrees < 247.5) return 5;
  if (degrees < 292.5) return 6;
  return 7;
}

export default function CompassScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, language } = useI18n();
  const compassMarks = language === 'ar' ? ['ش', 'شر', 'ج', 'غ'] : language === 'en' ? ['N', 'E', 'S', 'W'] : ['Β', 'Α', 'Ν', 'Δ'];
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!permission?.granted || Platform.OS === 'web') return;
    let subscription: Location.LocationSubscription | undefined;
    Location.watchHeadingAsync((reading) => {
      const value = reading.trueHeading >= 0 ? reading.trueHeading : reading.magHeading;
      setHeading(Math.round(value));
      setError('');
     }).then((nextSubscription) => { subscription = nextSubscription; }).catch(() => setError(t.compass.footer));
    return () => subscription?.remove();
   }, [permission?.granted, t.compass.footer]);

  const needleRotation = useMemo(() => heading === null ? '0deg' : `${90 - heading}deg`, [heading]);
  const needsSettings = permission?.status === 'denied' && permission.canAskAgain === false;

  const request = async () => {
    setError('');
    const result = await requestPermission();
     if (!result.granted) setError(t.compass.allowNotice);
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]} hitSlop={10}><Feather name="arrow-right" size={20} color={colors.primary} /></Pressable>
         <View style={styles.topCopy}><Text style={[styles.eyebrow, { color: colors.primary }]}>{t.compass.eyebrow}</Text><Text style={[styles.title, { color: colors.foreground }]}>{t.compass.title}</Text></View>
      </View>

      <View style={[styles.compassCard, { backgroundColor: colors.primary }]}>
         <Text style={styles.compassHint}>{t.compass.pointEast}</Text>
        <View style={styles.dial}>
           <Text style={[styles.mark, styles.north]}>{compassMarks[0]}</Text><Text style={[styles.mark, styles.east]}>{compassMarks[1]}</Text><Text style={[styles.mark, styles.south]}>{compassMarks[2]}</Text><Text style={[styles.mark, styles.west]}>{compassMarks[3]}</Text>
          <View style={[styles.needle, { transform: [{ rotate: needleRotation }] }]}><View style={styles.needleTip} /><View style={styles.needleTail} /></View>
          <View style={styles.centerDot}><Feather name="crosshair" size={17} color={colors.primary} /></View>
        </View>
        <Text style={styles.degree}>{heading === null ? '—' : `${heading}°`}</Text>
         <Text style={styles.direction}>{heading === null ? t.compass.waiting : `${t.compass.current}: ${t.compass.directions[directionIndex(heading)]}`}</Text>
      </View>

      {Platform.OS === 'web' ? (
         <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="smartphone" size={19} color={colors.accent} /><Text style={[styles.noticeText, { color: colors.foreground }]}>{t.compass.webNotice}</Text></View>
      ) : !permission?.granted ? (
         <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="compass" size={19} color={colors.accent} /><Text style={[styles.noticeText, { color: colors.foreground }]}>{needsSettings ? t.compass.denied : t.compass.allowNotice}</Text><Pressable onPress={needsSettings ? () => Linking.openSettings() : request} style={[styles.permissionButton, { backgroundColor: colors.accent }]}><Text style={[styles.permissionText, { color: colors.primary }]}>{needsSettings ? t.compass.openSettings : t.compass.allow}</Text></Pressable></View>
      ) : null}
      {!!error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
       <Text style={[styles.footer, { color: colors.mutedForeground }]}>{t.compass.footer}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 },
  topBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  topCopy: { flex: 1, alignItems: 'flex-end' },
  backButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  compassCard: { borderRadius: 26, paddingVertical: 24, alignItems: 'center', gap: 7 },
  compassHint: { color: '#D9E0E3', fontSize: 12 },
  dial: { width: 238, height: 238, borderRadius: 119, marginVertical: 10, backgroundColor: '#F7F5EF', borderWidth: 8, borderColor: 'rgba(228,185,103,0.65)', position: 'relative', alignItems: 'center', justifyContent: 'center' },
  mark: { position: 'absolute', color: '#18324A', fontSize: 13, fontWeight: '700' },
  north: { top: 13 }, east: { right: 9, top: 108 }, south: { bottom: 13 }, west: { left: 9, top: 108 },
  needle: { width: 6, height: 170, position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  needleTip: { width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 72, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#B47732', position: 'absolute', top: 12 },
  needleTail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 55, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#18324A', position: 'absolute', bottom: 13 },
  centerDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E4B967', alignItems: 'center', justifyContent: 'center' },
  degree: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  direction: { color: '#D9E0E3', fontSize: 12 },
  notice: { borderWidth: 1, borderRadius: 18, padding: 17, alignItems: 'flex-end', gap: 10 },
  noticeText: { fontSize: 13, lineHeight: 21, textAlign: 'right' },
  permissionButton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  permissionText: { fontSize: 13, fontWeight: '700' },
  error: { fontSize: 12, textAlign: 'right', lineHeight: 19 },
  footer: { fontSize: 11, lineHeight: 18, textAlign: 'center', paddingHorizontal: 12 },
});