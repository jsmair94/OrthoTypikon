import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { createElement, useState } from 'react';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/usePreferences';

const LIVE_PLAYER_URL = 'https://iframe.dacast.com/live/5b5db9ba-4c13-8bb5-6bc4-cd42ee652aa1/07d3cb7c-1a21-ccdc-128d-6817f25ff78a?autoplay=true';
const RADIO_PLAYER_URL = 'https://orthodoxjo.tv/audio/%D8%B5%D9%88%D8%AA-%D8%A7%D9%84%D9%83%D9%86%D9%8A%D8%B3%D8%A9';

export default function LiveScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const [streamLoading, setStreamLoading] = useState(true);
  const [streamError, setStreamError] = useState(false);
  const [radioPlaying, setRadioPlaying] = useState(false);
  const [radioLoading, setRadioLoading] = useState(false);
  const [radioError, setRadioError] = useState(false);

  const openLiveStream = async () => {
    await WebBrowser.openBrowserAsync(LIVE_PLAYER_URL);
  };

  const openRadio = async () => {
    await WebBrowser.openBrowserAsync(RADIO_PLAYER_URL);
  };

  const startRadio = () => {
    setRadioError(false);
    setRadioLoading(true);
    setRadioPlaying(true);
  };

  const stopRadio = () => {
    setRadioPlaying(false);
    setRadioLoading(false);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]} hitSlop={10} accessibilityLabel={t.live.back}>
          <Feather name="arrow-right" size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.topCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{t.live.eyebrow}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{t.live.title}</Text>
        </View>
      </View>

      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t.live.subtitle}</Text>

      <View style={[styles.playerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.playerHeader}>
          <Text style={[styles.playerTitle, { color: colors.foreground }]}>{t.live.channel}</Text>
          {streamLoading && <View style={styles.loadingLabel}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.loadingText, { color: colors.mutedForeground }]}>{t.live.loading}</Text></View>}
        </View>
        {streamError ? (
          <View style={styles.errorState}>
            <Feather name="wifi-off" size={25} color={colors.primary} />
            <Text style={[styles.errorText, { color: colors.foreground }]}>{t.live.error}</Text>
            <Pressable testID="open-live-stream-fallback" onPress={openLiveStream} style={[styles.fallbackButton, { borderColor: colors.primary }]}>
              <Feather name="external-link" size={16} color={colors.primary} />
              <Text style={[styles.fallbackText, { color: colors.primary }]}>{t.live.openExternal}</Text>
            </Pressable>
          </View>
        ) : (
          Platform.OS === 'web' ? (
            <View style={styles.webView}>
              {createElement('iframe', {
                src: LIVE_PLAYER_URL,
                title: t.live.channel,
                allow: 'autoplay; fullscreen; picture-in-picture',
                allowFullScreen: true,
                onLoad: () => setStreamLoading(false),
                onError: () => { setStreamLoading(false); setStreamError(true); },
                style: { width: '100%', height: '100%', border: '0', display: 'block' },
              })}
            </View>
          ) : (
            <WebView
              source={{ uri: LIVE_PLAYER_URL }}
              style={styles.webView}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              onLoadEnd={() => setStreamLoading(false)}
              onError={() => { setStreamLoading(false); setStreamError(true); }}
              onHttpError={() => { setStreamLoading(false); setStreamError(true); }}
            />
          )
        )}
      </View>

      <View style={[styles.radioCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.radioHeader}>
          <View style={[styles.radioIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="radio" size={21} color={colors.primary} />
          </View>
          <View style={styles.radioCopy}>
            <Text style={[styles.radioTitle, { color: colors.foreground }]}>{t.live.radioTitle}</Text>
            <Text style={[styles.radioSubtitle, { color: colors.mutedForeground }]}>
              {radioPlaying ? t.live.radioPlaying : t.live.radioDescription}
            </Text>
          </View>
          <View style={[styles.liveDot, { backgroundColor: radioPlaying ? '#C96D5B' : colors.muted }]} />
        </View>

        {!radioPlaying ? (
          <Pressable
            testID="radio-play"
            onPress={startRadio}
            style={({ pressed }) => [styles.radioButton, { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 }]}
          >
            <Feather name="play" size={18} color={colors.primaryForeground} />
            <Text style={[styles.radioButtonText, { color: colors.primaryForeground }]}>{t.live.radioPlay}</Text>
          </Pressable>
        ) : radioError ? (
          <View style={styles.radioError}>
            <Text style={[styles.radioErrorText, { color: colors.foreground }]}>{t.live.radioError}</Text>
            <View style={styles.radioErrorActions}>
              <Pressable testID="radio-open-external" onPress={openRadio} style={[styles.fallbackButton, { borderColor: colors.primary }]}>
                <Feather name="external-link" size={16} color={colors.primary} />
                <Text style={[styles.fallbackText, { color: colors.primary }]}>{t.live.openExternal}</Text>
              </Pressable>
              <Pressable onPress={stopRadio} style={[styles.fallbackButton, { borderColor: colors.border }]}>
                <Text style={[styles.fallbackText, { color: colors.mutedForeground }]}>{t.live.radioStop}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.radioPlayerWrap}>
            {radioLoading && (
              <View style={styles.radioLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>{t.live.radioLoading}</Text>
              </View>
            )}
            {Platform.OS === 'web' ? (
              <View style={styles.radioWebView}>
                {createElement('iframe', {
                  src: RADIO_PLAYER_URL,
                  title: t.live.radioTitle,
                  allow: 'autoplay',
                  onLoad: () => setRadioLoading(false),
                  onError: () => { setRadioLoading(false); setRadioError(true); },
                  style: { width: '100%', height: '100%', border: '0', display: 'block' },
                })}
              </View>
            ) : (
              <WebView
                source={{ uri: RADIO_PLAYER_URL }}
                style={styles.radioWebView}
                originWhitelist={['*']}
                javaScriptEnabled
                domStorageEnabled
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction
                onLoadEnd={() => setRadioLoading(false)}
                onError={() => { setRadioLoading(false); setRadioError(true); }}
                onHttpError={() => { setRadioLoading(false); setRadioError(true); }}
              />
            )}
            <Pressable testID="radio-stop" onPress={stopRadio} style={[styles.radioStopButton, { borderColor: colors.border }]}>
              <Feather name="square" size={15} color={colors.primary} />
              <Text style={[styles.radioStopText, { color: colors.primary }]}>{t.live.radioStop}</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={[styles.note, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="external-link" size={18} color={colors.primary} />
        <Text style={[styles.noteText, { color: colors.foreground }]}>{t.live.note}</Text>
      </View>
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
  subtitle: { fontSize: 13, lineHeight: 20, textAlign: 'right' },
  note: { borderWidth: 1, borderRadius: 17, padding: 15, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 19, textAlign: 'right' },
  playerCard: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  playerHeader: { minHeight: 48, paddingHorizontal: 14, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  playerTitle: { fontSize: 13, fontWeight: '700' },
  loadingLabel: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  loadingText: { fontSize: 10 },
  webView: { height: 330, width: '100%' },
  errorState: { height: 250, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  errorText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  fallbackButton: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  fallbackText: { fontSize: 12, fontWeight: '700' },
  radioCard: { borderWidth: 1, borderRadius: 20, padding: 15, gap: 14 },
  radioHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  radioIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  radioCopy: { flex: 1, alignItems: 'flex-end', gap: 3 },
  radioTitle: { fontSize: 16, fontWeight: '800', textAlign: 'right' },
  radioSubtitle: { fontSize: 11, textAlign: 'right' },
  liveDot: { width: 9, height: 9, borderRadius: 5 },
  radioButton: { minHeight: 48, borderRadius: 15, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  radioButtonText: { fontSize: 13, fontWeight: '800' },
  radioPlayerWrap: { gap: 10 },
  radioWebView: { width: '100%', height: 155, backgroundColor: '#F4EEE4' },
  radioLoading: { minHeight: 40, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },
  radioStopButton: { minHeight: 40, borderWidth: 1, borderRadius: 12, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },
  radioStopText: { fontSize: 12, fontWeight: '700' },
  radioError: { alignItems: 'center', gap: 12 },
  radioErrorText: { fontSize: 12, lineHeight: 19, textAlign: 'center' },
  radioErrorActions: { flexDirection: 'row-reverse', gap: 8 },
});