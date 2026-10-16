import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useI18n } from '@/hooks/usePreferences';
import { filterCountryOptions, getCountryOptions } from '@/data/countries';
import { getMoreContent } from '@/data/moreContent';
import { ORTHOTYPIKON_CONTACT_EMAIL } from '@/data/moreContent';
import { useSubmitContactMessage } from '@workspace/api-client-react';
import {
  countryDialCodes,
  filterCountryDialCodes,
  validateContactForm,
  type ContactFormField,
  type ContactFormValues,
} from '@/lib/contactForm';

function regionName(
  iso: string,
  fallback: string,
  language: 'ar' | 'en' | 'el',
) {
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(iso) ?? fallback;
  } catch {
    return fallback;
  }
}

export function ContactForm() {
  const colors = useColors();
  const { language } = useI18n();
  const content = getMoreContent(language).contactForm;
  const isArabic = language === 'ar';
  const submitMutation = useSubmitContactMessage();
  const [values, setValues] = useState<ContactFormValues>({
    name: '',
    email: '',
    country: '',
    phone: '',
    message: '',
    dialCode: '',
  });
  const [errors, setErrors] = useState<ReturnType<typeof validateContactForm>>({});
  const [notice, setNotice] = useState('');
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [dialCodeModalVisible, setDialCodeModalVisible] = useState(false);
  const [dialCodeSearch, setDialCodeSearch] = useState('');
  const countries = useMemo(() => getCountryOptions(language), [language]);
  const filteredCountries = useMemo(
    () => filterCountryOptions(countrySearch, countries),
    [countrySearch, countries],
  );
  const selectedCountry = countries.find((item) => item.iso === values.country);
  const filteredDialCodes = useMemo(
    () => filterCountryDialCodes(dialCodeSearch),
    [dialCodeSearch],
  );
  const customCodeMatch = dialCodeSearch.trim().match(/^\+?\d{1,4}$/);
  const customDialCode = customCodeMatch
    ? customCodeMatch[0].startsWith('+')
      ? customCodeMatch[0]
      : `+${customCodeMatch[0]}`
    : null;
  const canUseCustomDialCode =
    customDialCode !== null &&
    !countryDialCodes.some((item) => item.code === customDialCode);

  const updateField = (field: keyof ContactFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (field !== 'dialCode' && errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
    setNotice('');
  };

  const errorMessage = (field: ContactFormField) => {
    const error = errors[field];
    if (error === 'required') return content.required;
    if (error === 'invalidEmail') return content.invalidEmail;
    if (error === 'invalidPhone') return content.invalidPhone;
    return '';
  };

  const renderField = (
    field: ContactFormField,
    label: string,
    props: TextInputProps = {},
  ) => {
    const fieldError = errorMessage(field);
    return (
      <View key={field} style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground, textAlign: isArabic ? 'right' : 'left' }]}>
          {label}
          <Text style={{ color: colors.destructive }}> *</Text>
        </Text>
        <TextInput
          testID={`contact-${field}`}
          accessibilityLabel={label}
          value={values[field]}
          onChangeText={(value) => updateField(field, value)}
          placeholder={label}
          placeholderTextColor={colors.mutedForeground}
          selectionColor={colors.accent}
          autoCorrect={field === 'message'}
          textAlign={isArabic ? 'right' : 'left'}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: fieldError ? colors.destructive : colors.border,
              color: colors.foreground,
              textAlign: isArabic ? 'right' : 'left',
            },
            props.multiline ? styles.messageInput : null,
          ]}
          {...props}
        />
        {fieldError ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.error, { color: colors.destructive, textAlign: isArabic ? 'right' : 'left' }]}
          >
            {fieldError}
          </Text>
        ) : null}
      </View>
    );
  };

  const selectDialCode = (code: string) => {
    updateField('dialCode', code);
    setDialCodeModalVisible(false);
    setDialCodeSearch('');
  };

  const selectCountry = (iso: string) => {
    updateField('country', iso);
    setCountryModalVisible(false);
    setCountrySearch('');
  };

  const submitForm = async () => {
    const nextErrors = validateContactForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setNotice('');
      return;
    }
    Keyboard.dismiss();
    try {
      await submitMutation.mutateAsync({
        data: {
          name: values.name.trim(),
          email: values.email.trim(),
          country: selectedCountry?.name ?? values.country,
          phone: [values.dialCode, values.phone.trim()].filter(Boolean).join(' '),
          message: values.message.trim(),
        },
      });
      setNotice(content.submitNotice);
      setValues({ name: '', email: '', country: '', phone: '', message: '', dialCode: '' });
    } catch {
      setNotice(content.sendFailed);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={[styles.intro, { color: colors.mutedForeground, textAlign: isArabic ? 'right' : 'left' }]}>
        {content.intro}
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {renderField('name', content.name, {
          autoCapitalize: 'words',
          autoComplete: 'name',
          returnKeyType: 'next',
        })}
        {renderField('email', content.email, {
          keyboardType: 'email-address',
          autoCapitalize: 'none',
          autoComplete: 'email',
          returnKeyType: 'next',
        })}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground, textAlign: isArabic ? 'right' : 'left' }]}>
            {content.country}
            <Text style={{ color: colors.destructive }}> *</Text>
          </Text>
          <Pressable
            testID="contact-country"
            accessibilityRole="button"
            accessibilityLabel={`${content.country}: ${selectedCountry?.name ?? content.chooseCountry}`}
            accessibilityState={{ expanded: countryModalVisible, selected: !!selectedCountry }}
            onPress={() => setCountryModalVisible(true)}
            style={({ pressed }) => [
              styles.countryButton,
              {
                backgroundColor: colors.card,
                borderColor: errors.country ? colors.destructive : colors.border,
                opacity: pressed ? 0.76 : 1,
                flexDirection: isArabic ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.countryButtonText,
                {
                  color: selectedCountry ? colors.foreground : colors.mutedForeground,
                  textAlign: isArabic ? 'right' : 'left',
                },
              ]}
            >
              {selectedCountry?.name ?? content.chooseCountry}
            </Text>
            <Feather name="chevron-down" size={17} color={colors.mutedForeground} />
          </Pressable>
          {errors.country ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.error, { color: colors.destructive, textAlign: isArabic ? 'right' : 'left' }]}
            >
              {errorMessage('country')}
            </Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground, textAlign: isArabic ? 'right' : 'left' }]}>
            {content.phone}
            <Text style={[styles.optionalLabel, { color: colors.mutedForeground }]}> {content.optional}</Text>
          </Text>
          <View style={[styles.phoneRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
            <Pressable
              testID="contact-dial-code"
              accessibilityRole="button"
              accessibilityLabel={content.chooseDialCode}
              onPress={() => setDialCodeModalVisible(true)}
              style={({ pressed }) => [
                styles.dialCodeButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <Feather name="chevron-down" size={15} color={colors.mutedForeground} />
              <Text style={[styles.dialCodeText, { color: values.dialCode ? colors.foreground : colors.mutedForeground }]}>
                {values.dialCode || content.dialCode}
              </Text>
            </Pressable>
            <TextInput
              testID="contact-phone"
              accessibilityLabel={`${content.phone} ${content.optional}`}
              value={values.phone}
              onChangeText={(value) => updateField('phone', value)}
              placeholder={content.phone}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              textAlign="left"
              style={[
                styles.input,
                styles.phoneInput,
                {
                  backgroundColor: colors.card,
                  borderColor: errors.phone ? colors.destructive : colors.border,
                  color: colors.foreground,
                },
              ]}
            />
          </View>
          {errors.phone ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.error, { color: colors.destructive, textAlign: isArabic ? 'right' : 'left' }]}
            >
              {errorMessage('phone')}
            </Text>
          ) : null}
        </View>

        {renderField('message', content.message, {
          multiline: true,
          numberOfLines: 5,
          maxLength: 2000,
          textAlignVertical: 'top',
          returnKeyType: 'default',
        })}
      </View>

      {notice ? (
        <Text
          accessibilityLiveRegion="polite"
          testID="contact-submit-notice"
          style={[styles.notice, { backgroundColor: colors.muted, color: colors.mutedForeground }]}
        >
          {notice}
        </Text>
      ) : null}

      <Pressable
        testID="contact-submit"
        accessibilityRole="button"
        onPress={submitForm}
        disabled={submitMutation.isPending}
        style={({ pressed }) => [
          styles.submitButton,
          { backgroundColor: colors.primary, opacity: submitMutation.isPending ? 0.65 : pressed ? 0.82 : 1 },
        ]}
      >
        <Feather name="send" size={17} color={colors.primaryForeground} />
        <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
          {submitMutation.isPending ? content.sending : content.submit}
        </Text>
      </Pressable>

      <Modal
        visible={countryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessible={false}
            onPress={() => setCountryModalVisible(false)}
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: colors.foreground, opacity: 0.48 },
            ]}
          />
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{content.chooseCountry}</Text>
              <Pressable
                testID="contact-country-close"
                accessibilityRole="button"
                accessibilityLabel={content.closeCountryPicker}
                onPress={() => setCountryModalVisible(false)}
                hitSlop={8}
              >
                <Feather name="x" size={20} color={colors.foreground} />
              </Pressable>
            </View>
            <TextInput
              testID="contact-country-search"
              value={countrySearch}
              onChangeText={setCountrySearch}
              placeholder={content.searchCountry}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                styles.searchInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                  textAlign: isArabic ? 'right' : 'left',
                },
              ]}
            />
            <ScrollView
              testID="contact-country-list"
              style={styles.countryList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {filteredCountries.map((item) => (
                <Pressable
                  key={item.iso}
                  testID={`contact-country-option-${item.iso.toLowerCase()}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.iso === values.country }}
                  onPress={() => selectCountry(item.iso)}
                  style={({ pressed }) => [
                    styles.countryOption,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: pressed ? colors.muted : 'transparent',
                    },
                  ]}
                >
                  <Text style={[styles.optionText, { color: colors.foreground }]}>{item.name}</Text>
                </Pressable>
              ))}
              {filteredCountries.length === 0 ? (
                <Text style={[styles.emptyCountries, { color: colors.mutedForeground }]}>
                  {content.noCountriesFound}
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={dialCodeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDialCodeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessible={false}
            onPress={() => setDialCodeModalVisible(false)}
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: colors.foreground, opacity: 0.48 },
            ]}
          />
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{content.dialCode}</Text>
              <Pressable
                testID="contact-dial-code-close"
                accessibilityRole="button"
                accessibilityLabel={content.closeDialCodePicker}
                onPress={() => setDialCodeModalVisible(false)}
                hitSlop={8}
              >
                <Feather name="x" size={20} color={colors.foreground} />
              </Pressable>
            </View>
            <TextInput
              testID="contact-dial-code-search"
              value={dialCodeSearch}
              onChangeText={setDialCodeSearch}
              placeholder={content.searchDialCode}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="default"
              style={[
                styles.input,
                styles.searchInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                  textAlign: isArabic ? 'right' : 'left',
                },
              ]}
            />
            <Pressable
              testID="contact-dial-code-clear"
              accessibilityRole="button"
              onPress={() => selectDialCode('')}
              style={[styles.codeOption, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.optionText, { color: colors.mutedForeground }]}>{content.clearDialCode}</Text>
            </Pressable>
            <ScrollView
              style={styles.codeList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {filteredDialCodes.map((item) => (
                <Pressable
                  key={item.iso}
                  testID={`contact-dial-code-option-${item.iso.toLowerCase()}`}
                  accessibilityRole="button"
                  onPress={() => selectDialCode(item.code)}
                  style={({ pressed }) => [
                    styles.codeOption,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: pressed ? colors.muted : 'transparent',
                    },
                  ]}
                >
                  <Text style={[styles.codeText, { color: colors.primary }]}>{item.code}</Text>
                  <Text style={[styles.optionText, { color: colors.foreground }]}>
                    {regionName(item.iso, item.name, language)} · {item.iso}
                  </Text>
                </Pressable>
              ))}
              {canUseCustomDialCode && customDialCode ? (
                <Pressable
                  testID="contact-dial-code-custom"
                  accessibilityRole="button"
                  onPress={() => selectDialCode(customDialCode)}
                  style={({ pressed }) => [
                    styles.codeOption,
                    { backgroundColor: pressed ? colors.muted : 'transparent' },
                  ]}
                >
                  <Text style={[styles.codeText, { color: colors.primary }]}>{customDialCode}</Text>
                  <Text style={[styles.optionText, { color: colors.foreground }]}>{content.customDialCode}</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14, marginTop: 4 },
  intro: { fontSize: 13, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 16 },
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, fontSize: 15 },
  optionalLabel: { fontSize: 12, fontWeight: '400' },
  countryButton: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  countryButtonText: { flex: 1, fontSize: 15 },
  messageInput: { minHeight: 122, paddingTop: 12 },
  error: { fontSize: 12, lineHeight: 17 },
  phoneRow: { alignItems: 'stretch', gap: 8 },
  dialCodeButton: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '46%' },
  dialCodeText: { fontSize: 12, fontWeight: '600' },
  phoneInput: { flex: 1 },
  notice: { borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  submitButton: { minHeight: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 16 },
  submitText: { fontSize: 14, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 22 },
  modalCard: { width: '100%', maxWidth: 440, maxHeight: '78%', borderWidth: 1, borderRadius: 20, padding: 16, gap: 12, overflow: 'hidden' },
  modalHeader: { alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  searchInput: { minHeight: 44 },
  countryList: { maxHeight: 350 },
  countryOption: { minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 5, flexDirection: 'row', alignItems: 'center' },
  emptyCountries: { paddingVertical: 24, fontSize: 13, textAlign: 'center' },
  codeList: { maxHeight: 350 },
  codeOption: { minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  optionText: { flex: 1, fontSize: 13 },
  codeText: { fontSize: 13, fontWeight: '700' },
});