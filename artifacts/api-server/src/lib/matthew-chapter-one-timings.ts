import type { TimedBibleVerse } from "./bible-vtt";

const matthewChapterOneStartTimes = [
  4.5, 11, 20.5, 30, 40,
  ...Array.from({ length: 20 }, (_, index) => 50 + index * 10),
];

// Durations measured from the matching Matthew MP3 objects in Bible storage.
// These power an explicitly approximate fallback until a chapter WebVTT is available.
const matthewRecordingDurations: Record<number, number> = {
  2: 282.452,
  3: 201.056,
  4: 274.82,
  5: 493.52,
  6: 409.82,
  7: 311.612,
  8: 357.944,
  9: 405.824,
  10: 451.652,
  11: 333.86,
  12: 538.88,
  13: 666.752,
  14: 341.852,
  15: 391.532,
  16: 318.056,
  17: 306.356,
  18: 400.496,
  19: 345.92,
  20: 361.688,
  21: 532.4,
  22: 403.88,
  23: 439.16,
  24: 499.856,
  25: 469.292,
  26: 789.584,
  27: 646.88,
  28: 212.468,
};

const approximateChapterLeadInSeconds = 3;

export function createMatthewChapterOneTimings(text: string): TimedBibleVerse[] | null {
  const sourceVerses = parseNumberedVerses(text);

  if (
    !sourceVerses ||
    sourceVerses.length !== matthewChapterOneStartTimes.length
  ) {
    return null;
  }

  return sourceVerses.map((verse, index) => ({
    ...verse,
    startTime: matthewChapterOneStartTimes[index],
    endTime: matthewChapterOneStartTimes[index + 1] ?? verseEndTime(index),
  }));
}

export function createApproximateMatthewChapterTimings(
  chapter: number,
  text: string,
): TimedBibleVerse[] | null {
  const duration = matthewRecordingDurations[chapter];
  const sourceVerses = parseNumberedVerses(text);
  if (!duration || !sourceVerses || duration <= approximateChapterLeadInSeconds) return null;

  const weights = sourceVerses.map(
    (verse) => Math.max(1, verse.text.split(/\s+/u).filter(Boolean).length),
  );
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  const readingDuration = duration - approximateChapterLeadInSeconds;
  let elapsedWeight = 0;

  return sourceVerses.map((verse, index) => {
    const startTime = roundMilliseconds(
      approximateChapterLeadInSeconds + (readingDuration * elapsedWeight) / totalWeight,
    );
    elapsedWeight += weights[index];
    const endTime =
      index === sourceVerses.length - 1
        ? duration
        : roundMilliseconds(
            approximateChapterLeadInSeconds + (readingDuration * elapsedWeight) / totalWeight,
          );
    return { ...verse, startTime, endTime };
  });
}

function parseNumberedVerses(text: string): { number: number; text: string }[] | null {
  const sourceVerses: { number: number; text: string }[] = [];

  for (const line of text.split(/\r?\n/)) {
    const match = line.trim().match(/^(\d+)\.\s*(.*)$/u);
    if (match) {
      sourceVerses.push({ number: Number(match[1]), text: match[2].trim() });
    } else if (sourceVerses.length && line.trim()) {
      sourceVerses[sourceVerses.length - 1].text += ` ${line.trim()}`;
    }
  }

  if (
    !sourceVerses.length ||
    sourceVerses.some((verse, index) => verse.number !== index + 1 || !verse.text)
  ) {
    return null;
  }
  return sourceVerses;
}

function roundMilliseconds(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function verseEndTime(index: number): number {
  return matthewChapterOneStartTimes[index] + 10;
}
