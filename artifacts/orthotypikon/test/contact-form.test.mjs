import assert from 'node:assert/strict';
import test from 'node:test';
import {
  countryDialCodes,
  filterCountryDialCodes,
  validateContactForm,
} from '../lib/contactForm.ts';
import { filterCountryOptions, getCountryOptions } from '../data/countries.ts';
import { moreContent } from '../data/moreContent.ts';

const validForm = {
  name: 'Alex Example',
  email: 'alex@example.org',
  country: 'US',
  phone: '+1 202 555 0142',
  message: 'I have a question about the calendar.',
  dialCode: '',
};

test('contact form requires name, email, country, and message, but not phone', () => {
  assert.deepEqual(validateContactForm({
    name: '  ',
    email: '',
    country: '',
    phone: '',
    message: '',
    dialCode: '',
  }), {
    name: 'required',
    email: 'required',
    country: 'required',
    message: 'required',
  });
});

test('phone is optional, but a provided phone number must be valid', () => {
  assert.deepEqual(validateContactForm({ ...validForm, phone: '' }), {});
  assert.deepEqual(validateContactForm({ ...validForm, phone: '123' }), {
    phone: 'invalidPhone',
  });
});

test('valid contact details pass without a selected calling code', () => {
  assert.deepEqual(validateContactForm(validForm), {});
});

test('email and phone errors are reported independently', () => {
  assert.deepEqual(validateContactForm({
    ...validForm,
    email: 'not-an-email',
    phone: '123',
  }), {
    email: 'invalidEmail',
    phone: 'invalidPhone',
  });
});

test('calling-code choices can be searched by country or code', () => {
  assert.ok(filterCountryDialCodes('Jordan').some((item) => item.iso === 'JO'));
  assert.ok(filterCountryDialCodes('+970').some((item) => item.iso === 'PS'));
  assert.ok(countryDialCodes.length >= 60);
});

test('country choices include a searchable, localized list of names', () => {
  const englishCountries = getCountryOptions('en');
  const arabicCountries = getCountryOptions('ar');
  assert.equal(englishCountries.length, 250);
  assert.ok(englishCountries.some((item) => item.iso === 'US' && item.name === 'United States'));
  assert.ok(filterCountryOptions('palestine', englishCountries).some((item) => item.iso === 'PS'));
  assert.ok(filterCountryOptions('jo', englishCountries).some((item) => item.iso === 'JO'));
  assert.notEqual(
    arabicCountries.find((item) => item.iso === 'US')?.name,
    englishCountries.find((item) => item.iso === 'US')?.name,
  );
});

test('contact form copy and the not-connected disclosure exist in all supported languages', () => {
  for (const language of ['ar', 'en', 'el']) {
    const copy = moreContent[language].contactForm;
    assert.ok(copy.name);
    assert.ok(copy.email);
    assert.ok(copy.country);
    assert.ok(copy.chooseCountry);
    assert.ok(copy.searchCountry);
    assert.ok(copy.noCountriesFound);
    assert.ok(copy.phone);
    assert.ok(copy.optional);
    assert.ok(copy.message);
    assert.ok(copy.submitNotice);
  }
});