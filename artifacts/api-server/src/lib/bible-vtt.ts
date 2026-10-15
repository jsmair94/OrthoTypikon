export type TimedBibleVerse = {
  number: number;
  text: string;
  startTime: number;
  endTime: number;
};

function parseTimestamp(value: string): number | null {
  const match = value.trim().match(/^(?:(\d+):)?([0-5]?\d):([0-5]\d)[.,](\d{3})$/);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4]);
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

function cleanCueText(value: string): string {
  return value
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

export function parseBibleWebVtt(source: string): TimedBibleVerse[] {
  const blocks = source.replace(/^\uFEFF/, "").replace(/\r/g, "").split(/\n{2,}/);
  const verses: TimedBibleVerse[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim());
    if (!lines.length || lines[0] === "WEBVTT" || /^(NOTE|STYLE|REGION)(\s|$)/.test(lines[0])) continue;

    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;
    const timing = lines[timingIndex].match(/^(.+?)\s+-->\s+(.+?)(?:\s+.*)?$/);
    if (!timing) continue;

    const startTime = parseTimestamp(timing[1]);
    const endTime = parseTimestamp(timing[2]);
    const text = cleanCueText(lines.slice(timingIndex + 1).join("\n"));
    if (startTime === null || endTime === null || endTime <= startTime || !text) continue;

    verses.push({ number: verses.length + 1, text, startTime, endTime });
  }

  return verses;
}

export function alignBibleWebVttToChapterText(
  chapterText: string,
  timedVerses: TimedBibleVerse[],
): TimedBibleVerse[] | null {
  const sourceVerses: { number: number; text: string }[] = [];

  for (const line of chapterText.split(/\r?\n/)) {
    const match = line.trim().match(/^(\d+)\.\s*(.*)$/u);
    if (match) {
      sourceVerses.push({ number: Number(match[1]), text: match[2].trim() });
    } else if (sourceVerses.length && line.trim()) {
      sourceVerses[sourceVerses.length - 1].text += ` ${line.trim()}`;
    }
  }

  if (!sourceVerses.length) return timedVerses.length ? timedVerses : null;
  if (
    sourceVerses.length !== timedVerses.length ||
    sourceVerses.some(
      (verse, index) => verse.number !== index + 1 || !verse.text || timedVerses[index]?.number !== index + 1,
    )
  ) {
    return null;
  }

  return sourceVerses.map((verse, index) => ({
    ...verse,
    startTime: timedVerses[index].startTime,
    endTime: timedVerses[index].endTime,
  }));
}
