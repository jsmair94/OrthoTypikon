import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAnnualReminderDate,
  getNameDayChoices,
  getSavedNameChoice,
} from '../data/nameDays.ts';

test('name-day choices use the selected displayed date for both calendar systems', () => {
  const cases = [
    {
      calendarType: 'gregorian',
      feast: 'عيد الظهور الإلهي',
      saint: 'القديس يوحنا المعمدان',
    },
    {
      calendarType: 'julian',
      feast: 'برامون عيد الميلاد',
      saint: 'القديسة الشهيدة إفجينيا ورفقتها',
    },
  ];

  for (const { calendarType, feast, saint } of cases) {
    const choices = getNameDayChoices('2026-01-06', calendarType);
    const feastChoice = choices.find((choice) => choice.kind === 'feast');
    const saintChoice = choices.find((choice) => choice.kind === 'saint');

    assert.equal(feastChoice?.name, feast);
    assert.equal(saintChoice?.name, saint);
    assert.equal(feastChoice?.id, '2026-01-06-feast');
    assert.equal(saintChoice?.id, '2026-01-06-saint-0');
    assert.deepEqual(getAnnualReminderDate(feastChoice), { month: 1, day: 6 });
    assert.deepEqual(getAnnualReminderDate(saintChoice), { month: 1, day: 6 });
  }
});

test('a saved observance keeps its selected month and day for its annual reminder', () => {
  const choice = getNameDayChoices('2026-08-06', 'gregorian')
    .find((item) => item.kind === 'feast');
  assert.ok(choice);

  const saved = JSON.parse(JSON.stringify({
    id: 'family-member',
    person: 'Alex',
    observance: choice,
  }));
  const restored = getSavedNameChoice(saved);

  assert.equal(restored.id, '2026-08-06-feast');
  assert.equal(restored.calendarType, 'gregorian');
  assert.deepEqual(getAnnualReminderDate(restored), { month: 8, day: 6 });
});

test('legacy saintId-only saved entries still resolve to their saint', () => {
  const restored = getSavedNameChoice({
    id: 'legacy-entry',
    person: 'Mary',
    saintId: 'mary-egypt',
    notificationId: 'legacy-notification',
  });

  assert.equal(restored.name, 'القديسة مريم المصرية');
  assert.equal(restored.month, 3);
  assert.equal(restored.day, 25);
  assert.equal(restored.kind, 'saint');
  assert.equal(restored.calendarType, 'julian');
});