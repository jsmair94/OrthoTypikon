import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/usePreferences';
import {
  attemptPlaceReportSubmission,
  fetchNearbyOrthodoxPlaces,
  isPlaceReportDetailsValid,
  type Coordinate,
  type NearbyOrthodoxPlace,
  type PlaceCategory,
} from '@/lib/orthodoxPlaces';

type SearchStatus = 'idle' | 'locating' | 'searching' | 'ready' | 'empty' | 'error';
type PlaceFilter = 'all' | PlaceCategory;
type MapSearchCategory = PlaceCategory;

const radiusOptions = [10, 25, 50] as const;
const placeFilters: PlaceFilter[] = ['all', 'church', 'monastery', 'school'];
const mapSearchCategories: MapSearchCategory[] = ['church', 'monastery', 'school'];

function getMapSearchUrl(category: MapSearchCategory, context: string) {
  const queryByCategory: Record<MapSearchCategory, string> = {
    church: 'Greek Orthodox church',
    monastery: 'Greek Orthodox monastery',
    school: 'Greek Orthodox school',
  };
  const query = `${queryByCategory[category]} near ${context}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function PlacesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, language } = useI18n();
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [center, setCenter] = useState<Coordinate | null>(null);
  const [places, setPlaces] = useState<NearbyOrthodoxPlace[]>([]);
  const [radiusKm, setRadiusKm] = useState<(typeof radiusOptions)[number]>(25);
  const [filter, setFilter] = useState<PlaceFilter>('all');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [reportPlace, setReportPlace] = useState<NearbyOrthodoxPlace | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportFeedback, setReportFeedback] = useState('');
  const requestController = useRef<AbortController | null>(null);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const needsSettings =
    Platform.OS !== 'web' &&
    permission?.status === 'denied' &&
    permission.canAskAgain === false;

  useEffect(
    () => () => {
      requestController.current?.abort();
    },
    [],
  );

  const searchAround = async (location: Coordinate, radius = radiusKm) => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setCenter(location);
    setStatus('searching');
    setErrorMessage('');

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 20_000);
    try {
      const found = await fetchNearbyOrthodoxPlaces(
        location,
        radius,
        language,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setPlaces(found);
      setStatus(found.length ? 'ready' : 'empty');
    } catch {
      if (controller.signal.aborted) {
        if (timedOut && requestController.current === controller) {
          setStatus('error');
          setErrorMessage(t.places.searchError);
        }
        return;
      }
      setPlaces([]);
      setStatus('error');
      setErrorMessage(t.places.searchError);
    } finally {
      clearTimeout(timeout);
    }
  };

  const locateAndSearch = async () => {
    setErrorMessage('');
    setStatus('locating');

    if (Platform.OS === 'web') {
      if (!globalThis.navigator?.geolocation) {
        setStatus('error');
        setErrorMessage(t.places.locationUnavailable);
        return;
      }
      globalThis.navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          void searchAround({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
        },
        () => {
          setStatus('error');
          setErrorMessage(t.places.browserPermissionHelp);
        },
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 },
      );
      return;
    }

    try {
      const granted = permission?.granted
        ? permission
        : await requestPermission();
      if (!granted.granted) {
        setStatus('idle');
        setErrorMessage(
          granted.canAskAgain
            ? t.places.permissionHelp
            : t.places.permissionDenied,
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await searchAround({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      setStatus('error');
      setErrorMessage(t.places.locationUnavailable);
    }
  };

  const changeRadius = (radius: (typeof radiusOptions)[number]) => {
    setRadiusKm(radius);
    if (center) void searchAround(center, radius);
  };

  const openMapSearch = async (category: MapSearchCategory) => {
    const context =
      city.trim() ||
      (center ? `${center.latitude},${center.longitude}` : '');
    if (!context) {
      setErrorMessage(t.places.mapSearchNeedsPlace);
      return;
    }
    try {
      await Linking.openURL(getMapSearchUrl(category, context));
    } catch {
      setErrorMessage(t.places.mapOpenError);
    }
  };

  const openDirections = async (place: NearbyOrthodoxPlace) => {
    try {
      await Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          `${place.latitude},${place.longitude}`,
        )}`,
      );
    } catch {
      setErrorMessage(t.places.mapOpenError);
    }
  };

  const submitPlaceReport = async () => {
    if (!reportPlace || !isPlaceReportDetailsValid(reportDetails) || reportBusy) return;
    setReportBusy(true);
    setReportError('');

    const result = await attemptPlaceReportSubmission(reportPlace.id, reportDetails);
    if (result === 'sent') {
      setReportPlace(null);
      setReportDetails('');
      setReportFeedback(t.places.reportSent);
    } else if (result === 'failed') {
      setReportError(t.places.reportError);
    }
    setReportBusy(false);
  };

  const visiblePlaces =
    filter === 'all' ? places : places.filter((place) => place.category === filter);
  const locale = language === 'ar' ? 'ar' : language === 'el' ? 'el' : 'en';
  const formatDistance = (distanceKm: number) =>
    distanceKm < 1
      ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
          Math.round(distanceKm * 1000),
        )} ${t.places.meters}`
      : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
          distanceKm,
        )} ${t.places.kilometers}`;

  const titleForCategory = (category: PlaceCategory) =>
    category === 'church'
      ? t.places.churches
      : category === 'monastery'
        ? t.places.monasteries
        : t.places.schools;

  return (
    <KeyboardAvoidingView style={styles.keyboardRoot} behavior="padding">
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + webTopInset + 14,
            paddingBottom: insets.bottom + 28,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.topBar}>
          <Pressable
            testID="places-back"
            accessibilityRole="button"
            accessibilityLabel={t.notFound.back}
            onPress={() => router.back()}
            style={[
              styles.backButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather
              name={language === 'ar' ? 'arrow-right' : 'arrow-left'}
              size={20}
              color={colors.primary}
            />
          </Pressable>
          <View style={styles.topCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>
              {t.places.eyebrow}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t.places.title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {t.places.subtitle}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.locationCard,
            { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
        >
          <View style={styles.locationCardCopy}>
            <View style={[styles.locationIcon, { backgroundColor: colors.accent }]}>
              <Feather name="map-pin" size={19} color={colors.accentForeground} />
            </View>
            <View style={styles.locationText}>
              <Text style={[styles.locationTitle, { color: colors.primaryForeground }]}>
                {t.places.locationPrompt}
              </Text>
              <Text style={[styles.locationSubtitle, { color: colors.primaryForeground }]}>
                {t.places.privacy}
              </Text>
            </View>
          </View>
          <Pressable
            testID="places-use-location"
            accessibilityRole="button"
            disabled={status === 'locating' || status === 'searching'}
            onPress={() => void locateAndSearch()}
            style={({ pressed }) => [
              styles.locationButton,
              {
                backgroundColor: colors.accent,
                opacity:
                  pressed || status === 'locating' || status === 'searching'
                    ? 0.75
                    : 1,
              },
            ]}
          >
            <Feather name="crosshair" size={17} color={colors.accentForeground} />
            <Text style={[styles.locationButtonText, { color: colors.accentForeground }]}>
              {status === 'locating' ? t.places.locating : t.places.useLocation}
            </Text>
          </Pressable>
        </View>

        {needsSettings ? (
          <Pressable
            testID="places-open-settings"
            onPress={() => void Linking.openSettings()}
            style={[
              styles.settingsButton,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            <Feather name="settings" size={16} color={colors.primary} />
            <Text style={[styles.settingsText, { color: colors.foreground }]}>
              {t.places.openSettings}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.citySearchBlock}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
            {t.places.citySearch}
          </Text>
          <TextInput
            testID="places-city-input"
            value={city}
            onChangeText={setCity}
            placeholder={t.places.cityPlaceholder}
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="search"
            autoCorrect={false}
            onSubmitEditing={() => void openMapSearch('church')}
            style={[
              styles.cityInput,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
          />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {t.places.citySearchHint}
          </Text>
        </View>

        <View style={styles.sectionRow}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
            {t.places.radius}
          </Text>
          <View style={styles.radiusOptions}>
            {radiusOptions.map((radius) => (
              <Pressable
                key={radius}
                testID={`places-radius-${radius}`}
                accessibilityRole="button"
                accessibilityState={{ selected: radius === radiusKm }}
                onPress={() => changeRadius(radius)}
                style={[
                  styles.radiusChip,
                  {
                    backgroundColor:
                      radius === radiusKm ? colors.primary : colors.card,
                    borderColor:
                      radius === radiusKm ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.radiusText,
                    {
                      color:
                        radius === radiusKm
                          ? colors.primaryForeground
                          : colors.foreground,
                    },
                  ]}
                >
                  {new Intl.NumberFormat(locale).format(radius)} {t.places.kilometers}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRail}
        >
          {placeFilters.map((item) => (
            <Pressable
              key={item}
              testID={`places-filter-${item}`}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === item }}
              onPress={() => setFilter(item)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === item ? colors.accent : colors.card,
                  borderColor: filter === item ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color:
                      filter === item
                        ? colors.accentForeground
                        : colors.foreground,
                  },
                ]}
              >
                {item === 'all' ? t.places.all : titleForCategory(item)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {status === 'searching' || status === 'locating' ? (
          <View
            style={[
              styles.statusCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="loader" size={18} color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.foreground }]}>
              {status === 'locating' ? t.places.locating : t.places.searching}
            </Text>
          </View>
        ) : null}

        {status === 'ready' && visiblePlaces.length > 0 ? (
          <View style={styles.resultsSection}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
              {t.places.results}
            </Text>
            {visiblePlaces.map((place) => (
              <View
                key={place.id}
                testID={`places-result-${place.id}`}
                style={[
                  styles.placeCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.placeHeading}>
                  <View
                    style={[
                      styles.placeIcon,
                      { backgroundColor: colors.secondary },
                    ]}
                  >
                    <Feather
                      name={
                        place.category === 'school'
                          ? 'book-open'
                          : place.category === 'monastery'
                            ? 'home'
                            : 'map-pin'
                      }
                      size={17}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.placeTitleBlock}>
                    <Text
                      style={[styles.placeName, { color: colors.foreground }]}
                      numberOfLines={2}
                    >
                      {place.name}
                    </Text>
                    <Text style={[styles.placeKind, { color: colors.primary }]}>
                      {titleForCategory(place.category)}
                    </Text>
                    <Text
                      style={[
                        styles.verificationBadge,
                        {
                          color: place.isVerified ? colors.primary : colors.mutedForeground,
                          backgroundColor: place.isVerified ? colors.secondary : colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {place.isVerified ? t.places.verified : t.places.unverified}
                    </Text>
                  </View>
                  <Text style={[styles.distance, { color: colors.primary }]}>
                    {formatDistance(place.distanceKm)}
                  </Text>
                </View>
                {place.address ? (
                  <Text style={[styles.address, { color: colors.mutedForeground }]}>
                    {place.address}
                  </Text>
                ) : null}
                {place.jurisdiction ? (
                  <Text style={[styles.placeMetadata, { color: colors.mutedForeground }]}>
                    {t.places.jurisdiction}: {place.jurisdiction}
                  </Text>
                ) : null}
                {place.verificationDetails ? (
                  <Text style={[styles.placeMetadata, { color: colors.mutedForeground }]}>
                    {place.verificationDetails}
                  </Text>
                ) : null}
                <View style={styles.placeActions}>
                  <Pressable
                    testID={`places-directions-${place.id}`}
                    accessibilityRole="button"
                    onPress={() => void openDirections(place)}
                    style={({ pressed }) => [
                      styles.directionButton,
                      {
                        backgroundColor: colors.secondary,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Feather name="navigation" size={14} color={colors.primary} />
                    <Text style={[styles.directionText, { color: colors.primary }]}>
                      {t.places.directions}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="link"
                    disabled={!place.sourceUrl}
                    onPress={() => {
                      if (!place.sourceUrl) return;
                      void Linking.openURL(place.sourceUrl).catch(() =>
                        setErrorMessage(t.places.mapOpenError),
                      );
                    }}
                    style={styles.sourceLink}
                  >
                    <Text style={[styles.sourceLinkText, { color: colors.mutedForeground }]}>
                      {place.sourceName}
                    </Text>
                    {place.sourceUrl ? (
                      <Feather name="external-link" size={12} color={colors.mutedForeground} />
                    ) : null}
                  </Pressable>
                  {place.source === 'directory' ? (
                    <Pressable
                      testID={`places-report-${place.id}`}
                      accessibilityRole="button"
                      onPress={() => {
                        setReportPlace(place);
                        setReportDetails('');
                        setReportError('');
                      }}
                      style={styles.reportButton}
                    >
                      <Text style={[styles.sourceLinkText, { color: colors.primary }]}>
                        {t.places.reportIncorrect}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {(status === 'empty' ||
          (status === 'ready' && visiblePlaces.length === 0)) && (
          <View
            style={[
              styles.statusCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="map" size={19} color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.foreground }]}>
              {status === 'empty' ? t.places.noResults : t.places.noFilteredResults}
            </Text>
          </View>
        )}

        {errorMessage ? (
          <View
            style={[
              styles.errorCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="info" size={17} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.foreground }]}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {reportFeedback ? (
          <View
            style={[
              styles.reportFeedback,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            <Feather name="check-circle" size={16} color={colors.primary} />
            <Text style={[styles.reportFeedbackText, { color: colors.foreground }]}>
              {reportFeedback}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setReportFeedback('')}
              hitSlop={8}
            >
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.mapSection}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
            {t.places.mapSearch}
          </Text>
          <View style={styles.mapButtons}>
            {mapSearchCategories.map((category) => (
              <Pressable
                key={category}
                testID={`places-map-${category}`}
                accessibilityRole="button"
                onPress={() => void openMapSearch(category)}
                style={({ pressed }) => [
                  styles.mapButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Feather
                  name={
                    category === 'school'
                      ? 'book-open'
                      : category === 'monastery'
                        ? 'home'
                        : 'map-pin'
                  }
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.mapButtonText, { color: colors.foreground }]}>
                  {titleForCategory(category)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={[styles.attribution, { color: colors.mutedForeground }]}>
          {t.places.attribution}
        </Text>
      </ScrollView>
      <Modal
        visible={Boolean(reportPlace)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!reportBusy) setReportPlace(null);
        }}
      >
        <View style={styles.reportBackdrop}>
          <View
            style={[
              styles.reportModal,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.reportModalTitleRow}>
              <Text style={[styles.reportModalTitle, { color: colors.foreground }]}>
                {t.places.reportTitle}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.places.reportCancel}
                disabled={reportBusy}
                onPress={() => setReportPlace(null)}
                hitSlop={8}
              >
                <Feather name="x" size={19} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.reportPlaceName, { color: colors.primary }]}>
              {reportPlace?.name}
            </Text>
            <Text style={[styles.reportPrompt, { color: colors.mutedForeground }]}>
              {t.places.reportDetails}
            </Text>
            <TextInput
              testID="places-report-details"
              multiline
              maxLength={1000}
              value={reportDetails}
              onChangeText={setReportDetails}
              placeholder={t.places.reportPlaceholder}
              placeholderTextColor={colors.mutedForeground}
              textAlignVertical="top"
              editable={!reportBusy}
              style={[
                styles.reportInput,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            />
            {reportError ? (
              <Text style={[styles.reportError, { color: colors.destructive }]}>
                {reportError}
              </Text>
            ) : null}
            <View style={styles.reportModalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={reportBusy}
                onPress={() => setReportPlace(null)}
                style={[
                  styles.reportCancelButton,
                  { borderColor: colors.border },
                ]}
              >
                <Text style={[styles.reportCancelText, { color: colors.foreground }]}>
                  {t.places.reportCancel}
                </Text>
              </Pressable>
              <Pressable
                testID="places-submit-report"
                accessibilityRole="button"
                disabled={reportBusy || !isPlaceReportDetailsValid(reportDetails)}
                onPress={() => void submitPlaceReport()}
                style={[
                  styles.reportSubmitButton,
                  {
                    backgroundColor: colors.primary,
                    opacity:
                      reportBusy || !isPlaceReportDetailsValid(reportDetails)
                        ? 0.55
                        : 1,
                  },
                ]}
              >
                {reportBusy ? (
                  <Feather name="loader" size={14} color={colors.primaryForeground} />
                ) : null}
                <Text style={[styles.reportSubmitText, { color: colors.primaryForeground }]}>
                  {t.places.reportSend}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: { flex: 1 },
  root: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 16 },
  topBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCopy: { flex: 1, alignItems: 'flex-end' },
  eyebrow: { fontSize: 11, fontWeight: '700', textAlign: 'right' },
  title: { fontSize: 25, fontWeight: '800', marginTop: 3, textAlign: 'right' },
  subtitle: { fontSize: 12, lineHeight: 18, marginTop: 4, textAlign: 'right' },
  locationCard: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 14 },
  locationCardCopy: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: { flex: 1, alignItems: 'flex-end', gap: 4 },
  locationTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right' },
  locationSubtitle: { fontSize: 11, lineHeight: 17, opacity: 0.84, textAlign: 'right' },
  locationButton: {
    minHeight: 44,
    borderRadius: 13,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  locationButtonText: { fontSize: 13, fontWeight: '800' },
  settingsButton: {
    alignSelf: 'flex-end',
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 7,
  },
  settingsText: { fontSize: 12, fontWeight: '700' },
  citySearchBlock: { gap: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '800', textAlign: 'right' },
  cityInput: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    textAlign: 'right',
    fontSize: 13,
  },
  hint: { fontSize: 10, lineHeight: 15, textAlign: 'right' },
  sectionRow: { gap: 9 },
  radiusOptions: { flexDirection: 'row-reverse', gap: 8 },
  radiusChip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusText: { fontSize: 11, fontWeight: '700' },
  filterRail: { flexDirection: 'row-reverse', gap: 8 },
  filterChip: {
    minHeight: 34,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: { fontSize: 11, fontWeight: '700' },
  statusCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 60,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  statusText: { flex: 1, fontSize: 12, lineHeight: 19, textAlign: 'right' },
  resultsSection: { gap: 10 },
  placeCard: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 10 },
  placeHeading: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  placeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeTitleBlock: { flex: 1, alignItems: 'flex-end', gap: 3 },
  placeName: { fontSize: 13, lineHeight: 19, fontWeight: '800', textAlign: 'right' },
  placeKind: { fontSize: 10, fontWeight: '700', textAlign: 'right' },
  verificationBadge: {
    alignSelf: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 9,
    fontWeight: '700',
  },
  distance: { fontSize: 11, fontWeight: '800' },
  address: { fontSize: 11, lineHeight: 17, textAlign: 'right' },
  placeMetadata: { fontSize: 11, lineHeight: 16, textAlign: 'right' },
  placeActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 13 },
  directionButton: {
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: 11,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  directionText: { fontSize: 11, fontWeight: '700' },
  sourceLink: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  sourceLinkText: { fontSize: 10 },
  reportButton: { paddingVertical: 5, paddingHorizontal: 4 },
  reportFeedback: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  reportFeedbackText: { flex: 1, fontSize: 12, lineHeight: 17, textAlign: 'right' },
  reportBackdrop: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: 'rgba(12, 20, 30, 0.55)',
  },
  reportModal: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 11,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  reportModalTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportModalTitle: { fontSize: 19, fontWeight: '800', textAlign: 'right' },
  reportPlaceName: { fontSize: 13, fontWeight: '700', textAlign: 'right' },
  reportPrompt: { fontSize: 12, lineHeight: 18, textAlign: 'right' },
  reportInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'right',
  },
  reportError: { fontSize: 12, lineHeight: 17, textAlign: 'right' },
  reportModalActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  reportCancelButton: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportCancelText: { fontSize: 12, fontWeight: '700' },
  reportSubmitButton: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  reportSubmitText: { fontSize: 12, fontWeight: '700' },
  errorCard: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 13,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 9,
  },
  errorText: { flex: 1, fontSize: 11, lineHeight: 17, textAlign: 'right' },
  mapSection: { gap: 9 },
  mapButtons: { flexDirection: 'row-reverse', gap: 7 },
  mapButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mapButtonText: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  attribution: { fontSize: 10, lineHeight: 16, textAlign: 'center', paddingHorizontal: 4 },
});