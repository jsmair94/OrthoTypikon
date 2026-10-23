import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, BookOpen, CalendarDays, ChevronLeft, ChevronRight,
  CircleAlert, Clock3, ExternalLink, Headphones, Menu, Radio, Search, Star,
  Sun, X, Utensils, Waves, Compass, MapPin, Library, Settings, Heart,
  Newspaper, Info, ShieldCheck, Mail, Smartphone, Moon, BookText,
  type LucideIcon,
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
  useSubmitContactMessage,
} from '@workspace/api-client-react';
import type { CalendarType, LearningCategory } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { getPrayerCollection, PRAYER_COLLECTION_IDS } from '../../orthotypikon/data/prayerCollections';
import { rosaryPrayerOptions } from '../../orthotypikon/data/rosaryPrayerOptions';
import { getNameDayChoices } from '../../orthotypikon/data/nameDays';
import { fetchNearbyOrthodoxPlaces } from '../../orthotypikon/lib/orthodoxPlaces';
import { getMoreContent, ORTHOTYPIKON_CONTACT_EMAIL, resolveAboutBody } from '../../orthotypikon/data/moreContent';
import { fetchJordanNews, NEWS_REGION_SOURCES } from '../../orthotypikon/data/news';

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
  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ locale?: Locale; calendarType?: CalendarType }>).detail;
      if (detail.locale) setLocale(detail.locale);
      if (detail.calendarType) setCalendarType(detail.calendarType);
    };
    window.addEventListener('orthotypikon-preferences', sync);
    return () => window.removeEventListener('orthotypikon-preferences', sync);
  }, []);
  const changeLocale = (next: Locale) => {
    setLocale(next); localStorage.setItem('orthotypikon-locale', next);
    window.dispatchEvent(new CustomEvent('orthotypikon-preferences', { detail: { locale: next } }));
  };
  const changeCalendar = (next: CalendarType) => {
    setCalendarType(next); localStorage.setItem('orthotypikon-calendar', next);
    window.dispatchEvent(new CustomEvent('orthotypikon-preferences', { detail: { calendarType: next } }));
  };
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
    ['/library', app.locale === 'ar' ? 'المكتبة' : 'Library', Library],
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
    <div className="border-b border-border/60 bg-secondary/35">
      <nav aria-label={app.locale === 'ar' ? 'روابط الموقع الإضافية' : 'More site sections'} className="mx-auto flex max-w-[1240px] gap-1 overflow-x-auto px-4 py-2 text-xs sm:px-7">
        {[
          ['/bible', app.locale === 'ar' ? 'الكتاب المقدس' : 'Bible'],
          ['/prayer', app.locale === 'ar' ? 'المسبحة' : 'Rosary'],
          ['/prayers/daily', app.locale === 'ar' ? 'الصلوات' : 'Prayer collections'],
          ['/compass', app.locale === 'ar' ? 'البوصلة' : 'Compass'],
          ['/places', app.locale === 'ar' ? 'الأماكن' : 'Nearby places'],
          ['/name-days', app.locale === 'ar' ? 'أعياد الأسماء' : 'Name days'],
          ['/news', app.locale === 'ar' ? 'الأخبار' : 'Church news'],
          ['/prayer-mode', app.locale === 'ar' ? 'وضع الصلاة' : 'Prayer mode'],
          ['/settings', app.locale === 'ar' ? 'الإعدادات' : 'Settings'],
          ['/widget', app.locale === 'ar' ? 'أداة اليوم' : 'Widget'],
          ['/info/about', app.locale === 'ar' ? 'حول' : 'About'],
          ['/info/contact', app.locale === 'ar' ? 'تواصل' : 'Contact'],
        ].map(([href, label]) => <Link key={href} href={href} data-testid={`link-section-${href.slice(1).replaceAll('/', '-')}`} className={`shrink-0 rounded-lg px-3 py-2 font-semibold transition-colors ${location === href || (href === '/prayers/daily' && location.startsWith('/prayers/')) ? 'bg-card text-primary' : 'text-muted-foreground hover:bg-card hover:text-primary'}`}>{label}</Link>)}
      </nav>
    </div>
    <main className="mx-auto max-w-[1240px] px-4 py-7 sm:px-7 sm:py-10">{children}</main>
    <footer className="mx-auto flex max-w-[1240px] flex-col gap-3 border-t border-border/70 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-7"><span className="font-display text-base font-bold text-primary">أرثوذكس تيبيكون · OrthoTypikon</span><span>{app.rtl ? 'محتوى للقراءة والصلاة في اليوم الكنسي' : 'A reading companion for the church day'}</span><div className="flex flex-wrap gap-x-4 gap-y-2"><Link href="/info/privacy" className="hover:text-primary">{app.locale === 'ar' ? 'الخصوصية' : 'Privacy'}</Link><Link href="/info/terms" className="hover:text-primary">{app.locale === 'ar' ? 'الشروط' : 'Terms'}</Link><Link href="/settings" className="hover:text-primary">{app.locale === 'ar' ? 'الإعدادات' : 'Settings'}</Link></div></footer>
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

const libraryTopics = [
  { key: 'patristics', en: 'Patristics', ar: 'آبائيات', color: '#25394A', href: '/learning' },
  { key: 'theology', en: 'Theology & doctrine', ar: 'اللاهوت والعقيدة', color: '#B47732', href: '/learning' },
  { key: 'saints-service', en: 'Saintly service', ar: 'خدم الفصح العظيم', color: '#59483D', href: '/learning' },
  { key: 'heresies', en: 'Innovations & heresies', ar: 'البدع والهرطقات', color: '#936F42', href: '/learning' },
  { key: 'history', en: 'Church history', ar: 'التاريخ الكنسي', color: '#6C7C96', href: '/learning' },
  { key: 'liturgy', en: 'Liturgy', ar: 'الليتورجيا', color: '#4D3026', href: '/learning' },
  { key: 'spiritual', en: 'Spiritual life', ar: 'حياة روحية', color: '#534E50', href: '/prayers/daily' },
  { key: 'afterlife', en: 'Life after death', ar: 'الحياة بعد الموت', color: '#55706B', href: '/learning' },
  { key: 'icons', en: 'Icons', ar: 'أيقونات', color: '#B9824B', href: '/learning' },
  { key: 'saints', en: 'Lives of the saints', ar: 'سير حياة القديسين', color: '#806A4C', href: '/saints' },
  { key: 'family', en: 'Family & education', ar: 'الأسرة والتربية', color: '#A3745B', href: '/learning' },
  { key: 'services', en: 'Divine service books', ar: 'كتب الخدم الإلهية', color: '#604831', href: '/prayers/various' },
  { key: 'music', en: 'Church music', ar: 'موسيقى', color: '#252B30', href: '/live' },
  { key: 'theotokos', en: 'Theotokos', ar: 'والدة الإله', color: '#56708B', href: '/learning' },
];
const bibleBooks = ['Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'];
const oldBibleBooks = [
  { id: 'genesis', en: 'Genesis', ar: 'التكوين', chapters: 50 },
  { id: 'exodus', en: 'Exodus', ar: 'الخروج', chapters: 40 },
  { id: 'leviticus', en: 'Leviticus', ar: 'اللاويين', chapters: 27 },
  { id: 'numbers', en: 'Numbers', ar: 'العدد', chapters: 36 },
  { id: 'deuteronomy', en: 'Deuteronomy', ar: 'التثنية', chapters: 34 },
  { id: 'joshua', en: 'Joshua', ar: 'يشوع', chapters: 24 },
  { id: 'judges', en: 'Judges', ar: 'القضاة', chapters: 21 },
  { id: 'ruth', en: 'Ruth', ar: 'راعوث', chapters: 4 },
  { id: '1-samuel', en: 'First Samuel', ar: 'صموئيل الأول', chapters: 31 },
  { id: '2-samuel', en: 'Second Samuel', ar: 'صموئيل الثاني', chapters: 24 },
  { id: '1-kings', en: 'First Kings', ar: 'الملوك الأول', chapters: 22 },
  { id: '2-kings', en: 'Second Kings', ar: 'الملوك الثاني', chapters: 25 },
  { id: '1-chronicles', en: 'First Chronicles', ar: 'أخبار الأيام الأول', chapters: 29 },
  { id: '2-chronicles', en: 'Second Chronicles', ar: 'أخبار الأيام الثاني', chapters: 36 },
  { id: 'ezra', en: 'Ezra', ar: 'عزرا', chapters: 10 },
  { id: 'nehemiah', en: 'Nehemiah', ar: 'نحميا', chapters: 13 },
  { id: 'esther', en: 'Esther', ar: 'أستير', chapters: 10 },
  { id: 'job', en: 'Job', ar: 'أيوب', chapters: 42 },
  { id: 'psalms', en: 'Psalms', ar: 'المزامير', chapters: 150 },
  { id: 'proverbs', en: 'Proverbs', ar: 'الأمثال', chapters: 31 },
  { id: 'ecclesiastes', en: 'Ecclesiastes', ar: 'الجامعة', chapters: 12 },
  { id: 'song-of-solomon', en: 'Song of Solomon', ar: 'نشيد الأنشاد', chapters: 8 },
  { id: 'isaiah', en: 'Isaiah', ar: 'إشعياء', chapters: 66 },
  { id: 'jeremiah', en: 'Jeremiah', ar: 'إرميا', chapters: 52 },
  { id: 'lamentations', en: 'Lamentations', ar: 'مراثي إرميا', chapters: 5 },
  { id: 'ezekiel', en: 'Ezekiel', ar: 'حزقيال', chapters: 48 },
  { id: 'daniel', en: 'Daniel', ar: 'دانيال', chapters: 12 },
  { id: 'hosea', en: 'Hosea', ar: 'هوشع', chapters: 14 },
  { id: 'joel', en: 'Joel', ar: 'يوئيل', chapters: 3 },
  { id: 'amos', en: 'Amos', ar: 'عاموس', chapters: 9 },
  { id: 'obadiah', en: 'Obadiah', ar: 'عوبديا', chapters: 1 },
  { id: 'jonah', en: 'Jonah', ar: 'يونان', chapters: 4 },
  { id: 'micah', en: 'Micah', ar: 'ميخا', chapters: 7 },
  { id: 'nahum', en: 'Nahum', ar: 'ناحوم', chapters: 3 },
  { id: 'habakkuk', en: 'Habakkuk', ar: 'حبقوق', chapters: 3 },
  { id: 'zephaniah', en: 'Zephaniah', ar: 'صفنيا', chapters: 3 },
  { id: 'haggai', en: 'Haggai', ar: 'حجي', chapters: 2 },
  { id: 'zechariah', en: 'Zechariah', ar: 'زكريا', chapters: 14 },
  { id: 'malachi', en: 'Malachi', ar: 'ملاخي', chapters: 4 },
];
const bibleChapterCounts: Record<string, number> = {
  matthew: 28, mark: 16, luke: 24, john: 21, acts: 28, romans: 16,
  '1-corinthians': 16, '2-corinthians': 13, galatians: 6, ephesians: 6,
  philippians: 4, colossians: 4, '1-thessalonians': 5, '2-thessalonians': 3,
  '1-timothy': 6, '2-timothy': 4, titus: 3, philemon: 1, hebrews: 13,
  james: 5, '1-peter': 5, '2-peter': 3, '1-john': 5, '2-john': 1,
  '3-john': 1, jude: 1, revelation: 22,
  ...Object.fromEntries(oldBibleBooks.map((book) => [book.id, book.chapters])),
};
const prayerLabels: Record<string, { en: string; ar: string }> = {
  gospels: { en: 'Gospel readings', ar: 'الإنجيل المسموع' }, daily: { en: 'Daily prayers', ar: 'صلوات يومية' },
  various: { en: 'Various prayers', ar: 'صلوات متنوعة' }, supplications: { en: 'Supplications', ar: 'طلبات' },
  epistles: { en: 'Treasures of the Epistles', ar: 'كنوز الرسائل' },
};

function LibraryPage() {
  const app = useApp(), en = app.locale === 'en';
  const tools = [
    { title: en ? 'Holy Bible' : 'الكتاب المقدس', href: '/bible', icon: BookText, note: en ? 'Gospel excerpts are available; other reading files are not added yet.' : 'مقتطفات الأناجيل متاحة؛ ملفات القراءة الأخرى لم تُضف بعد.' },
    { title: en ? 'Prayer rosary' : 'مسبحة الصلاة', href: '/prayer', icon: Heart, note: en ? 'Rosary text and recordings are pending upload.' : 'نصوص تسجيلات المسابح بانتظار الإضافة.' },
    { title: en ? 'East compass' : 'بوصلة الشرق', href: '/compass', icon: Compass, note: en ? 'Device compass sensors are not available on this website.' : 'مستشعر البوصلة غير متاح في هذا الموقع.' },
    { title: en ? 'Nearby Orthodox places' : 'أماكن أرثوذكسية قريبة', href: '/places', icon: MapPin, note: en ? 'Search with browser location permission.' : 'ابحث باستخدام إذن الموقع في المتصفح.' },
    { title: en ? 'Name days' : 'أعياد الأسماء', href: '/name-days', icon: CalendarDays, note: en ? 'Browse commemorations for a date.' : 'تصفّح التذكارات حسب التاريخ.' },
  ];
  return <><Meta title={en ? 'Spiritual library' : 'المكتبة الروحية'} description={en ? 'Explore Orthodox topics, tools and prayer collections.' : 'استكشف موضوعات وأدوات ومجموعات الصلاة الأرثوذكسية.'} />
    <PageIntro eyebrow={en ? 'Library' : 'المكتبة'} title={en ? 'A library for the church day' : 'مكتبة لليوم الكنسي'} description={en ? 'Explore by subject, open a spiritual tool, or read from the prayer collections.' : 'تصفّح الموضوعات، واستخدم الأدوات الروحية، واقرأ من مجموعات الصلاة.'} icon={Library} />
    <section className="mb-10"><SectionLabel>{en ? 'Explore topics' : 'استكشف الموضوعات'}</SectionLabel><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{libraryTopics.map((topic, i) => <Link key={topic.key} href={topic.href} data-testid={`card-library-topic-${topic.key}`} className="group flex min-h-28 items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-accent hover:bg-secondary/60"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-primary-foreground" style={{ backgroundColor: topic.color }}>{String(i + 1).padStart(2, '0')}</span><span className="flex-1"><strong className="block text-sm text-foreground">{en ? topic.en : topic.ar}</strong><span className="mt-1 block text-xs text-muted-foreground">{en ? 'Browse the relevant church resources' : 'تصفّح الموارد الكنسية المرتبطة'}</span></span><ArrowRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-1" /></Link>)}</div></section>
    <section className="mb-10"><SectionLabel>{en ? 'Spiritual tools' : 'أدوات روحية'}</SectionLabel><div className="grid gap-4 md:grid-cols-2">{tools.map((tool) => <Link key={tool.href} href={tool.href} data-testid={`link-library-tool-${tool.href.slice(1)}`} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 hover:border-accent"><span className="rounded-xl bg-secondary p-3 text-primary"><tool.icon size={20} /></span><span><strong className="block text-base text-foreground">{tool.title}</strong><span className="mt-1 block text-sm leading-6 text-muted-foreground">{tool.note}</span></span></Link>)}</div></section>
    <section><SectionLabel>{en ? 'Prayer collections' : 'مجموعات الصلاة'}</SectionLabel><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{PRAYER_COLLECTION_IDS.map((id) => <Link href={`/prayers/${id}`} key={id} data-testid={`link-prayer-collection-${id}`} className="rounded-2xl border border-border bg-card p-5 hover:bg-secondary/60"><span className="text-xs font-bold uppercase tracking-widest text-accent">{en ? 'Collection' : 'مجموعة'}</span><h3 className="mt-3 font-display text-xl font-bold text-primary">{en ? prayerLabels[id].en : prayerLabels[id].ar}</h3></Link>)}</div></section>
  </>;
}

function PrayerCollectionPage() {
  const app = useApp(), params = useParams<{ collection: string }>(), [selected, setSelected] = useState<string | null>(null), en = app.locale === 'en';
  const id = params.collection || '', collection = getPrayerCollection(app.locale, id);
  const entry = collection?.entries.find((item) => item.id === selected);
  const title = prayerLabels[id] ? (en ? prayerLabels[id].en : prayerLabels[id].ar) : (en ? 'Prayer collection' : 'مجموعة الصلاة');
  return <><Meta title={entry?.title || title} description={collection?.description || ''} /><Link href="/library" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowLeft size={16} />{en ? 'Library' : 'المكتبة'}</Link><PageIntro eyebrow={en ? 'Prayer collection' : 'مجموعة صلاة'} title={entry?.title || title} description={entry ? entry.reference : collection?.description || (en ? 'This collection is not available.' : 'هذه المجموعة غير متاحة.')} icon={Heart} />
    {entry ? <article data-testid="text-prayer-reading" className="max-w-3xl rounded-[26px] border border-border bg-card p-7 sm:p-10"><p className="text-xs font-bold uppercase tracking-widest text-accent">{entry.reference}</p><p className="mt-6 font-display text-2xl leading-[1.9] text-foreground">{entry.text}</p><button data-testid="button-prayer-back-to-list" onClick={() => setSelected(null)} className="mt-8 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-primary">{en ? 'Back to collection' : 'العودة إلى المجموعة'}</button></article> : collection ? <div className="grid max-w-4xl gap-3 md:grid-cols-2">{collection.entries.map((item) => <button key={item.id} data-testid={`card-prayer-entry-${item.id}`} onClick={() => setSelected(item.id)} className="text-start rounded-2xl border border-border bg-card p-5 hover:border-accent"><span className="text-xs font-semibold text-muted-foreground">{item.reference}</span><strong className="mt-2 block font-display text-xl text-primary">{item.title}</strong><span className="mt-3 line-clamp-2 block text-sm leading-6 text-muted-foreground">{item.text}</span></button>)}</div> : <State empty={en ? 'This prayer collection is not available.' : 'مجموعة الصلاة غير متاحة.'} />}
  </>;
}

function BiblePage() {
  const app = useApp(), en = app.locale === 'en', [testament, setTestament] = useState<'old' | 'new'>('new'), [section, setSection] = useState<string | null>(null), [chapter, setChapter] = useState<number | null>(null);
  const [remoteChapter, setRemoteChapter] = useState<{ text: string; audioUrl: string } | null>(null);
  const [remoteChapterLoading, setRemoteChapterLoading] = useState(false);
  const [remoteChapterError, setRemoteChapterError] = useState(false);
  useEffect(() => {
    setRemoteChapter(null);
    setRemoteChapterError(false);
    if (!section || !bibleChapterCounts[section] || chapter === null) return;
    const controller = new AbortController();
    setRemoteChapterLoading(true);
    const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
    fetch(`${base}/api/bible/${section}/${chapter}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Chapter unavailable');
        return response.json() as Promise<{ text: string; audioUrl: string }>;
      })
      .then(setRemoteChapter)
      .catch(() => { if (!controller.signal.aborted) setRemoteChapterError(true); })
      .finally(() => { if (!controller.signal.aborted) setRemoteChapterLoading(false); });
    return () => controller.abort();
  }, [section, chapter]);
  const gospels = getPrayerCollection(app.locale, 'gospels');
  const gospel = section ? gospels?.entries.find((item) => item.id === `gospel-${section}`) : undefined;
  const chapterCount = section ? bibleChapterCounts[section] : undefined;
  const selectedBook = bibleBooks.find((book) => book.toLowerCase().replaceAll(' ', '-') === section);
  const oldBook = oldBibleBooks.find((book) => book.id === section);
  const selectedBookLabel = oldBook ? en ? oldBook.en : oldBook.ar : selectedBook ? en ? selectedBook : bibleArabicBook(selectedBook) : '';
  return <><Meta title={en ? 'Holy Bible' : 'الكتاب المقدس'} description={en ? 'Browse testament and Bible sections.' : 'تصفّح العهدين وأقسام الكتاب المقدس.'} /><PageIntro eyebrow={en ? 'Scripture' : 'الكتاب المقدس'} title={en ? 'Holy Bible' : 'الكتاب المقدس'} description={en ? 'Choose a testament and a book. Gospel excerpts are available in the four Gospels.' : 'اختر عهدًا وسفرًا. تتوفر مقتطفات من الأناجيل الأربعة.'} icon={BookText} />
    <div className="mb-5 flex max-w-xl rounded-xl border border-border bg-card p-1">{(['old', 'new'] as const).map((key) => <button key={key} data-testid={`button-bible-testament-${key}`} onClick={() => { setTestament(key); setSection(null); setChapter(null); }} className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold ${testament === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{key === 'old' ? en ? 'Old Testament' : 'العهد القديم' : en ? 'New Testament' : 'العهد الجديد'}</button>)}</div>
      <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]"><section className="space-y-2">{(testament === 'old' ? oldBibleBooks.map((item) => ({ id: item.id, label: en ? item.en : item.ar })) : bibleBooks.map((book) => ({ id: book.toLowerCase().replaceAll(' ', '-'), label: en ? book : bibleArabicBook(book) }))).map((item) => <button key={item.id} data-testid={`button-bible-book-${item.id}`} onClick={() => { setSection(section === item.id ? null : item.id); setChapter(null); }} className={`flex w-full items-center justify-between rounded-xl border p-4 text-start text-sm font-semibold ${section === item.id ? 'border-accent bg-secondary text-primary' : 'border-border bg-card text-foreground'}`}><span>{item.label}</span><ChevronRight size={16} /></button>)}</section>
        <section className="min-h-64 rounded-[26px] border border-border bg-card p-6 sm:p-8">{chapterCount ? <><SectionLabel>{en ? `Chapters · ${selectedBookLabel}` : `إصحاحات ${selectedBookLabel}`}</SectionLabel><div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">{Array.from({ length: chapterCount }, (_, index) => index + 1).map((number) => <button key={number} data-testid={`button-bible-chapter-${section}-${number}`} aria-pressed={chapter === number} onClick={() => setChapter(number)} className={`rounded-xl border px-3 py-3 text-sm font-bold ${chapter === number ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:border-accent'}`}>{number}</button>)}</div>{chapter && <div className="mt-5 rounded-xl border border-border p-4">{remoteChapterLoading ? <p className="text-sm text-muted-foreground">{en ? 'Loading chapter…' : 'جارٍ تحميل الإصحاح…'}</p> : remoteChapterError ? <p data-testid="text-bible-chapter-error" className="text-sm text-muted-foreground">{en ? 'Could not load the chapter from storage.' : 'تعذر تحميل الإصحاح من التخزين.'}</p> : remoteChapter ? <><p data-testid="text-bible-chapter" className="whitespace-pre-wrap text-base leading-8 text-foreground" dir={en ? 'ltr' : 'rtl'}>{remoteChapter.text}</p>{remoteChapter.audioUrl && <audio className="mt-4 w-full" controls preload="none" src={remoteChapter.audioUrl}>{en ? 'Your browser does not support audio playback.' : 'متصفحك لا يدعم تشغيل الصوت.'}</audio>}</> : null}</div>}{gospel && <article className="mt-6 border-t border-border pt-5"><p className="text-xs font-bold uppercase tracking-widest text-accent">{gospel.reference}</p><h2 className="mt-2 font-display text-xl font-bold text-primary">{gospel.title}</h2><p data-testid="text-bible-gospel-excerpt" className="mt-4 font-display text-lg leading-8 text-foreground">{gospel.text}</p><p className="mt-4 text-xs text-muted-foreground">{en ? 'Audio recordings have not been added yet.' : 'لم تُضف التسجيلات الصوتية بعد.'}</p></article>}</> : gospel ? <><p className="text-xs font-bold uppercase tracking-widest text-accent">{gospel.reference}</p><h2 className="mt-3 font-display text-2xl font-bold text-primary">{gospel.title}</h2><p data-testid="text-bible-gospel-excerpt" className="mt-5 font-display text-xl leading-9 text-foreground">{gospel.text}</p><p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">{en ? 'Audio recordings have not been added yet.' : 'لم تُضف التسجيلات الصوتية بعد.'}</p></> : <><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary"><BookOpen size={21} /></div><h2 className="mt-5 font-display text-2xl font-bold text-primary">{section ? en ? 'Files are not added yet' : 'الملفات لم تُضف بعد' : en ? 'Choose a book or section' : 'اختر سفرًا أو قسمًا'}</h2><p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground">{section ? en ? 'Bible reading text and audio files are not available yet. They can be added when the source files are uploaded.' : 'نصوص الكتاب المقدس والملفات الصوتية غير متاحة بعد، وستظهر عند رفع الملفات.' : en ? 'The catalog follows the Bible sections used in the mobile app. Existing Gospel excerpts remain available here.' : 'يتبع الفهرس أقسام الكتاب المقدس في التطبيق، وتبقى مقتطفات الأناجيل الموجودة متاحة هنا.'}</p></>}</section></div>
  </>;
}
function bibleArabicBook(name: string) {
  const names: Record<string, string> = { Matthew: 'متى', Mark: 'مرقس', Luke: 'لوقا', John: 'يوحنا', Acts: 'أعمال الرسل', Romans: 'رومية', '1 Corinthians': 'كورنثوس الأولى', '2 Corinthians': 'كورنثوس الثانية', Galatians: 'غلاطية', Ephesians: 'أفسس', Philippians: 'فيلبي', Colossians: 'كولوسي', '1 Thessalonians': 'تسالونيكي الأولى', '2 Thessalonians': 'تسالونيكي الثانية', '1 Timothy': 'تيموثاوس الأولى', '2 Timothy': 'تيموثاوس الثانية', Titus: 'تيطس', Philemon: 'فليمون', Hebrews: 'العبرانيين', James: 'يعقوب', '1 Peter': 'بطرس الأولى', '2 Peter': 'بطرس الثانية', '1 John': 'يوحنا الأولى', '2 John': 'يوحنا الثانية', '3 John': 'يوحنا الثالثة', Jude: 'يهوذا', Revelation: 'رؤيا يوحنا' };
  return names[name] || name;
}

function PrayerToolPage() {
  const app = useApp(), en = app.locale === 'en';
  const options = rosaryPrayerOptions[app.locale];
  return <><Meta title={en ? 'Prayer rosary' : 'مسبحة الصلاة'} description={en ? 'Rosary options and upload status.' : 'خيارات المسابح وحالة الملفات.'} /><PageIntro eyebrow={en ? 'Spiritual tool' : 'أداة روحية'} title={en ? 'Prayer rosary' : 'مسبحة الصلاة'} description={en ? 'The mobile app includes a prayer counter and audio. Rosary text and recordings for the web are not added yet.' : 'يتضمن التطبيق عدّادًا وتسجيلًا للصلاة. نصوص المسابح وتسجيلاتها للويب لم تُضف بعد.'} icon={Heart} /><div className="grid max-w-4xl gap-3 md:grid-cols-2">{options.map((item) => <article key={item.id} data-testid={`card-rosary-${item.id}`} className="rounded-2xl border border-border bg-card p-5"><span className="text-xs font-bold uppercase tracking-widest text-accent">{en ? 'Content pending' : 'المحتوى بانتظار الإضافة'}</span><h2 className="mt-3 font-display text-xl font-bold text-primary">{item.title}</h2><p className="mt-2 text-sm text-muted-foreground">{en ? 'Prayer text and audio have not been uploaded.' : 'لم تُرفع نصوص الصلاة أو تسجيلاتها بعد.'}</p></article>)}</div><div className="mt-6 rounded-2xl border border-border bg-secondary/60 p-5 text-sm leading-7 text-muted-foreground">{en ? 'This website does not claim to play audio or count beads while the rosary files are pending.' : 'لا يدّعي هذا الموقع تشغيل الصوت أو عدّ الخرزات قبل توفر ملفات المسبحة.'}</div></>;
}

function CompassPage() {
  const app = useApp(), en = app.locale === 'en';
  return <><Meta title={en ? 'East compass' : 'بوصلة الشرق'} description={en ? 'About the device compass feature.' : 'معلومات عن ميزة بوصلة الجهاز.'} /><PageIntro eyebrow={en ? 'Spiritual tool' : 'أداة روحية'} title={en ? 'East compass' : 'بوصلة الشرق'} description={en ? 'A quiet aid for orienting prayer toward the East.' : 'أداة هادئة لتوجيه الصلاة نحو الشرق.'} icon={Compass} /><section className="max-w-3xl rounded-[26px] border border-border bg-card p-7 sm:p-9"><div className="flex h-16 w-16 items-center justify-center rounded-full border border-accent text-primary"><Compass size={29} /></div><h2 className="mt-5 font-display text-2xl font-bold text-primary">{en ? 'Available in the mobile app' : 'متاحة في تطبيق الهاتف'}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{en ? 'The compass uses a device direction sensor. Standard browsers do not consistently expose that sensor, so this website does not display a simulated bearing. Open the OrthoTypikon mobile app to use the compass.' : 'تعتمد البوصلة على مستشعر اتجاه الجهاز. لا تتيح المتصفحات هذا المستشعر بصورة موحدة، لذلك لا يعرض الموقع اتجاهًا افتراضيًا. افتح تطبيق أرثوذكس تيبيكون لاستخدام البوصلة.'}</p><Link href="/library" data-testid="link-compass-library" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">{en ? 'Back to library' : 'العودة إلى المكتبة'}<ArrowRight size={15} /></Link></section></>;
}

function PlacesPage() {
  const app = useApp(), en = app.locale === 'en';
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'empty' | 'ready'>('idle');
  const [places, setPlaces] = useState<Array<{ id: string; name: string; category: string; distanceKm: number; address: string; latitude: number; longitude: number; sourceName: string; sourceUrl: string | null; isVerified: boolean }>>([]);
  const [radius, setRadius] = useState(25), [error, setError] = useState('');
  const search = () => {
    if (!navigator.geolocation) { setError(en ? 'Location is not available in this browser.' : 'الموقع غير متاح في هذا المتصفح.'); setStatus('error'); return; }
    setStatus('loading'); setError('');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const results = await fetchNearbyOrthodoxPlaces({ latitude: coords.latitude, longitude: coords.longitude }, radius, app.locale, new AbortController().signal);
        setPlaces(results); setStatus(results.length ? 'ready' : 'empty');
      } catch { setStatus('error'); setError(en ? 'Nearby search is temporarily unavailable. Try again.' : 'تعذر البحث عن الأماكن القريبة. حاول مجددًا.'); }
    }, () => { setStatus('error'); setError(en ? 'Allow location access in your browser, then try again.' : 'اسمح بالوصول إلى الموقع في المتصفح ثم حاول مجددًا.'); }, { maximumAge: 60000, timeout: 15000 });
  };
  return <><Meta title={en ? 'Nearby Orthodox places' : 'أماكن أرثوذكسية قريبة'} description={en ? 'Search the verified Orthodox places directory and map data.' : 'ابحث في دليل الأماكن الأرثوذكسية وبيانات الخريطة.'} /><PageIntro eyebrow={en ? 'Places' : 'الأماكن'} title={en ? 'Nearby Orthodox places' : 'أماكن أرثوذكسية قريبة'} description={en ? 'Location is requested only when you start a search. Results can include directory and OpenStreetMap listings.' : 'لا يُطلب موقعك إلا عند بدء البحث. قد تشمل النتائج الدليل وبيانات OpenStreetMap.'} icon={MapPin} />
    <section className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"><label htmlFor="places-radius" className="text-sm font-semibold text-foreground">{en ? 'Search radius' : 'نطاق البحث'}</label><select id="places-radius" data-testid="select-places-radius" value={radius} onChange={(event) => setRadius(Number(event.target.value))} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value={10}>10 km</option><option value={25}>25 km</option><option value={50}>50 km</option></select><button data-testid="button-places-search" onClick={search} disabled={status === 'loading'} className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">{status === 'loading' ? en ? 'Searching…' : 'جارٍ البحث…' : en ? 'Use my location' : 'استخدم موقعي'}</button></section>
    {error && <State error errorText={error} retry={search} />}{status === 'loading' && <State loading />}{status === 'empty' && <State empty={en ? 'No nearby places were found in this radius.' : 'لم يتم العثور على أماكن قريبة ضمن هذا النطاق.'} />}{status === 'ready' && <div className="grid gap-3 md:grid-cols-2">{places.map((place) => <article key={place.id} data-testid={`card-place-${place.id}`} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between gap-3"><h2 className="font-display text-xl font-bold text-primary">{place.name}</h2><span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-primary">{place.distanceKm < 1 ? `${Math.round(place.distanceKm * 1000)} m` : `${place.distanceKm.toFixed(1)} km`}</span></div><p className="mt-2 text-xs text-muted-foreground">{place.category} · {place.isVerified ? en ? 'Verified directory listing' : 'مدرج في الدليل' : en ? 'Map listing' : 'مدرج على الخريطة'}</p>{place.address && <p className="mt-2 text-sm text-muted-foreground">{place.address}</p>}<a data-testid={`link-place-directions-${place.id}`} href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">{en ? 'Directions' : 'الاتجاهات'}<ExternalLink size={14} /></a>{place.sourceUrl && <a className="ms-4 text-xs text-muted-foreground" href={place.sourceUrl} target="_blank" rel="noreferrer">{place.sourceName}</a>}</article>)}</div>}
  </>;
}

function NameDaysPage() {
  const app = useApp(), en = app.locale === 'en', [date, setDate] = useState(dateKey()), choices = useMemo(() => getNameDayChoices(date, app.calendarType), [date, app.calendarType]);
  return <><Meta title={en ? 'Name days' : 'أعياد الأسماء'} description={en ? 'Church commemorations and name days by date.' : 'تذكارات الكنيسة وأعياد الأسماء حسب التاريخ.'} /><PageIntro eyebrow={en ? 'Calendar' : 'الرزنامة'} title={en ? 'Name days' : 'أعياد الأسماء'} description={en ? 'Browse saint and feast commemorations from the existing church calendar.' : 'تصفّح تذكارات القديسين والأعياد من الرزنامة الكنسية.'} icon={CalendarDays} /><div className="mb-6 flex max-w-md flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"><label htmlFor="name-day-date" className="text-sm font-semibold">{en ? 'Date' : 'التاريخ'}</label><input id="name-day-date" data-testid="input-name-day-date" type="date" value={date} onChange={(event) => { if (event.target.value) setDate(event.target.value); }} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" /></div>{choices.length ? <div className="grid gap-3 md:grid-cols-2">{choices.map((item) => <article key={item.id} data-testid={`card-name-day-${item.id}`} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5"><span className="rounded-xl bg-secondary p-3 text-accent"><Star size={18} /></span><span><strong className="block text-base text-primary">{item.name}</strong><span className="text-xs text-muted-foreground">{item.kind === 'feast' ? en ? 'Feast' : 'عيد' : en ? 'Saint' : 'قديس'} · {dateLabel(date, app.locale)}</span></span></article>)}</div> : <State empty={en ? 'No name day or commemoration is recorded for this date.' : 'لا توجد تذكرة أو عيد اسم مسجل لهذا التاريخ.'} />}<p className="mt-6 rounded-xl border border-border bg-card p-4 text-xs leading-6 text-muted-foreground">{en ? 'The calendar catalog currently contains its published year range; an empty date means no entry is present in that source.' : 'يحتوي فهرس الرزنامة على نطاق السنوات المنشور؛ التاريخ الفارغ يعني عدم وجود سجل في المصدر.'}</p></>;
}

function NewsPage() {
  const app = useApp(), en = app.locale === 'en';
  const [articles, setArticles] = useState<Awaited<ReturnType<typeof fetchJordanNews>>>([]);
  const [loading, setLoading] = useState(true), [failed, setFailed] = useState(false), [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setFailed(false);
    fetchJordanNews().then((items) => { if (active) setArticles(items); })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  const names: Record<string, { en: string; ar: string }> = { jordan: { en: 'Jordan', ar: 'الأردن' }, syria: { en: 'Syria', ar: 'سوريا' }, lebanon: { en: 'Lebanon', ar: 'لبنان' } };
  return <><Meta title={en ? 'Church news' : 'أخبار الكنيسة'} description={en ? 'Regional church news sources.' : 'مصادر أخبار الكنيسة حسب المنطقة.'} /><PageIntro eyebrow={en ? 'News' : 'الأخبار'} title={en ? 'Church news' : 'أخبار الكنيسة'} description={en ? 'Regional sources available in the mobile app.' : 'مصادر إقليمية متاحة في التطبيق.'} icon={Newspaper} />
    {loading && <State loading />}
    {failed && <State error errorText={en ? 'The church news feed could not be reached.' : 'تعذر الوصول إلى موجز أخبار الكنيسة.'} retry={() => setReload((value) => value + 1)} />}
    {!loading && !failed && articles.length > 0 && <section className="mb-8"><SectionLabel>{en ? 'Latest from Jordan' : 'أحدث الأخبار من الأردن'}</SectionLabel><div className="grid gap-3 md:grid-cols-2">{articles.map((article) => <article key={article.id} data-testid={`card-news-article-${article.id}`} className="rounded-2xl border border-border bg-card p-5"><h2 className="font-display text-lg font-bold text-primary">{article.title}</h2>{article.publishedAt && <p className="mt-2 text-xs text-muted-foreground">{dateLabel(article.publishedAt.slice(0, 10), app.locale, { year: 'numeric', month: 'long', day: 'numeric' })}</p>}<a href={article.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-primary">{en ? 'Read at source' : 'اقرأ في المصدر'}<ExternalLink size={13} /></a></article>)}</div></section>}
    <section><SectionLabel>{en ? 'Regional sources' : 'المصادر الإقليمية'}</SectionLabel><div className="grid gap-4 md:grid-cols-3">{NEWS_REGION_SOURCES.map((source) => <article key={source.key} data-testid={`card-news-region-${source.key}`} className="flex min-h-52 flex-col rounded-2xl border border-border bg-card p-6"><span className="text-xs font-bold uppercase tracking-widest text-accent">{en ? 'Regional source' : 'مصدر إقليمي'}</span><h2 className="mt-3 font-display text-2xl font-bold text-primary">{en ? names[source.key].en : names[source.key].ar}</h2><p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{source.websiteUrl ? en ? 'Open the publisher’s news page for its current stories.' : 'افتح صفحة الناشر للاطلاع على الأخبار الحالية.' : en ? 'A news source is not configured for this region yet.' : 'لم يُحدد مصدر أخبار لهذه المنطقة بعد.'}</p>{source.websiteUrl && <a data-testid={`link-news-${source.key}`} href={source.websiteUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">{en ? 'Visit source' : 'زيارة المصدر'}<ExternalLink size={14} /></a>}</article>)}</div></section>
  </>;
}

function PrayerModePage() {
  const app = useApp(), en = app.locale === 'en';
  const [quiet, setQuiet] = useState(() => localStorage.getItem('orthotypikon-prayer-mode') === 'true');
  const toggle = () => setQuiet((value) => { localStorage.setItem('orthotypikon-prayer-mode', String(!value)); return !value; });
  return <><Meta title={en ? 'Prayer mode' : 'وضع الصلاة'} description={en ? 'A quieter reading mode for this browser.' : 'وضع قراءة هادئ في هذا المتصفح.'} /><PageIntro eyebrow={en ? 'Settings' : 'الإعدادات'} title={en ? 'Prayer mode' : 'وضع الصلاة'} description={en ? 'Reduce visual distractions while reading in this browser.' : 'خفف المشتتات البصرية أثناء القراءة في هذا المتصفح.'} icon={Moon} /><section className="max-w-2xl rounded-[26px] border border-border bg-card p-7"><div className="flex items-center justify-between gap-4"><div><h2 className="font-display text-xl font-bold text-primary">{en ? 'Quiet reading' : 'قراءة هادئة'}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{en ? 'This preference is saved locally in this browser. It does not enable Do Not Disturb or silence your device.' : 'يُحفظ هذا التفضيل محليًا في المتصفح، ولا يفعّل عدم الإزعاج أو يكتم الجهاز.'}</p></div><button data-testid="button-prayer-mode-toggle" aria-pressed={quiet} onClick={toggle} className={`shrink-0 rounded-xl px-4 py-3 text-sm font-bold ${quiet ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'}`}>{quiet ? en ? 'On' : 'مفعّل' : en ? 'Off' : 'متوقف'}</button></div></section></>;
}

function WidgetPage() {
  const app = useApp(), en = app.locale === 'en';
  return <><Meta title={en ? 'Today widget' : 'أداة اليوم'} description={en ? 'Native home-screen widget information.' : 'معلومات أداة الشاشة الرئيسية.'} /><PageIntro eyebrow={en ? 'Mobile feature' : 'ميزة للهاتف'} title={en ? "Today's widget" : 'أداة اليوم'} description={en ? 'Verse, date, and commemorated saints at a glance.' : 'الآية والتاريخ والقديسون المذكورون بنظرة واحدة.'} icon={Smartphone} /><section className="max-w-2xl rounded-[26px] border border-border bg-card p-7"><h2 className="font-display text-2xl font-bold text-primary">{en ? 'A native home-screen feature' : 'ميزة أصلية للشاشة الرئيسية'}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{en ? 'Home-screen widgets are managed by iOS and Android and cannot be installed or refreshed by a website. Use the OrthoTypikon mobile app and your device’s widget gallery to add it.' : 'تدير أنظمة iOS وAndroid أدوات الشاشة الرئيسية، ولا يمكن للموقع تثبيتها أو تحديثها. استخدم تطبيق أرثوذكس تيبيكون ومعرض الأدوات في جهازك لإضافتها.'}</p><Link href="/" data-testid="link-widget-today" className="mt-5 inline-flex items-center gap-2 font-bold text-primary">{en ? 'View today’s web content' : 'عرض محتوى اليوم على الويب'}<ArrowRight size={15} /></Link></section></>;
}

function SettingsPage() {
  const app = useApp(), en = app.locale === 'en', [theme, setTheme] = useState(() => localStorage.getItem('orthotypikon-theme') || 'light');
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); localStorage.setItem('orthotypikon-theme', theme); }, [theme]);
  return <><Meta title={en ? 'Settings' : 'الإعدادات'} description={en ? 'Language, calendar and appearance preferences.' : 'تفضيلات اللغة والتقويم والمظهر.'} /><PageIntro eyebrow={en ? 'Preferences' : 'التفضيلات'} title={en ? 'Settings' : 'الإعدادات'} description={en ? 'Your language and calendar preference also apply to the existing calendar pages.' : 'تُطبق تفضيلات اللغة والتقويم على صفحات الرزنامة الحالية أيضًا.'} icon={Settings} /><div className="grid max-w-3xl gap-5"><section className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-4 font-display text-xl font-bold text-primary">{en ? 'Language' : 'اللغة'}</h2><div className="flex gap-2">{(['en', 'ar'] as Locale[]).map((lang) => <button data-testid={`settings-language-${lang}`} key={lang} onClick={() => app.changeLocale(lang)} className={`rounded-xl px-4 py-3 text-sm font-bold ${app.locale === lang ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'}`}>{lang === 'en' ? 'English' : 'العربية'}</button>)}</div></section><section className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-4 font-display text-xl font-bold text-primary">{en ? 'Calendar' : 'التقويم'}</h2><div className="flex flex-wrap gap-2">{(['gregorian', 'julian'] as CalendarType[]).map((type) => <button data-testid={`settings-calendar-${type}`} key={type} onClick={() => app.changeCalendar(type)} className={`rounded-xl px-4 py-3 text-sm font-bold ${app.calendarType === type ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'}`}>{type === 'gregorian' ? en ? 'Western Gregorian' : 'الغريغوري الغربي' : en ? 'Eastern Julian' : 'اليولياني الشرقي'}</button>)}</div></section><section className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-4 font-display text-xl font-bold text-primary">{en ? 'Appearance' : 'المظهر'}</h2><div className="flex gap-2">{['light', 'dark'].map((value) => <button data-testid={`settings-theme-${value}`} key={value} onClick={() => setTheme(value)} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${theme === value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'}`}>{value === 'light' ? <Sun size={16} /> : <Moon size={16} />}{value === 'light' ? en ? 'Light' : 'فاتح' : en ? 'Dark' : 'داكن'}</button>)}</div></section></div></>;
}

function InformationPage() {
  const app = useApp(), params = useParams<{ section: string }>(), en = app.locale === 'en', data = getMoreContent(app.locale), section = params.section;
  const [managedAboutBody, setManagedAboutBody] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setManagedAboutBody(null);
    const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
    fetch(`${base}/api/content/about`)
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ content?: Record<string, { aboutBody?: string }> }>;
      })
      .then((result) => {
        const body = result?.content?.[app.locale]?.aboutBody;
        if (active && typeof body === 'string' && body.trim()) setManagedAboutBody(body);
      })
      .catch(() => {})
    return () => { active = false; };
  }, [app.locale]);
  const page = section === 'privacy' ? data.privacyPage : section === 'terms' ? data.termsPage : null;
  const title = section === 'privacy' ? data.privacy : section === 'terms' ? data.terms : section === 'contact' ? data.contactTitle : data.about;
  return <><Meta title={title} description={title} /><PageIntro eyebrow={en ? 'Information' : 'معلومات'} title={title} description={section === 'contact' ? data.contactForm.intro : en ? 'OrthoTypikon web companion' : 'رفيق أرثوذكس تيبيكون'} icon={section === 'privacy' ? ShieldCheck : section === 'contact' ? Mail : Info} />
    {section === 'contact' && <a href={`mailto:${ORTHOTYPIKON_CONTACT_EMAIL}`} className="mb-5 inline-block font-semibold text-primary underline underline-offset-4">{ORTHOTYPIKON_CONTACT_EMAIL}</a>}
     {page ? <article className="max-w-3xl rounded-[26px] border border-border bg-card p-6 sm:p-9"><h2 className="font-display text-2xl font-bold text-primary">{page.title}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{page.intro}</p><p className="mt-3 text-xs text-muted-foreground">{page.updated}</p><div className="mt-7 space-y-6">{page.sections.map((item, i) => <section key={`${item.title}-${i}`} data-testid={`section-info-${i}`} className="border-t border-border pt-5"><h3 className="font-display text-lg font-bold text-foreground">{item.title}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p></section>)}</div></article> : section === 'contact' ? <ContactPageForm locale={app.locale} /> : <section className="max-w-2xl rounded-[26px] border border-border bg-card p-7"><h2 className="font-display text-2xl font-bold text-primary">OrthoTypikon</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{resolveAboutBody(app.locale, managedAboutBody)}</p></section>}
  </>;
}

function ContactPageForm({ locale }: { locale: Locale }) {
  const data = getMoreContent(locale);
  const mutation = useSubmitContactMessage();
  const [status, setStatus] = useState('');
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setStatus('');
    try {
      await mutation.mutateAsync({ data: {
        name: String(values.get('name') ?? '').trim(),
        email: String(values.get('email') ?? '').trim(),
        country: String(values.get('country') ?? '').trim() || undefined,
        phone: String(values.get('phone') ?? '').trim() || undefined,
        message: String(values.get('message') ?? '').trim(),
        language: locale,
      } });
      setStatus(data.contactForm.submitNotice);
      form.reset();
    } catch (error) {
      const code = (error as { data?: { code?: unknown } })?.data?.code;
      if (code === 'confirmation_delivery_failed') {
        setStatus(data.contactForm.confirmationFailed);
        form.reset();
      } else {
        setStatus(data.contactForm.sendFailed);
      }
    }
  };
  return <form className="grid max-w-2xl gap-4 rounded-[26px] border border-border bg-card p-6" onSubmit={handleSubmit}>
    <label className="grid gap-2 text-sm font-semibold">{data.contactForm.name}<input name="name" required maxLength={120} data-testid="input-contact-text" className="rounded-xl border border-border bg-background px-4 py-3 font-normal" /></label>
    <label className="grid gap-2 text-sm font-semibold">{data.contactForm.email}<input name="email" required type="email" maxLength={254} data-testid="input-contact-email" className="rounded-xl border border-border bg-background px-4 py-3 font-normal" /></label>
    <label className="grid gap-2 text-sm font-semibold">{data.contactForm.country} ({data.contactForm.optional})<input name="country" maxLength={100} data-testid="input-contact-country" className="rounded-xl border border-border bg-background px-4 py-3 font-normal" /></label>
    <label className="grid gap-2 text-sm font-semibold">{data.contactForm.phone} ({data.contactForm.optional})<input name="phone" type="tel" maxLength={32} data-testid="input-contact-phone" className="rounded-xl border border-border bg-background px-4 py-3 font-normal" /></label>
    <label className="grid gap-2 text-sm font-semibold">{data.contactForm.message}<textarea name="message" required maxLength={2000} rows={5} data-testid="input-contact-message" className="resize-y rounded-xl border border-border bg-background px-4 py-3 font-normal" /></label>
    <button disabled={mutation.isPending} data-testid="button-contact-submit" className="w-fit rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">{mutation.isPending ? data.contactForm.sending : data.contactForm.submit}</button>
    {status && <p role="status" data-testid="status-contact" className="rounded-xl bg-secondary p-4 text-sm leading-6 text-primary">{status}</p>}
  </form>;
}

function Router() {
  return <RoutedErrorBoundary><Shell><Switch><Route path="/" component={Home} /><Route path="/calendar" component={CalendarPage} /><Route path="/fasting" component={FastingPage} /><Route path="/saints/:id" component={SaintPage} /><Route path="/saints" component={SaintsPage} /><Route path="/learning" component={LearningPage} /><Route path="/live" component={LivePage} /><Route path="/library" component={LibraryPage} /><Route path="/prayers/:collection" component={PrayerCollectionPage} /><Route path="/bible" component={BiblePage} /><Route path="/prayer" component={PrayerToolPage} /><Route path="/compass" component={CompassPage} /><Route path="/places" component={PlacesPage} /><Route path="/name-days" component={NameDaysPage} /><Route path="/news" component={NewsPage} /><Route path="/prayer-mode" component={PrayerModePage} /><Route path="/settings" component={SettingsPage} /><Route path="/widget" component={WidgetPage} /><Route path="/info/:section" component={InformationPage} /><Route component={NotFound} /></Switch></Shell></RoutedErrorBoundary>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) { const [location] = useLocation(); return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>; }
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;