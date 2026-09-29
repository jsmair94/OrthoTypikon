import { db, pool } from "./index";
import {
  calendarEntriesTable,
  calendarEntrySaintsTable,
  dailyContentTable,
  fastingGuidanceTable,
  fastingRecipesTable,
  learningEntriesTable,
  saintsTable,
} from "./schema";

type CalendarSeed = {
  date: string;
  feast?: string;
  fast?: string;
  saints: string[];
  liturgy?: string;
  color?: string;
};

const calendarData: CalendarSeed[] = [
  { date: "2026-01-01", feast: "عيد ختان الرب الإله", saints: ["القديس باسيليوس الكبير"], liturgy: "ليتورجيا إلهية · ٩:٠٠ صباحًا", color: "gold" },
  { date: "2026-01-06", feast: "عيد الظهور الإلهي", saints: ["القديس يوحنا المعمدان"], liturgy: "قداس وتقديس المياه · ٩:٠٠ صباحًا", color: "gold" },
  { date: "2026-01-07", feast: "عيد ميلاد الرب يسوع المسيح", saints: ["القديس إسطفانوس الشهيد الأول"], liturgy: "ليتورجيا الميلاد · ٩:٠٠ صباحًا", color: "gold" },
  { date: "2026-02-02", feast: "دخول الرب إلى الهيكل", saints: ["القديس سمعان الشيخ", "النبيّة حنّة"], liturgy: "ليتورجيا إلهية · ٩:٠٠ صباحًا", color: "gold" },
  { date: "2026-03-25", feast: "بشارة والدة الإله", saints: ["رئيس الملائكة جبرائيل"], liturgy: "ليتورجيا إلهية · ٩:٠٠ صباحًا", color: "gold" },
  { date: "2026-04-05", feast: "أحد الشعانين", fast: "أسبوع الآلام", saints: ["القديس لعازر الأربعة الأيام"], liturgy: "زياح الشعانين · ٩:٠٠ صباحًا", color: "rose" },
  { date: "2026-04-12", feast: "عيد القيامة المجيدة", saints: ["الرسل الأطهار"], liturgy: "خدمة الهجمة · منتصف الليل", color: "gold" },
  { date: "2026-05-21", feast: "عيد صعود الرب إلى السماء", saints: ["القديس قسطنطين والقديسة هيلانة"], liturgy: "ليتورجيا إلهية · ٩:٠٠ صباحًا", color: "gold" },
  { date: "2026-05-31", feast: "عيد العنصرة المقدس", saints: ["الرسل الأطهار"], liturgy: "صلاة السجدة · بعد القداس", color: "gold" },
  { date: "2026-08-06", feast: "عيد تجلي الرب", saints: ["القديس يوستينوس الشهيد"], liturgy: "ليتورجيا إلهية · ٩:٠٠ صباحًا", color: "gold" },
  { date: "2026-08-15", feast: "رقاد والدة الإله", fast: "صوم السيدة العذراء", saints: ["والدة الإله الفائقة القداسة"], liturgy: "ليتورجيا إلهية · ٩:٠٠ صباحًا", color: "gold" },
  { date: "2026-08-25", feast: "رقاد والدة الإله", fast: "صوم السيدة العذراء", saints: ["القديسة مريم المصرية", "القديس نيقولاوس", "القديس الشهيد فوتيوس"], liturgy: "ليتورجيا إلهية · ٩:٠٠ صباحًا", color: "gold" },
  { date: "2026-09-08", feast: "ميلاد والدة الإله", saints: ["والدة الإله الفائقة القداسة"], liturgy: "ليتورجيا إلهية · ٩:٠٠ صباحًا", color: "gold" },
  { date: "2026-09-14", feast: "رفع الصليب الكريم", fast: "صوم كامل", saints: ["القديس كبريانوس الشهيد"], liturgy: "ليتورجيا إلهية · ٩:٠٠ صباحًا", color: "rose" },
  { date: "2026-11-21", feast: "دخول والدة الإله إلى الهيكل", saints: ["والدة الإله الفائقة القداسة"], liturgy: "ليتورجيا إلهية · ٩:٠٠ صباحًا", color: "gold" },
  { date: "2026-12-25", feast: "ميلاد الرب يسوع المسيح", saints: ["القديس إسطفانوس الشهيد الأول"], liturgy: "ليتورجيا الميلاد · ٩:٠٠ صباحًا", color: "gold" },
];

const knownSaints = [
  {
    id: "mary-egypt",
    name: "القديسة مريم المصرية",
    feastMonth: 3,
    feastDay: 25,
    shortBio: "قديسة التوبة والرجاء",
    audioText: "في هذا اليوم نتذكر القديسة مريم المصرية، التي عاشت تحولًا عميقًا من حياة بعيدة عن الله إلى حياة توبة وصلاة في البرية. تركت كل ما يربطها بالماضي، وسارت سنوات طويلة في الصمت والصلاة. تعلمنا سيرتها أن رحمة الله تفتح بابًا جديدًا لكل إنسان، وأن التوبة ليست يأسًا من الذات بل رجوعًا إلى محبة الآب.",
  },
  {
    id: "basil",
    name: "القديس باسيليوس الكبير",
    feastMonth: 1,
    feastDay: 1,
    shortBio: "راعي التعليم والخدمة",
    audioText: "القديس باسيليوس الكبير كان راعيًا ولاهوتيًا ومدافعًا عن الفقراء. لم يفصل بين الإيمان والعمل، فأسس أماكن لخدمة المرضى والمحتاجين، وعلّم الكنيسة أن ما نملكه هو عطية مدعوون إلى مشاركتها.",
  },
  {
    id: "john-baptist",
    name: "القديس يوحنا المعمدان",
    feastMonth: 1,
    feastDay: 7,
    shortBio: "صوت التوبة في البرية",
    audioText: "القديس يوحنا المعمدان هو الصوت الصارخ في البرية، الذي أعد الطريق للرب بالدعوة إلى التوبة. عاش ببساطة وشجاعة، ولم يطلب المجد لنفسه بل أشار دائمًا إلى المسيح.",
  },
];

const specialFasting: Record<string, { level: "strict" | "oil" | "fish" | "none"; title: string; description: string; note?: string }> = {
  "2026-01-05": { level: "strict", title: "صوم الظهور الإلهي", description: "صوم استعدادًا لعيد الظهور الإلهي، مع طعام نباتي بسيط.", note: "تُراعى إرشادات الأب الروحي والحالة الصحية." },
  "2026-01-18": { level: "none", title: "لا صوم اليوم", description: "اليوم منحلّ من الصوم احتفالًا بعيد الظهور الإلهي." },
  "2026-02-16": { level: "strict", title: "بدء الصوم الكبير", description: "بداية مسيرة الصوم الكبير بالصلاة والتوبة والرحمة.", note: "الصوم ممارسة روحية تُعاش بإرشاد الكنيسة." },
  "2026-04-12": { level: "none", title: "عيد القيامة المجيدة", description: "فرح القيامة: لا صوم اليوم." },
  "2026-05-29": { level: "strict", title: "صوم الرسل", description: "نعيش صوم الرسل بالصلاة وخدمة القريب." },
  "2026-08-01": { level: "strict", title: "صوم السيدة العذراء", description: "بداية صوم رقاد والدة الإله، وهو صوم نباتي.", note: "تختلف بعض التفاصيل الرعائية بحسب الرعية." },
  "2026-08-06": { level: "fish", title: "عيد تجلي الرب", description: "يُسمح بالسمك احتفالًا بعيد التجلي.", note: "السمك المسموح لا يلغي روح الصلاة والاعتدال." },
  "2026-08-15": { level: "none", title: "رقاد والدة الإله", description: "عيد مبارك، لا صوم اليوم." },
  "2026-11-15": { level: "strict", title: "بدء صوم الميلاد", description: "بداية الاستعداد لميلاد الرب بالصلاة والصوم والصدقة." },
  "2026-12-25": { level: "none", title: "عيد ميلاد الرب", description: "فرح الميلاد: لا صوم اليوم." },
};

const recipes = [
  { id: "lentil-soup", title: "شوربة العدس الدافئة", subtitle: "غنية ومشبعة من دون زيت", time: "٣٥ دقيقة", level: "strict" as const, ingredients: ["كوب عدس أحمر", "بصلة مفرومة", "جزرتان", "كمون وملح", "٦ أكواب ماء"], steps: ["اغسل العدس وضعه مع الخضار والماء في قدر.", "اتركه يغلي ثم خفف النار حتى ينضج.", "أضف الكمون والملح واطحنه حسب الرغبة."] },
  { id: "olive-pasta", title: "معكرونة بالخضار والزيتون", subtitle: "طبق سريع مسموح فيه الزيت", time: "٢٥ دقيقة", level: "oil" as const, ingredients: ["معكرونة", "كوسا وفلفل ملون", "زيت زيتون", "زيتون أسود", "ثوم وريحان"], steps: ["اسلق المعكرونة واحتفظ بقليل من ماء السلق.", "شوّح الخضار بالزيت والثوم حتى تلين.", "اخلط المعكرونة مع الخضار والزيتون والريحان."] },
  { id: "baked-fish", title: "سمك مشوي بالليمون", subtitle: "وصفة احتفالية خفيفة", time: "٣٠ دقيقة", level: "fish" as const, ingredients: ["قطعة سمك أبيض", "ليمون", "ثوم", "زيت زيتون", "بقدونس وملح"], steps: ["تبّل السمك بالليمون والثوم والملح.", "ضعه في صينية مع القليل من الزيت.", "اخبزه حتى ينضج وقدمه مع سلطة موسمية."] },
];

const learning = [
  { id: "synaxarion-audio", category: "audio" as const, title: "السنكسار الصوتي", definition: "قراءة صوتية عربية لسير القديسين بحسب الأيام.", body: "محتوى صوتي تمهيدي يساعد على الصلاة والتأمل أثناء التنقل." },
  { id: "icon-theotokos", category: "icon" as const, title: "والدة الإله الفائقة القداسة", definition: "علامات النور والرجاء في أيقونة والدة الإله.", body: "يرمز اللون الذهبي إلى النور الإلهي، وتشير النجمة الثلاثية إلى بتوليتها." },
  { id: "anathema", category: "dictionary" as const, title: "أناثيما", alternate: "Ανάθεμα", pronunciation: "أناثيما", definition: "إعلان انفصال كنسي رسمي عن شركة الإيمان، وهو مصطلح تاريخي جاد لا يعني مجرد اللعن في الاستعمال اليومي." },
  { id: "troparion", category: "dictionary" as const, title: "تروبارية", alternate: "Τροπάριον", pronunciation: "تروبارِيُون", definition: "ترنيمة قصيرة تلخّص معنى العيد أو تذكار القديس وتُرتّل في صلوات الكنيسة." },
  { id: "antiphon", category: "dictionary" as const, title: "أنتيفونا", alternate: "Ἀντίφωνον", pronunciation: "أنتيفُون", definition: "مزمور أو ترنيمة تُرتّل بالتناوب بين جوقتين، وتُستخدم في الليتورجيا الإلهية." },
  { id: "synaxarion-dictionary", category: "dictionary" as const, title: "السنكسار", alternate: "Συναξάριον", pronunciation: "سينَكساريون", definition: "كتاب يجمع سير القديسين وقراءات أعياد السنة الكنسية بحسب الأيام." },
  { id: "liturgy", category: "dictionary" as const, title: "ليتورجيا", alternate: "Λειτουργία", pronunciation: "ليتورغيا", definition: "الخدمة العامة أو عمل الشعب، وتُستخدم للدلالة على خدمة القداس الإلهي." },
];

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function defaultFasting(date: string) {
  const special = specialFasting[date];
  if (special) return special;
  const calendar = calendarData.find((entry) => entry.date === date);
  if (calendar?.fast) {
    return {
      level: "strict" as const,
      title: calendar.fast,
      description: calendar.fast.includes("كامل")
        ? "يوم صوم كامل بحسب الرزنامة الكنسية."
        : "نعيش هذا الصوم بالصلاة والاعتدال والرحمة.",
    };
  }
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (weekday === 3 || weekday === 5) {
    return {
      level: "oil" as const,
      title: "صوم الأربعاء والجمعة",
      description: "صوم تذكاري أسبوعي، ويُسمح بالزيت في هذا الدليل المبدئي.",
    };
  }
  return {
    level: "none" as const,
    title: "لا صوم اليوم",
    description: "يمكن تناول الطعام باعتدال وشكر، مع الحفاظ على روح الصلاة.",
  };
}

async function seed() {
  const database = db;
  if (!database) throw new Error("DATABASE_URL must be set before seeding.");

  for (const saint of knownSaints) {
    await database.insert(saintsTable).values({ ...saint, locale: "ar", publicationStatus: "published" }).onConflictDoUpdate({
      target: saintsTable.id,
      set: saint,
    });
  }

  const saintIdByName = new Map(knownSaints.map((saint) => [saint.name, saint.id]));
  for (const entry of calendarData) {
    const calendarId = `calendar-${entry.date}`;
    await database.insert(calendarEntriesTable).values({
      id: calendarId,
      gregorianDate: entry.date,
      calendarSystem: "gregorian",
      locale: "ar",
      publicationStatus: "published",
      feastTitle: entry.feast ?? null,
      fastingTitle: entry.fast ?? null,
      liturgy: entry.liturgy ?? null,
      color: entry.color ?? null,
    }).onConflictDoUpdate({
      target: calendarEntriesTable.id,
      set: { gregorianDate: entry.date, feastTitle: entry.feast ?? null, fastingTitle: entry.fast ?? null, liturgy: entry.liturgy ?? null, color: entry.color ?? null },
    });

    for (const [index, name] of entry.saints.entries()) {
      const saintId = saintIdByName.get(name) ?? `calendar-saint-${entry.date}-${index}`;
      if (!saintIdByName.has(name)) {
        await database.insert(saintsTable).values({
          id: saintId,
          name,
          locale: "ar",
          shortBio: "تذكار من الرزنامة الكنسية.",
          audioText: `في هذا اليوم نتذكر ${name} ونطلب شفاعته.`,
          publicationStatus: "published",
        }).onConflictDoNothing();
        saintIdByName.set(name, saintId);
      }
      await database.insert(calendarEntrySaintsTable).values({ calendarEntryId: calendarId, saintId }).onConflictDoNothing();
    }
  }

  const dailyRowsByDate = new Map<
    string,
    { date: string; feastTitle: string | null; feastDescription: string | null }
  >();
  const seedYear = new Date().getUTCFullYear();
  const seedEndDate = addDays(`${seedYear + 1}-01-01`, 13);
  for (
    let day = `${seedYear}-01-01`;
    day <= seedEndDate;
    day = addDays(day, 1)
  ) {
    const calendarEntry = calendarData.find((entry) => entry.date === day);
    dailyRowsByDate.set(day, {
      date: day,
      feastTitle: calendarEntry?.feast ?? null,
      feastDescription: null,
    });
  }
  for (const row of [
    {
      date: "2026-08-25",
      feastTitle: "رقاد والدة الإله",
      feastDescription: "تذكار مبارك نعيشه اليوم مع الكنيسة الجامعة",
    },
    { date: "2026-08-26", feastTitle: null, feastDescription: null },
  ]) {
    dailyRowsByDate.set(row.date, row);
  }

  // These are generic defaults, not date-specific readings. Insert-only writes
  // preserve any editorial daily content already stored for the same date.
  const dailyRows = [...dailyRowsByDate.values()].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  for (const row of dailyRows) {
    await database.insert(dailyContentTable).values({
      id: `daily-${row.date}`,
      contentDate: row.date,
      calendarSystem: "gregorian",
      locale: "ar",
      publicationStatus: "published",
      verseReference: "يوحنا ١٤:٢٧",
      verseText: "سلامي أترك لكم. سلامي أعطيكم. ليس كما يعطي العالم أعطيكم أنا.",
      verseAuthor: "الإنجيل بحسب القديس يوحنا",
      feastTitle: row.feastTitle,
      feastDescription: row.feastDescription,
      readingTitle: "إنجيل متى",
      readingReference: "الإصحاح الخامس",
      readingDurationMinutes: 8,
    }).onConflictDoNothing();
  }

  for (let day = "2026-01-01"; day <= "2026-12-31"; day = addDays(day, 1)) {
    const guidance = defaultFasting(day);
    await database.insert(fastingGuidanceTable).values({
      id: `fasting-${day}`,
      contentDate: day,
      calendarSystem: "gregorian",
      locale: "ar",
      publicationStatus: "published",
      ...guidance,
    }).onConflictDoUpdate({
      target: fastingGuidanceTable.id,
      set: { contentDate: day, level: guidance.level, title: guidance.title, description: guidance.description, note: guidance.note ?? null, publicationStatus: "published" },
    });
  }

  for (const recipe of recipes) {
    await database.insert(fastingRecipesTable).values({ ...recipe, locale: "ar", publicationStatus: "published" }).onConflictDoUpdate({
      target: fastingRecipesTable.id,
      set: { ...recipe, publicationStatus: "published" },
    });
  }
  for (const entry of learning) {
    await database.insert(learningEntriesTable).values({ ...entry, locale: "ar", publicationStatus: "published" }).onConflictDoUpdate({
      target: learningEntriesTable.id,
      set: { ...entry, publicationStatus: "published" },
    });
  }
}

seed()
  .then(async () => {
    await pool?.end();
  })
  .catch(async (error) => {
    await pool?.end();
    throw error;
  });