export type TimedBibleVerse = {
  number: number;
  text: string;
  startTime: number;
  endTime: number;
};

export function findActiveBibleVerse(verses: TimedBibleVerse[], currentTime: number): TimedBibleVerse | null {
  if (!Number.isFinite(currentTime) || currentTime < 0) return null;
  return verses.find((verse) => currentTime >= verse.startTime && currentTime < verse.endTime) ?? null;
}
