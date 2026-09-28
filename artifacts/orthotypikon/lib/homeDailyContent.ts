export type SynaxarionDailyContent = {
  liturgicalLabel?: string | null;
  commemorations?: string | null;
  verse?: {
    text?: string | null;
    reference?: string | null;
  } | null;
};

export type HomeDailyFallback = {
  verseHeading: string;
  verse: string;
  verseReference: string;
  occasionTitle: string;
  occasionDescription: string;
};

export type HomeDailyContent = {
  verse: string;
  verseReference: string;
  occasionTitle: string;
  occasionDescription: string;
};

export function resolveHomeDailyContent(
  source: SynaxarionDailyContent | undefined,
  fallback: HomeDailyFallback,
): HomeDailyContent {
  const verseText = source?.verse?.text?.trim();
  const verseReference = source?.verse?.reference?.trim();

  return {
    verse: verseText ? `«${verseText}»` : fallback.verse,
    verseReference: `${fallback.verseHeading} · ${
      verseReference || fallback.verseReference
    }`,
    occasionTitle:
      source?.liturgicalLabel?.trim() || fallback.occasionTitle,
    occasionDescription:
      source?.commemorations?.trim() || fallback.occasionDescription,
  };
}