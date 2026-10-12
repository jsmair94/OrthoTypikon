import { createHash } from "node:crypto";
import OpenAI from "openai";
import { getDailyGospelReading } from "./synaxarion";

const AUDIO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHED_AUDIO_ITEMS = 7;
const AUDIO_VOICE = "onyx" as const;

const audioCache = new Map<
  string,
  { expiresAt: number; buffer: Buffer }
>();
const pendingAudio = new Map<string, Promise<Buffer>>();

let openaiClient: OpenAI | null = null;

export function prepareDailyGospelSpeechText(text: string) {
  return text
    .replace(/(^|\s)[0-9٠-٩۰-۹]{1,3}\s+(?=[\u0600-\u06FF])/gu, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function getOpenAIClient() {
  if (openaiClient) return openaiClient;

  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!apiKey || !baseURL) {
    throw new Error("The OpenAI AI integration is not configured.");
  }

  openaiClient = new OpenAI({
    apiKey,
    baseURL,
    maxRetries: 1,
    timeout: 60_000,
  });
  return openaiClient;
}

async function synthesizeArabicReading(text: string) {
  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-audio",
    modalities: ["text", "audio"],
    audio: { voice: AUDIO_VOICE, format: "mp3" },
    messages: [
      {
        role: "system",
        content:
          "Read Arabic prose as a careful audiobook narrator. Use clear, measured Modern Standard Arabic pronunciation and natural pauses. Ignore standalone verse-number markers. Preserve every other supplied word exactly; do not translate, explain, omit, or add words.",
      },
      {
        role: "user",
        content: `اقرأ النص العربي التالي بوضوح ووقفات طبيعية، مع تجاهل أرقام الآيات المستقلة، ودون إضافة أو حذف أي كلمة أخرى:\n\n${text}`,
      },
    ],
  });

  const message = response.choices[0]?.message as unknown as
    | { audio?: { data?: string } }
    | undefined;
  const encodedAudio = message?.audio?.data;
  if (!encodedAudio) {
    throw new Error("The speech service returned no audio.");
  }

  const buffer = Buffer.from(encodedAudio, "base64");
  if (buffer.length === 0) {
    throw new Error("The speech service returned empty audio.");
  }
  return buffer;
}

export async function getDailyGospelAudio(): Promise<Buffer | null> {
  const reading = await getDailyGospelReading();
  if (!reading?.text) return null;

  const speechText = prepareDailyGospelSpeechText(reading.text);
  if (!speechText.trim()) return null;

  const cacheKey = createHash("sha256")
    .update(speechText)
    .update(`\0${AUDIO_VOICE}\0mp3`)
    .digest("hex");
  const cached = audioCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.buffer;
  if (cached) audioCache.delete(cacheKey);

  const pending = pendingAudio.get(cacheKey);
  if (pending) return pending;

  const generation = synthesizeArabicReading(speechText).then((buffer) => {
    audioCache.set(cacheKey, {
      expiresAt: Date.now() + AUDIO_CACHE_TTL_MS,
      buffer,
    });
    while (audioCache.size > MAX_CACHED_AUDIO_ITEMS) {
      const oldestKey = audioCache.keys().next().value;
      if (!oldestKey) break;
      audioCache.delete(oldestKey);
    }
    return buffer;
  });
  pendingAudio.set(cacheKey, generation);

  try {
    return await generation;
  } finally {
    pendingAudio.delete(cacheKey);
  }
}