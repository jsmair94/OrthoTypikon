export type ContactFormField = 'name' | 'email' | 'country' | 'phone' | 'message';

export type ContactFormValues = Record<ContactFormField, string> & {
  dialCode: string;
};

export type ContactFormErrors = Partial<
  Record<ContactFormField, 'required' | 'invalidEmail' | 'invalidPhone'>
>;

export const countryDialCodes = [
  { iso: 'AF', name: 'Afghanistan', code: '+93' },
  { iso: 'AL', name: 'Albania', code: '+355' },
  { iso: 'DZ', name: 'Algeria', code: '+213' },
  { iso: 'AR', name: 'Argentina', code: '+54' },
  { iso: 'AU', name: 'Australia', code: '+61' },
  { iso: 'AT', name: 'Austria', code: '+43' },
  { iso: 'BH', name: 'Bahrain', code: '+973' },
  { iso: 'BD', name: 'Bangladesh', code: '+880' },
  { iso: 'BE', name: 'Belgium', code: '+32' },
  { iso: 'BR', name: 'Brazil', code: '+55' },
  { iso: 'BG', name: 'Bulgaria', code: '+359' },
  { iso: 'CA', name: 'Canada', code: '+1' },
  { iso: 'CL', name: 'Chile', code: '+56' },
  { iso: 'CN', name: 'China', code: '+86' },
  { iso: 'CO', name: 'Colombia', code: '+57' },
  { iso: 'HR', name: 'Croatia', code: '+385' },
  { iso: 'CY', name: 'Cyprus', code: '+357' },
  { iso: 'CZ', name: 'Czechia', code: '+420' },
  { iso: 'DK', name: 'Denmark', code: '+45' },
  { iso: 'EG', name: 'Egypt', code: '+20' },
  { iso: 'FI', name: 'Finland', code: '+358' },
  { iso: 'FR', name: 'France', code: '+33' },
  { iso: 'DE', name: 'Germany', code: '+49' },
  { iso: 'GH', name: 'Ghana', code: '+233' },
  { iso: 'GR', name: 'Greece', code: '+30' },
  { iso: 'IN', name: 'India', code: '+91' },
  { iso: 'ID', name: 'Indonesia', code: '+62' },
  { iso: 'IR', name: 'Iran', code: '+98' },
  { iso: 'IQ', name: 'Iraq', code: '+964' },
  { iso: 'IE', name: 'Ireland', code: '+353' },
  { iso: 'IL', name: 'Israel', code: '+972' },
  { iso: 'IT', name: 'Italy', code: '+39' },
  { iso: 'JP', name: 'Japan', code: '+81' },
  { iso: 'JO', name: 'Jordan', code: '+962' },
  { iso: 'KZ', name: 'Kazakhstan', code: '+7' },
  { iso: 'KE', name: 'Kenya', code: '+254' },
  { iso: 'KW', name: 'Kuwait', code: '+965' },
  { iso: 'LB', name: 'Lebanon', code: '+961' },
  { iso: 'LY', name: 'Libya', code: '+218' },
  { iso: 'MY', name: 'Malaysia', code: '+60' },
  { iso: 'MX', name: 'Mexico', code: '+52' },
  { iso: 'MA', name: 'Morocco', code: '+212' },
  { iso: 'NL', name: 'Netherlands', code: '+31' },
  { iso: 'NZ', name: 'New Zealand', code: '+64' },
  { iso: 'NG', name: 'Nigeria', code: '+234' },
  { iso: 'NO', name: 'Norway', code: '+47' },
  { iso: 'OM', name: 'Oman', code: '+968' },
  { iso: 'PK', name: 'Pakistan', code: '+92' },
  { iso: 'PS', name: 'Palestine', code: '+970' },
  { iso: 'PH', name: 'Philippines', code: '+63' },
  { iso: 'PL', name: 'Poland', code: '+48' },
  { iso: 'PT', name: 'Portugal', code: '+351' },
  { iso: 'QA', name: 'Qatar', code: '+974' },
  { iso: 'RO', name: 'Romania', code: '+40' },
  { iso: 'RU', name: 'Russia', code: '+7' },
  { iso: 'SA', name: 'Saudi Arabia', code: '+966' },
  { iso: 'SG', name: 'Singapore', code: '+65' },
  { iso: 'ZA', name: 'South Africa', code: '+27' },
  { iso: 'KR', name: 'South Korea', code: '+82' },
  { iso: 'ES', name: 'Spain', code: '+34' },
  { iso: 'LK', name: 'Sri Lanka', code: '+94' },
  { iso: 'SD', name: 'Sudan', code: '+249' },
  { iso: 'SE', name: 'Sweden', code: '+46' },
  { iso: 'CH', name: 'Switzerland', code: '+41' },
  { iso: 'SY', name: 'Syria', code: '+963' },
  { iso: 'TW', name: 'Taiwan', code: '+886' },
  { iso: 'TH', name: 'Thailand', code: '+66' },
  { iso: 'TN', name: 'Tunisia', code: '+216' },
  { iso: 'TR', name: 'Türkiye', code: '+90' },
  { iso: 'UA', name: 'Ukraine', code: '+380' },
  { iso: 'AE', name: 'United Arab Emirates', code: '+971' },
  { iso: 'GB', name: 'United Kingdom', code: '+44' },
  { iso: 'US', name: 'United States', code: '+1' },
  { iso: 'VN', name: 'Vietnam', code: '+84' },
] as const;

export function filterCountryDialCodes(query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return countryDialCodes;

  return countryDialCodes.filter((item) =>
    `${item.name} ${item.iso} ${item.code}`
      .toLocaleLowerCase()
      .includes(normalizedQuery),
  );
}

export function validateContactForm(
  values: ContactFormValues,
): ContactFormErrors {
  const errors: ContactFormErrors = {};

  if (!values.name.trim()) errors.name = 'required';
  if (!values.country.trim()) errors.country = 'required';
  if (!values.message.trim()) errors.message = 'required';

  const email = values.email.trim();
  if (!email) {
    errors.email = 'required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'invalidEmail';
  }

  const phone = values.phone.trim();
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      errors.phone = 'invalidPhone';
    }
  }

  return errors;
}