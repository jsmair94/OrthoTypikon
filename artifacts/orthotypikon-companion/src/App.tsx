import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, BookOpen, CalendarDays, ChevronLeft, ChevronRight,
  CircleAlert, Clock3, ExternalLink, Headphones, Menu, Radio, Search, Star,
  Sun, X, Utensils, Waves, type LucideIcon,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import {
  useGetCalendarByDate,
  useGetDailyContent,
  useGetFastingByDate,
  useGetSaint,
  useGetSynaxarionHomepage,
  useListCalendarByMonth,
  useListLearningEntries,
  useListSaints,
} from '@workspace/api-client-react';
import type { CalendarType, LearningCategory } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
type Locale = 'ar' | 'en';
type Icon = LucideIcon;
const liveUrl = 'https://iframe.dacast.com/live/5b5db9ba-4c13-8bb5-6bc4-cd42ee652aa1/07d3cb7c-1a21-ccdc-128d-6817f25ff78a?autoplay=true';
const radioUrl = 'https://orthodoxjo.tv/audio/%D8%B5%D9%88%D8%AA-%D8%A7%D9%84%D9%83%D9%86%D9%8A%D8%B3%D8%A9';

const copy = {
  ar: {
    nav: { home: 'اليوم', calendar: 'الرزنامة', fasting: 'دليل الصوم', saints: 'القديسون', learning: 'تعلّم', live: 'البث المباشر' },
    brand: 'أرثوذكس تيبيكون', tagline: 'رفيقك لليوم الكنسي',
    today: 'اليوم', welcome: 'يومك مع الكنيسة', verse: 'آية للتأمل', feast: 'مناسبة اليوم',
    saints: 'قديسو اليوم', fasting: 'دليل الصوم', reading: 'قراءة مرتبطة', read: 'قراءة اليوم',
    synax: 'السنكسار الحي', commemorations: 'تذكارات اليوم', source: 'المصدر الأصلي', open: 'فتح المصدر',
    calendar: 'الرزنامة الليتورجية', calendarSub: 'تنقّل بين أيام السنة الكنسية', selectedDay: 'تفاصيل اليوم',
    month: 'الشهر', previous: 'السابق', next: 'التالي', eastern: 'اليولياني الشرقي', western: 'الغريغوري الغربي',
    chooseDate: 'اختر تاريخًا', noData: 'لا توجد بيانات لهذا اليوم.', noSaints: 'لا توجد أسماء مطابقة.',
    directory: 'دليل القديسين', directorySub: 'اقرأ سير القديسين وتذكاراتهم', searchSaint: 'ابحث عن قديس',
    learning: 'تعلّم مع الكنيسة', learningSub: 'قاموس ومداخل قصيرة لفهم الصلاة والليتورجيا', searchLearning: 'ابحث في القاموس',
    fastingTitle: 'الأصوام والوصفات', fastingSub: 'إرشاد يومي هادئ ومحدد بالتاريخ', recipes: 'وصفات مناسبة لليوم',
    ingredients: 'المقادير', steps: 'الطريقة', guidance: 'هذا الدليل للتذكير والتنظيم ولا يغني عن إرشاد الأب الروحي أو مراعاة الحالة الصحية.',
    live: 'البث الكنسي المباشر', liveSub: 'صلوات وترانيم وبرامج كنسية من المحطة الأرثوذكسية',
    channel: 'المحطة الأرثوذكسية', radio: 'راديو صوت الكنيسة', play: 'تشغيل', stop: 'إيقاف', external: 'فتح خارجيًا',
    browserFallback: 'إذا منع المتصفح التضمين، افتح البث في نافذة جديدة.', unavailable: 'تعذر تحميل هذا المحتوى.',
    retry: 'إعادة المحاولة', loading: 'جارٍ التحميل', min: 'دقائق', feastEmpty: 'لا توجد مناسبة مسجلة',
  },
  en: {
    nav: { home: 'Today', calendar: 'Calendar', fasting: 'Fasting', saints: 'Saints', learning: 'Learn', live: 'Live' },
    brand: 'OrthoTypikon', tagline: 'Your companion for the church day',
    today: 'Today', welcome: 'Your day with the Church', verse: 'Verse for reflection', feast: "Today's occasion",
    saints: "Saints of the day", fasting: 'Fasting guide', reading: 'Related reading', read: "Today's reading",
    synax: 'Live Synaxarion', commemorations: "Today's commemorations", source: 'Original source', open: 'Open source',
    calendar: 'Liturgical calendar', calendarSub: 'Move through the church year', selectedDay: 'Day details',
    month: 'Month', previous: 'Previous', next: 'Next', eastern: 'Eastern Julian', western: 'Western Gregorian',
    chooseDate: 'Choose a date', noData: 'No content is recorded for this day.', noSaints: 'No matching names.',
    directory: 'Saints directory', directorySub: 'Read the lives and commemorations of the saints', searchSaint: 'Search saints',
    learning: 'Learn with the Church', learningSub: 'Short entries for prayer and liturgy', searchLearning: 'Search the glossary',
    fastingTitle: 'Fasts & recipes', fastingSub: 'Date-specific guidance for a quieter day', recipes: "Recipes for today",
    ingredients: 'Ingredients', steps: 'Method', guidance: 'This guide is for reminder and planning. It does not replace pastoral guidance or attention to your health.',
    live: 'Live church broadcast', liveSub: 'Prayers, hymns, and church programmes from the Orthodox Station',
    channel: 'Orthodox Station', radio: 'Voice of the Church Radio', play: 'Play', stop: 'Stop', external: 'Open externally',
    browserFallback: 'If the browser blocks embedding, open the stream in a new window.', unavailable: 'This content could not be loaded.',
    retry: 'Try again', loading: 'Loading', min: 'min', feastEmpty: 'No occasion recorded',
  },
} as const;

function dateKey(date = new Date()) {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function shiftDate(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + amount);
  return dateKey(value);
}
function monthLabel(month: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' }).format(new Date(`${month}-15T12:00:00`));
}
function dateLabel(date: string, locale: Locale, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', opts).format(new Date(`${date}T12:00:00`));
}

function Meta({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    document.title = `${title} · OrthoTypikon`;
    const set = (name: string, content: string) => {
      let node = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!node) { node = document.createElement('meta'); node.name = name; document.head.appendChild(node); }
      node.content = content;
    };
    set('description', description);
    const og = (property: string, content: string) => {
      let node = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!node) { node = document.createElement('meta'); node.setAttribute('property', property); document.head.appendChild(node); }
      node.content = content;
    };
    og('og:title', `${title} · OrthoTypikon`);
    og('og:description', description);
    og('og:type', 'website');
  }, [description, title]);
  return null;
}

function useApp() {
  const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem('orthotypikon-locale') as Locale) || 'ar');
  const [calendarType, setCalendarType] = useState<CalendarType>(() => (localStorage.getItem('orthotypikon-calendar') as CalendarType) || 'gregorian');
  const changeLocale = (next: Locale) => { setLocale(next); localStorage.setItem('orthotypikon-locale', next); };
  const changeCalendar = (next: CalendarType) => { setCalendarType(next); localStorage.setItem('orthotypikon-calendar', next); };
  return { locale, calendarType, changeLocale, changeCalendar, t: copy[locale], rtl: locale === 'ar' };
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const app = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = [
    ['/', app.t.nav.home, Sun],
    ['/calendar', app.t.nav.calendar, CalendarDays],
    ['/fasting', app.t.nav.fasting, Utensils],
    ['/saints', app.t.nav.saints, Star],
    ['/learning', app.t.nav.learning, BookOpen],
    ['/live', app.t.nav.live, Radio],
  ] as const;
  return <div dir={app.rtl ? 'rtl' : 'ltr'} className="min-h-[100dvh] bg-background">
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-4 sm:px-7">
        <button data-testid="button-mobile-menu" className="rounded-xl p-2 text-muted-foreground md:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu"><Menu size={21} /></button>
        <Link href="/" className="flex items-center gap-3 no-underline" data-testid="link-brand">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary text-accent shadow-sm"><span className="font-display text-2xl leading-none">+</span></span>
          <span><span className="block font-display text-xl font-bold tracking-tight text-primary">{app.locale === 'ar' ? 'أرثوذكس تيبيكون' : 'OrthoTypikon'}</span><span className="hidden text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground sm:block">{app.t.tagline}</span></span>
        </Link>
        <nav className={`${mobileOpen ? 'absolute left-4 right-4 top-[68px] flex' : 'hidden'} flex-col gap-1 rounded-2xl border border-border bg-card p-2 shadow-lg md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none`} aria-label="Main navigation">
          {nav.map(([href, label, IconComponent]) => <Link key={href} href={href} data-testid={`link-nav-${label}`} onClick={() => setMobileOpen(false)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${location === href ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><IconComponent size={16} strokeWidth={1.8} />{label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <button data-testid="button-calendar-toggle" onClick={() => app.changeCalendar(app.calendarType === 'gregorian' ? 'julian' : 'gregorian')} className="hidden rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-primary sm:block">{app.calendarType === 'gregorian' ? app.t.western : app.t.eastern}</button>
          <div className="flex rounded-xl border border-border bg-card p-1">
            {(['ar', 'en'] as Locale[]).map((lang) => <button key={lang} data-testid={`button-language-${lang}`} onClick={() => app.changeLocale(lang)} className={`rounded-lg px-2.5 py-1 text-xs font-bold ${app.locale === lang ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{lang === 'ar' ? 'ع' : 'EN'}</button>)}
          </div>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-[1240px] px-4 py-7 sm:px-7 sm:py-10">{children}</main>
    <footer className="mx-auto flex max-w-[1240px] flex-col gap-3 border-t border-border/70 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-7"><span className="font-display text-base font-bold text-primary">أرثوذكس تيبيكون · OrthoTypikon</span><span>{app.rtl ? 'محتوى للقراءة والصلاة في اليوم الكنسي' : 'A reading companion for the church day'}</span></footer>
  </div>;
}

function PageIntro({ eyebrow, title, description, icon: IconComponent }: { eyebrow: string; title: string; description: string; icon: Icon }) {
  return <div className="mb-8 fade-up"><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.17em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{eyebrow}</div><h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{title}</h1><p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">{description}</p><IconComponent className="mt-5 text-accent/70" size={28} strokeWidth={1.3} /></div>;
}
function State({ loading, error, empty, retry, errorText }: { loading?: boolean; error?: boolean; empty?: string; retry?: () => void; errorText?: string }) {
  if (loading) return <div className="grid gap-3"><div className="h-20 animate-pulse rounded-2xl bg-muted" /><div className="h-32 animate-pulse rounded-2xl bg-muted" /></div>;
  if (error) return <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center"><CircleAlert className="mx-auto mb-2 text-destructive" size={22} /><p className="text-sm text-muted-foreground">{errorText || 'تعذر تحميل المحتوى.'}</p><button data-testid="button-retry" onClick={retry} className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">إعادة المحاولة</button></div>;
  if (empty) return <div className="rounded-2xl border border-dashed border-border p-9 text-center text-sm text-muted-foreground">{empty}</div>;
  return null;
}
function SectionLabel({ children, href }: { children: ReactNode; href?: string }) {
  return <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-display text-2xl font-bold text-foreground">{children}</h2>{href && <Link href={href} className="text-xs font-bold text-primary underline-offset-4 hover:underline">عرض الكل</Link>}</div>;
}

function Home() {
  const app = useApp(), today = dateKey();
  const daily = useGetDailyContent({ date: today, locale: app.locale, calendarType: app.calendarType });
  const synax = useGetSynaxarionHomepage({ locale: app.locale });
  const d = daily.data, s = synax.data;
  return <><Meta title={app.t.today} description={app.t.welcome} /><div className="space-y-8">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end fade-up"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-primary">{app.t.today} · {dateLabel(today, app.locale)}</p><h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">{app.t.welcome}</h1></div><Link href="/calendar" className="flex w-fit items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs font-bold text-primary hover:bg-secondary" data-testid="link-today-calendar"><CalendarDays size={16} />{app.t.calendar}</Link></div>
    <State loading={daily.isLoading} error={daily.isError} errorText={app.locale === 'ar' ? 'لا يتوفر محتوى يومي مسجل لهذا التاريخ بهذه اللغة.' : 'No daily content is recorded for this date in this language.'} retry={() => void daily.refetch()} />
    {d && <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
      <section className="relative overflow-hidden rounded-[28px] bg-primary p-6 text-primary-foreground shadow-[0_20px_45px_rgba(19,44,64,.13)] sm:p-9 fade-up stagger-1"><div className="absolute -left-10 -top-16 h-48 w-48 rounded-full border border-accent/30" /><div className="absolute -bottom-24 right-14 h-60 w-60 rounded-full border border-accent/20" /><div className="relative"><div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-accent"><BookOpen size={15} />{app.t.verse}</div><blockquote data-testid="text-daily-verse" className="font-display text-3xl leading-[1.5] sm:text-4xl">{d.verse.text}</blockquote><div className="mt-6 flex items-center justify-between border-t border-primary-foreground/15 pt-4 text-xs text-primary-foreground/65"><span>{d.verse.reference}</span><span>{d.verse.author}</span></div></div></section>
      <div className="grid gap-5">
        <div className="rounded-[24px] border border-border bg-card p-6 fade-up stagger-2"><div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-accent"><Star size={15} />{app.t.feast}</div>{d.feast ? <><h2 data-testid="text-feast-title" className="font-display text-2xl font-bold text-primary">{d.feast.title}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{d.feast.description}</p></> : <p className="text-sm text-muted-foreground">{app.t.feastEmpty}</p>}</div>
        <div className="grid grid-cols-2 gap-5">
          <div className="rounded-[24px] border border-border bg-card p-5"><div className="mb-4 text-accent"><Sun size={20} /></div><p className="text-xs font-semibold text-muted-foreground">{app.t.saints}</p><p className="mt-2 text-2xl font-bold text-primary">{d.saints.length}</p></div>
          <div className="rounded-[24px] border border-border bg-secondary p-5"><div className="mb-4 text-primary"><Utensils size={20} /></div><p className="text-xs font-semibold text-muted-foreground">{app.t.fasting}</p><p className="mt-2 text-base font-bold text-primary">{d.fasting?.title || app.t.noData}</p></div>
        </div>
      </div>
    </div>}
    {d && <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <section className="rounded-[24px] border border-border bg-card p-6"><SectionLabel href="/saints">{app.t.saints}</SectionLabel><div className="space-y-1">{d.saints.length ? d.saints.map((saint) => <Link href={`/saints/${saint.id}`} key={saint.id} data-testid={`link-home-saint-${saint.id}`} className="flex items-center gap-3 rounded-xl p-3 hover:bg-secondary"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-accent"><Star size={15} /></span><span className="min-w-0 flex-1"><strong className="block text-sm text-foreground">{saint.name}</strong><span className="block truncate text-xs text-muted-foreground">{saint.shortBio}</span></span><ChevronLeft size={16} className="text-muted-foreground rtl:rotate-180" /></Link>) : <p className="text-sm text-muted-foreground">{app.t.noSaints}</p>}</div></section>
      <section className="rounded-[24px] border border-border bg-card p-6"><SectionLabel>{app.t.reading}</SectionLabel>{d.relatedReading ? <div className="flex items-center gap-4 rounded-2xl bg-secondary/65 p-5"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-accent"><BookOpen size={21} /></span><div className="min-w-0"><h3 className="font-display text-xl font-bold text-primary">{d.relatedReading.title}</h3><p className="mt-1 text-sm text-muted-foreground">{d.relatedReading.reference}</p>{d.relatedReading.durationMinutes && <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Clock3 size={13} />{d.relatedReading.durationMinutes} {app.t.min}</span>}</div></div> : <p className="text-sm text-muted-foreground">{app.t.noData}</p>}</section>
    </div>}
    {synax.isLoading && <State loading />}
    {synax.isError && <State errorText={app.locale === 'ar' ? 'تعذر تحميل السنكسار الحي.' : 'The live Synaxarion could not be loaded.'} error retry={() => void synax.refetch()} />}
    {s && <section className="overflow-hidden rounded-[26px] bg-[#142f43] text-[#f8f1df] fade-up stagger-3"><div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_260px]"><div><div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-accent"><Waves size={15} />{app.t.synax}</div><p className="text-xs text-[#f8f1df]/60">{s.dateLabel} · {s.liturgicalLabel}</p><h2 className="mt-5 font-display text-3xl font-bold">{s.commemorations}</h2><p className="mt-5 max-w-2xl font-display text-xl leading-9 text-[#f8f1df]/90">“{s.verse.text}”</p><p className="mt-2 text-xs text-[#f8f1df]/55">{s.verse.reference}</p><div className="mt-7 flex flex-wrap gap-3">{s.sourceUrl && <a href={s.sourceUrl} target="_blank" rel="noreferrer" data-testid="link-synax-source" className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-xs font-bold text-primary">{app.t.open}<ExternalLink size={14} /></a>}{s.gospelUrl && <a href={s.gospelUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#f8f1df]/20 px-4 py-3 text-xs font-bold text-[#f8f1df]">{app.t.read}<ArrowLeft size={14} /></a>}</div></div><div className="relative min-h-[220px] overflow-hidden rounded-2xl border border-accent/35 bg-[#203e51]">{s.saintImageUrl && <img src={s.saintImageUrl} alt={s.commemorations} className="h-full min-h-[220px] w-full object-cover opacity-90" />}</div></div></section>}
  </div></>;
}

function CalendarPage() {
  const app = useApp(), [month, setMonth] = useState(dateKey().slice(0, 7)), [selected, setSelected] = useState(dateKey());
  const list = useListCalendarByMonth({ month, locale: app.locale, calendarType: app.calendarType });
  const detail = useGetCalendarByDate(selected, { locale: app.locale, calendarType: app.calendarType });
  const entries = list.data || [];
  const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const first = new Date(`${month}-01T12:00:00`).getDay();
  const goMonth = (delta: number) => { const d = new Date(`${month}-15T12:00:00`); d.setMonth(d.getMonth() + delta); const next = dateKey(d).slice(0, 7); setMonth(next); setSelected(`${next}-01`); };
  const weekdays = app.locale === 'ar' ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return <><Meta title={app.t.calendar} description={app.t.calendarSub} /><PageIntro eyebrow={app.t.calendar} title={app.t.calendar} description={app.t.calendarSub} icon={CalendarDays} /><div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
    <section className="rounded-[26px] border border-border bg-card p-4 sm:p-6"><div className="mb-6 flex items-center justify-between"><button data-testid="button-calendar-prev" onClick={() => goMonth(-1)} className="rounded-xl bg-secondary p-3 text-primary"><ChevronRight size={18} /></button><div className="text-center"><h2 className="font-display text-2xl font-bold text-primary">{monthLabel(month, app.locale)}</h2><p className="mt-1 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">{app.calendarType === 'gregorian' ? app.t.western : app.t.eastern}</p></div><button data-testid="button-calendar-next" onClick={() => goMonth(1)} className="rounded-xl bg-secondary p-3 text-primary"><ChevronLeft size={18} /></button></div><div className="grid grid-cols-7 gap-1">{weekdays.map((day, i) => <span key={`${day}-${i}`} className="py-2 text-center text-xs font-bold text-muted-foreground">{day}</span>)}{Array.from({ length: first }).map((_, i) => <span key={`empty-${i}`} />)}{Array.from({ length: days }, (_, i) => { const day = i + 1, date = `${month}-${String(day).padStart(2, '0')}`, entry = entries.find((item) => item.date === date || item.canonicalDate === date); return <button key={date} data-testid={`button-calendar-day-${date}`} onClick={() => setSelected(date)} className={`relative flex min-h-14 flex-col items-center justify-center rounded-xl text-sm font-semibold transition-colors ${selected === date ? 'bg-primary text-primary-foreground' : entry ? 'bg-secondary text-primary hover:bg-accent/30' : 'text-foreground hover:bg-muted'}`}>{day}{entry && <span className={`mt-1 h-1 w-1 rounded-full ${selected === date ? 'bg-accent' : 'bg-accent'}`} />}</button>; })}</div><State loading={list.isLoading} error={list.isError} retry={() => void list.refetch()} empty={!list.isLoading && !list.isError && !entries.length ? app.t.noData : undefined} /></section>
    <section className="rounded-[26px] border border-border bg-card p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-accent"><CalendarDays size={21} /></span><div><p className="text-xs font-bold uppercase tracking-[.15em] text-primary">{app.t.selectedDay}</p><p className="mt-1 text-xs text-muted-foreground">{dateLabel(selected, app.locale)}</p></div></div><State loading={detail.isLoading} error={detail.isError} retry={() => void detail.refetch()} empty={!detail.isLoading && !detail.isError && !detail.data ? app.t.noData : undefined} />{detail.data && <div className="space-y-5">{detail.data.feast && <div className="border-b border-border pb-5"><h2 className="font-display text-2xl font-bold text-primary">{detail.data.feast.title}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{detail.data.feast.description}</p></div>}<InfoRow icon={Utensils} label={app.t.fasting} value={detail.data.fastingTitle} /><InfoRow icon={Clock3} label={app.t.reading} value={detail.data.liturgy} /><div><p className="mb-3 text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">{app.t.saints}</p><div className="space-y-2">{detail.data.saints.map((saint) => <Link href={`/saints/${saint.id}`} key={saint.id} className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3 text-sm font-semibold text-primary"><Star size={15} className="text-accent" />{saint.name}</Link>)}</div></div></div>}</section>
  </div></>;
}
function InfoRow({ icon: IconComponent, label, value }: { icon: Icon; label: string; value?: string | null }) { return value ? <div className="flex items-center gap-3 border-b border-border pb-4"><IconComponent size={17} className="text-accent" /><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold text-foreground">{value}</p></div></div> : null; }

function FastingPage() {
  const app = useApp(), [date, setDate] = useState(dateKey());
  const query = useGetFastingByDate(date, { locale: app.locale, calendarType: app.calendarType }), day = query.data;
  return <><Meta title={app.t.fastingTitle} description={app.t.fastingSub} /><PageIntro eyebrow={app.t.fasting} title={app.t.fastingTitle} description={app.t.fastingSub} icon={Utensils} /><div className="mb-5 flex max-w-md items-center justify-between rounded-2xl border border-border bg-card p-3"><button data-testid="button-fasting-prev" onClick={() => setDate(shiftDate(date, -1))} className="rounded-xl bg-secondary p-3 text-primary"><ChevronRight size={18} /></button><div className="text-center"><strong className="block text-sm text-primary">{dateLabel(date, app.locale)}</strong><span className="text-[10px] text-muted-foreground">{app.calendarType === 'gregorian' ? app.t.western : app.t.eastern}</span></div><button data-testid="button-fasting-next" onClick={() => setDate(shiftDate(date, 1))} className="rounded-xl bg-secondary p-3 text-primary"><ChevronLeft size={18} /></button></div><State loading={query.isLoading} error={query.isError} retry={() => void query.refetch()} empty={!query.isLoading && !query.isError && !day ? app.t.noData : undefined} />{day && <div className="space-y-6"><section className="rounded-[28px] bg-primary p-7 text-primary-foreground sm:p-9"><div className="flex items-center gap-3 text-accent"><Utensils size={20} /><span className="text-xs font-bold uppercase tracking-[.16em]">{day.level}</span></div><h2 className="mt-5 font-display text-3xl font-bold">{day.title}</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-primary-foreground/75">{day.description}</p>{day.note && <p className="mt-5 border-t border-primary-foreground/15 pt-4 text-xs leading-6 text-primary-foreground/60">{day.note}</p>}</section><div><SectionLabel>{app.t.recipes}</SectionLabel>{day.recipes.length ? <div className="grid gap-4 md:grid-cols-2">{day.recipes.map((recipe) => <details key={recipe.id} className="group rounded-[22px] border border-border bg-card p-5 open:bg-secondary/40"><summary className="cursor-pointer list-none"><div className="flex items-start justify-between gap-4"><div><h3 className="font-display text-xl font-bold text-primary">{recipe.title}</h3><p className="mt-1 text-xs text-muted-foreground">{recipe.subtitle}</p></div><span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground"><Clock3 size={13} />{recipe.time}</span></div></summary><div className="mt-5 space-y-4 border-t border-border pt-4 text-sm"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.12em] text-primary">{app.t.ingredients}</p><ul className="list-disc space-y-1 ps-5 text-muted-foreground">{recipe.ingredients.map((item) => <li key={item}>{item}</li>)}</ul></div><div><p className="mb-2 text-xs font-bold uppercase tracking-[.12em] text-primary">{app.t.steps}</p><ol className="list-decimal space-y-1 ps-5 text-muted-foreground">{recipe.steps.map((item) => <li key={item}>{item}</li>)}</ol></div></div></details>)}</div> : <p className="rounded-2xl border border-dashed border-border p-7 text-sm text-muted-foreground">{app.t.noData}</p>}</div><p className="rounded-2xl border border-border bg-card p-5 text-xs leading-6 text-muted-foreground">{app.t.guidance}</p></div>}</>;
}

function SaintsPage() {
  const app = useApp(), [search, setSearch] = useState(''), params = { locale: app.locale, page: 1, limit: 50, ...(search ? { search } : {}) }, query = useListSaints(params), items = query.data?.items || [];
  return <><Meta title={app.t.directory} description={app.t.directorySub} /><PageIntro eyebrow={app.t.saints} title={app.t.directory} description={app.t.directorySub} icon={Star} /><div className="mb-6 flex max-w-2xl items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"><Search size={18} className="text-muted-foreground" /><input data-testid="input-saint-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={app.t.searchSaint} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></div><State loading={query.isLoading} error={query.isError} retry={() => void query.refetch()} empty={!query.isLoading && !query.isError && !items.length ? app.t.noSaints : undefined} />{items.length > 0 && <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{items.map((saint, index) => <Link href={`/saints/${saint.id}`} key={saint.id} data-testid={`card-saint-${saint.id}`} className="group flex min-h-32 flex-col justify-between rounded-[22px] border border-border bg-card p-5 transition-transform hover:-translate-y-0.5 hover:border-accent"><div className="flex items-start justify-between gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-accent"><Star size={17} /></span><span className="text-xs font-bold text-muted-foreground">{String(index + 1).padStart(2, '0')}</span></div><div><h2 className="mt-4 font-display text-xl font-bold text-primary">{saint.name}</h2><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{saint.shortBio}</p></div></Link>)}</div>}</>;
}

function SaintPage() {
  const app = useApp(), { id = '' } = useParams<{ id: string }>(), query = useGetSaint(id, { locale: app.locale }), saint = query.data;
  return <><Meta title={saint?.name || app.t.saints} description={saint?.shortBio || app.t.directorySub} /><Link href="/saints" className="mb-7 inline-flex items-center gap-2 text-xs font-bold text-primary"><ArrowRight size={15} />{app.t.directory}</Link><State loading={query.isLoading} error={query.isError} retry={() => void query.refetch()} empty={!query.isLoading && !query.isError && !saint ? app.t.noData : undefined} />{saint && <div className="max-w-3xl"><div className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end"><span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[25px] bg-primary text-accent"><Star size={34} strokeWidth={1.3} /></span><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">{app.t.saints}</p><h1 className="mt-2 font-display text-4xl font-bold text-foreground">{saint.name}</h1>{saint.feastDate && <p className="mt-2 text-sm text-muted-foreground">{dateLabel(saint.feastDate, app.locale)}</p>}</div></div><p className="mt-8 text-lg leading-9 text-foreground">{saint.shortBio}</p><div className="mt-8 rounded-[24px] border border-border bg-card p-6"><div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-primary"><Headphones size={16} />{app.locale === 'ar' ? 'نص السيرة الصوتية' : 'Audio reading'}</div><p className="font-display text-lg leading-9 text-muted-foreground">{saint.audioText}</p></div></div>}</>;
}

function LearningPage() {
  const app = useApp(), [search, setSearch] = useState(''), [category, setCategory] = useState<LearningCategory | undefined>(), params = { locale: app.locale, page: 1, limit: 50, ...(search ? { search } : {}), ...(category ? { category } : {}) }, query = useListLearningEntries(params), items = query.data?.items || [];
  const categories: Array<[LearningCategory | undefined, string]> = [[undefined, app.locale === 'ar' ? 'الكل' : 'All'], ['dictionary', app.locale === 'ar' ? 'قاموس' : 'Dictionary'], ['icon', app.locale === 'ar' ? 'أيقونات' : 'Icons'], ['audio', app.locale === 'ar' ? 'صوت' : 'Audio']];
  return <><Meta title={app.t.learning} description={app.t.learningSub} /><PageIntro eyebrow={app.t.learning} title={app.t.learning} description={app.t.learningSub} icon={BookOpen} /><div className="mb-5 flex max-w-2xl items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"><Search size={18} className="text-muted-foreground" /><input data-testid="input-learning-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={app.t.searchLearning} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></div><div className="mb-6 flex flex-wrap gap-2">{categories.map(([value, label]) => <button key={label} data-testid={`button-learning-filter-${label}`} onClick={() => setCategory(value)} className={`rounded-xl px-4 py-2 text-xs font-bold ${category === value ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground'}`}>{label}</button>)}</div><State loading={query.isLoading} error={query.isError} retry={() => void query.refetch()} empty={!query.isLoading && !query.isError && !items.length ? app.t.noData : undefined} />{items.length > 0 && <div className="grid gap-4 md:grid-cols-2">{items.map((entry) => <details key={entry.id} className="group rounded-[22px] border border-border bg-card p-5 open:border-accent"><summary className="cursor-pointer list-none"><div className="flex items-start justify-between gap-4"><div><span className="text-[10px] font-bold uppercase tracking-[.15em] text-primary">{entry.category}</span><h2 className="mt-2 font-display text-2xl font-bold text-foreground">{entry.title}</h2>{(entry.alternate || entry.pronunciation) && <p className="mt-1 text-xs text-accent">{entry.alternate}{entry.alternate && entry.pronunciation ? ' · ' : ''}{entry.pronunciation}</p>}</div><ChevronDownIcon /></div><p className="mt-4 text-sm leading-7 text-muted-foreground">{entry.definition}</p></summary>{entry.body && <p className="mt-5 border-t border-border pt-4 text-sm leading-7 text-foreground">{entry.body}</p>}</details>)}</div>}</>;
}
function ChevronDownIcon() { return <ChevronRight className="mt-1 shrink-0 text-muted-foreground transition-transform group-open:rotate-90 rtl:rotate-180" size={18} />; }

function LivePage() {
  const app = useApp(), [radioPlaying, setRadioPlaying] = useState(false), [videoError, setVideoError] = useState(false);
  return <><Meta title={app.t.live} description={app.t.liveSub} /><PageIntro eyebrow={app.t.live} title={app.t.live} description={app.t.liveSub} icon={Radio} /><div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]"><section className="overflow-hidden rounded-[26px] border border-border bg-card"><div className="flex items-center justify-between border-b border-border p-5"><div className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-[#c96d5b]" /><div><h2 className="font-display text-xl font-bold text-primary">{app.t.channel}</h2><p className="mt-1 text-xs text-muted-foreground">{app.t.liveSub}</p></div></div><Waves size={19} className="text-accent" /></div>{videoError ? <div className="flex min-h-[340px] flex-col items-center justify-center gap-4 p-8 text-center"><CircleAlert className="text-primary" size={28} /><p className="max-w-sm text-sm leading-6 text-muted-foreground">{app.t.browserFallback}</p><a href={liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-primary-foreground">{app.t.external}<ExternalLink size={14} /></a></div> : <iframe title={app.t.channel} src={liveUrl} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen onError={() => setVideoError(true)} className="h-[340px] w-full border-0 bg-primary" />}</section><section className="rounded-[26px] bg-primary p-6 text-primary-foreground"><div className="flex items-center gap-3 text-accent"><Radio size={20} /><span className="text-xs font-bold uppercase tracking-[.15em]">{app.t.radio}</span></div><h2 className="mt-6 font-display text-3xl font-bold">{app.t.radio}</h2><p className="mt-3 text-sm leading-7 text-primary-foreground/70">{app.t.liveSub}</p>{radioPlaying ? <div className="mt-8 rounded-2xl border border-primary-foreground/15 p-4"><div className="flex items-center gap-2 text-xs text-accent"><span className="h-2 w-2 rounded-full bg-accent" />{app.t.radio}</div><button data-testid="button-radio-stop" onClick={() => setRadioPlaying(false)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-primary-foreground/20 py-3 text-xs font-bold"><X size={15} />{app.t.stop}</button></div> : <button data-testid="button-radio-play" onClick={() => setRadioPlaying(true)} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-xs font-bold text-primary"><Radio size={16} />{app.t.play}</button>}<a href={radioUrl} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-accent">{app.t.external}<ExternalLink size={14} /></a></section></div></>;
}

function Router() {
  return <RoutedErrorBoundary><Shell><Switch><Route path="/" component={Home} /><Route path="/calendar" component={CalendarPage} /><Route path="/fasting" component={FastingPage} /><Route path="/saints/:id" component={SaintPage} /><Route path="/saints" component={SaintsPage} /><Route path="/learning" component={LearningPage} /><Route path="/live" component={LivePage} /><Route component={NotFound} /></Switch></Shell></RoutedErrorBoundary>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) { const [location] = useLocation(); return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>; }
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;