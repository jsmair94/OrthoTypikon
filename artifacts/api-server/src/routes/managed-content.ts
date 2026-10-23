import { Router, type IRouter } from "express";

const managedContentKeys = new Set(["prayer-library", "broadcasts", "about"]);
const aboutLocales = ["ar", "en", "el"] as const;

export type ManagedContentKey = "prayer-library" | "broadcasts" | "about";
export type ManagedContentRecord = {
  content: Record<string, unknown>;
  updatedAt: Date;
};
export type ManagedContentStore = {
  get(key: ManagedContentKey): Promise<ManagedContentRecord | null>;
  save(
    key: ManagedContentKey,
    content: Record<string, unknown>,
  ): Promise<ManagedContentRecord>;
};

function isManagedContentKey(value: unknown): value is ManagedContentKey {
  return typeof value === "string" && managedContentKeys.has(value);
}

function isValidPrayerLibrary(value: Record<string, unknown>) {
  return aboutLocales.every((locale) => {
    const collections = value[locale];
    if (!collections || typeof collections !== "object" || Array.isArray(collections)) return false;
    return Object.values(collections as Record<string, unknown>).every((collection) => {
      if (!collection || typeof collection !== "object" || Array.isArray(collection)) return false;
      const record = collection as Record<string, unknown>;
      if (typeof record.description !== "string" || !Array.isArray(record.entries)) return false;
      const ids = new Set<string>();
      return record.entries.every((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
        const prayer = entry as Record<string, unknown>;
        if (![prayer.id, prayer.title, prayer.reference, prayer.text].every((field) => typeof field === "string" && field.trim())) return false;
        if (ids.has(prayer.id as string)) return false;
        ids.add(prayer.id as string);
        return true;
      });
    });
  });
}

function isValidBroadcastSettings(value: Record<string, unknown>) {
  return ["livePlayerUrl", "radioPlayerUrl"].every((field) => {
    try {
      const url = new URL(String(value[field] ?? ""));
      return url.protocol === "https:";
    } catch {
      return false;
    }
  });
}

function isValidAboutContent(value: Record<string, unknown>) {
  return aboutLocales.every((locale) => {
    const translation = value[locale];
    return Boolean(
      translation &&
      typeof translation === "object" &&
      !Array.isArray(translation) &&
      typeof (translation as Record<string, unknown>).aboutBody === "string" &&
      ((translation as Record<string, unknown>).aboutBody as string).trim(),
    );
  });
}

function validationMessage(key: ManagedContentKey) {
  return key === "prayer-library"
    ? "Prayer content must include valid Arabic, English, and Greek collections."
    : key === "broadcasts"
      ? "Broadcast player URLs must both use HTTPS."
      : "About content must include non-empty Arabic, English, and Greek paragraphs.";
}

export function createManagedContentRouter(store: ManagedContentStore): IRouter {
  const router: IRouter = Router();

  router.get("/content/:key", async (req, res): Promise<void> => {
    if (!isManagedContentKey(req.params.key)) {
      res.status(404).json({ message: "Content not found." });
      return;
    }
    const row = await store.get(req.params.key);
    if (!row) {
      res.status(404).json({ message: "Managed content has not been published." });
      return;
    }
    res.json({ content: row.content });
  });

  router.get("/admin/managed-content/:key", async (req, res): Promise<void> => {
    if (!isManagedContentKey(req.params.key)) {
      res.status(404).json({ message: "Content not found." });
      return;
    }
    const row = await store.get(req.params.key);
    res.json({
      content: row?.content ?? null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    });
  });

  router.put("/admin/managed-content/:key", async (req, res): Promise<void> => {
    if (!isManagedContentKey(req.params.key) || !req.body?.content ||
        typeof req.body.content !== "object" || Array.isArray(req.body.content)) {
      res.status(400).json({ message: "Provide a supported content key and a JSON object." });
      return;
    }
    const content = req.body.content as Record<string, unknown>;
    const isValid = req.params.key === "prayer-library"
      ? isValidPrayerLibrary(content)
      : req.params.key === "broadcasts"
        ? isValidBroadcastSettings(content)
        : isValidAboutContent(content);
    if (!isValid) {
      res.status(400).json({ message: validationMessage(req.params.key) });
      return;
    }

    const row = await store.save(req.params.key, content);
    res.json({ content: row.content, updatedAt: row.updatedAt.toISOString() });
  });

  return router;
}
