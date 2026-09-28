import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Route, Switch, useLocation, useRoute } from 'wouter';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Archive, BookOpen, CalendarDays, Check, ChevronRight, CircleAlert, Clock3, FileText,
  Flame, HeartHandshake, KeyRound, Languages, LayoutDashboard, LogOut, Menu, Pencil,
  Plus, Search, ShieldCheck, Sparkles, Utensils, UsersRound, X, type LucideIcon,
} from 'lucide-react';
import {
  getGetAdminOverviewQueryKey, getListAdminCalendarEntriesQueryKey, getListAdminDailyContentQueryKey,
  getListAdminFastingGuidanceQueryKey, getListAdminFastingRecipesQueryKey, getListAdminLearningEntriesQueryKey,
  getListAdminPrayerRequestsQueryKey, getListAdminSaintsQueryKey, setAuthTokenGetter,
  useArchiveAdminCalendarEntry, useArchiveAdminDailyContent, useArchiveAdminFastingGuidance,
  useArchiveAdminFastingRecipe, useArchiveAdminLearningEntry, useArchiveAdminSaint,
  useCreateAdminSession, useCreateAdminSaint, useCreateAdminFastingRecipe, useCreateAdminLearningEntry,
  useGetAdminOverview, useListAdminCalendarEntries, useListAdminDailyContent, useListAdminFastingGuidance,
  useListAdminFastingRecipes, useListAdminLearningEntries, useListAdminPrayerRequests, useListAdminSaints,
  useReviewAdminPrayerRequest, useUpdateAdminCalendarEntry, useUpdateAdminDailyContent,
  useUpdateAdminFastingGuidance, useUpdateAdminFastingRecipe, useUpdateAdminLearningEntry, useUpdateAdminSaint,
  useUpsertAdminCalendarEntry, useUpsertAdminDailyContent, useUpsertAdminFastingGuidance,
  type AdminCalendarEntry, type AdminDailyContent, type AdminFastingGuidance, type AdminFastingRecipe,
  type AdminLearningEntry, type AdminSaint, type PrayerRequest,
} from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';

type AnyRecord = Record<string, any>;
const TOKEN_KEY = 'orthotypikon_admin_token';
const SESSION_EXPIRED_EVENT = 'orthotypikon-admin:session-expired';
const getToken = () => sessionStorage.getItem(TOKEN_KEY);
const is401 = (error: unknown) => (error as { status?: number } | null)?.status === 401;

const nav = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/daily-content', label: 'Daily content', icon: FileText },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/saints', label: 'Saints', icon: Sparkles },
  { href: '/fasting', label: 'Fasting', icon: Flame },
  { href: '/learning', label: 'Learning', icon: BookOpen },
  { href: '/moderation', label: 'Moderation', icon: HeartHandshake },
];

function clearAdminSession(queryClient?: ReturnType<typeof useQueryClient>) {
  sessionStorage.removeItem(TOKEN_KEY);
  setAuthTokenGetter(null);
  queryClient?.clear();
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

function StatusBadge({ status }: { status?: string }) {
  return <span data-testid={`status-${status ?? 'unknown'}`} className={`badge badge-${status ?? 'draft'}`}>{status ?? 'draft'}</span>;
}

function LoadingRows() {
  return <div className="card-body" aria-label="Loading records" data-testid="loading-records">{[1, 2, 3, 4].map((n) => <div key={n} className="skeleton" style={{ height: 44, marginBottom: 10 }} />)}</div>;
}

function QueryState({ loading, error, empty, children }: { loading?: boolean; error?: boolean; empty?: boolean; children: ReactNode }) {
  if (loading) return <LoadingRows />;
  if (error) return <div className="error-state" data-testid="status-query-error"><CircleAlert size={24} style={{ marginBottom: 8 }} /><div>We couldn’t reach the content service.</div><small>Please try again in a moment.</small></div>;
  if (empty) return <div className="empty" data-testid="empty-records"><Sparkles size={25} style={{ marginBottom: 10, opacity: .5 }} /><strong>No records match this view</strong><span>Try a different search or create the first entry.</span></div>;
  return <>{children}</>;
}

function Logo() {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 10px' }}>
    <div className="brand-mark"><span className="serif" style={{ fontSize: 24 }}>O</span></div>
    <div><div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-.03em' }}>OrthoTypikon</div><div className="mono" style={{ fontSize: 9, color: 'hsl(var(--sidebar-muted))', marginTop: 2 }}>STEWARD CONSOLE</div></div>
  </div>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const active = nav.find((item) => item.href === location)?.label ?? 'Workspace';
  const signOut = () => { clearAdminSession(queryClient); setLocation('/login'); };
  return <div className="app-shell">
    <aside className="sidebar">
      <Logo />
      <div className="nav-section">Workspace</div>
      <nav aria-label="Primary navigation">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`} className={`nav-link ${location === href ? 'active' : ''}`}><Icon size={16} strokeWidth={1.8} /><span>{label}</span>{label === 'Moderation' && <span style={{ marginLeft: 'auto', color: 'hsl(var(--accent))' }}>•</span>}</Link>)}</nav>
      <div style={{ marginTop: 'auto', borderTop: '1px solid hsl(39 35% 78% / .13)', paddingTop: 16 }}>
        <button className="nav-link" style={{ border: 0, background: 'transparent', width: '100%' }} onClick={signOut} data-testid="button-sign-out"><LogOut size={16} /><span>Sign out</span></button>
      </div>
    </aside>
    <div className="main-area">
      <header className="topbar">
        <button className="btn btn-quiet mobile-menu" onClick={() => setMenuOpen(!menuOpen)} data-testid="button-mobile-menu"><Menu size={16} /></button>
        <div className="mono" style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{active}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="mono" style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>EN · AR · FR</div>
          <button className="btn btn-quiet btn-small" onClick={signOut} data-testid="button-top-sign-out"><LogOut size={13} /> Sign out</button>
        </div>
      </header>
      {menuOpen && <div style={{ position: 'fixed', zIndex: 30, top: 64, left: 0, right: 0, background: 'hsl(var(--sidebar))', padding: 12 }}>{nav.map(({ href, label }) => <Link onClick={() => setMenuOpen(false)} key={href} href={href} className="nav-link">{label}</Link>)}</div>}
      {children}
    </div>
  </div>;
}

function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="header-row"><div><div className="eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1><p className="page-subtitle">{subtitle}</p></div>{action}</div>;
}

function Overview() {
  const query = useGetAdminOverview();
  const data = query.data as AnyRecord | undefined;
  const items = data ? [
    ['Daily content', data.dailyContent], ['Calendar entries', data.calendarEntries], ['Saint profiles', data.saints],
    ['Fasting guidance', data.fastingGuidance], ['Fasting recipes', data.fastingRecipes], ['Learning entries', data.learningEntries],
  ] : [];
  const total = items.reduce((sum, [, value]) => sum + Number((value as AnyRecord)?.total ?? 0), 0);
  return <main className="workspace">
    <PageHeader eyebrow="Steward desk · today" title="Keep the canon clear." subtitle="A quiet view of what is published, what needs attention, and what is waiting in the queue." />
    <QueryState loading={query.isLoading} error={query.isError} empty={!data}><>
      <div className="metric-grid">
        <div className="card metric"><div className="metric-label">Published records</div><div className="metric-value" data-testid="metric-published">{items.reduce((sum, [, v]) => sum + Number((v as AnyRecord)?.published ?? 0), 0)}</div><div className="metric-detail">Across six content libraries</div></div>
        <div className="card metric"><div className="metric-label">Total library</div><div className="metric-value" data-testid="metric-total">{total}</div><div className="metric-detail">Persistent content records</div></div>
        <div className="card metric"><div className="metric-label">Pending prayers</div><div className="metric-value" data-testid="metric-pending">{data?.prayerRequestsPending ?? 0}</div><div className="metric-detail">Awaiting pastoral review</div></div>
        <div className="card metric"><div className="metric-label">Hidden prayers</div><div className="metric-value" data-testid="metric-hidden">{data?.prayerRequestsHidden ?? 0}</div><div className="metric-detail">Removed from community view</div></div>
      </div>
      <div className="content-grid">
        <section className="card"><div className="card-head"><h2>Publication pulse</h2><span className="mono" style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>ALL LIBRARIES</span></div><div className="card-body"><div className="status-bar">{items.map(([name, value]) => { const v = value as AnyRecord; const max = Math.max(Number(v?.total ?? 1), 1); return <div className="bar-item" key={String(name)}><div className="bar published" style={{ height: `${Math.max((Number(v?.published ?? 0) / max) * 80, 5)}px` }} /><div>{Number(v?.published ?? 0)} / {Number(v?.total ?? 0)}</div><span>{String(name).split(' ')[0]}</span></div>; })}</div><div className="mono" style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', marginTop: 14 }}>Published / total · the green line is the work already visible in the app.</div></div></section>
        <section className="card"><div className="card-head"><h2>At a glance</h2><Link href="/moderation" className="mono" style={{ color: 'hsl(var(--accent))', fontSize: 10, textDecoration: 'none' }}>OPEN QUEUE <ChevronRight size={12} style={{ verticalAlign: 'middle' }} /></Link></div><div className="card-body quick-list">{items.slice(0, 4).map(([name, value]) => <div className="quick-item" key={String(name)}><div className="quick-label"><span className="dot" />{String(name)}</div><strong data-testid={`overview-${String(name).replaceAll(' ', '-')}`}>{(value as AnyRecord)?.draft ?? 0}<span style={{ fontWeight: 400, color: 'hsl(var(--muted-foreground))' }}> drafts</span></strong></div>)}</div></section>
      </div>
    </></QueryState>
  </main>;
}

type FieldDef = { key: string; label: string; type?: string; span?: boolean; options?: string[]; nullable?: boolean };
function EditorModal({ title, fields, initial, onClose, onSave, busy }: { title: string; fields: FieldDef[]; initial: AnyRecord; onClose: () => void; onSave: (data: AnyRecord) => void; busy?: boolean }) {
  const [form, setForm] = useState<AnyRecord>(initial);
  const set = (key: string, value: any) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); onSave(form); };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><form className="modal" onSubmit={submit}><div className="modal-head"><div><div className="eyebrow">Content editor</div><h2>{title}</h2></div><button type="button" className="close" onClick={onClose} data-testid="button-close-modal"><X size={19} /></button></div><div className="modal-body"><div className="form-grid">{fields.map((field) => <div className={`field ${field.span ? 'span-2' : ''}`} key={field.key}><label htmlFor={`field-${field.key}`}>{field.label}</label>{field.options ? <select id={`field-${field.key}`} className="select" value={form[field.key] ?? ''} onChange={(e) => set(field.key, e.target.value)} data-testid={`input-${field.key}`}><option value="">Select</option>{field.options.map((option) => <option value={option} key={option}>{option}</option>)}</select> : field.type === 'textarea' ? <textarea id={`field-${field.key}`} className="textarea" value={form[field.key] ?? ''} onChange={(e) => set(field.key, e.target.value)} data-testid={`input-${field.key}`} /> : <input id={`field-${field.key}`} className="input" type={field.type ?? 'text'} value={form[field.key] ?? ''} onChange={(e) => set(field.key, field.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)} data-testid={`input-${field.key}`} />}</div>)}</div></div><div className="modal-foot"><button type="button" className="btn btn-quiet" onClick={onClose} data-testid="button-cancel-edit">Cancel</button><button type="submit" className="btn btn-primary" disabled={busy} data-testid="button-save-record">{busy ? 'Saving…' : 'Save record'}</button></div></form></div>;
}

function ResourceToolbar({ search, setSearch, onAdd, label = 'New record' }: { search: string; setSearch: (value: string) => void; onAdd: () => void; label?: string }) {
  return <div className="toolbar"><div className="field search"><label htmlFor="record-search">Find in library</label><div style={{ position: 'relative' }}><Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'hsl(var(--muted-foreground))' }} /><input id="record-search" className="input" style={{ paddingLeft: 30 }} placeholder="Search by title or language" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search-records" /></div></div><button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={onAdd} data-testid="button-new-record"><Plus size={15} /> {label}</button></div>;
}

function DailyContentPage() {
  const params = useMemo(() => ({ page: 1, limit: 30 }), []);
  const query = useListAdminDailyContent(params);
  const upsert = useUpsertAdminDailyContent(); const update = useUpdateAdminDailyContent(); const archive = useArchiveAdminDailyContent();
  const qc = useQueryClient(); const [search, setSearch] = useState(''); const [edit, setEdit] = useState<AnyRecord | null>(null);
  const fields: FieldDef[] = [
    { key: 'contentDate', label: 'Content date', type: 'date' }, { key: 'locale', label: 'Locale', options: ['en', 'ar', 'fr'] },
    { key: 'calendarSystem', label: 'Calendar', options: ['gregorian', 'julian'] }, { key: 'publicationStatus', label: 'Status', options: ['draft', 'published', 'archived'] },
    { key: 'verseReference', label: 'Verse reference' }, { key: 'verseAuthor', label: 'Verse author' }, { key: 'verseText', label: 'Verse text', type: 'textarea', span: true },
    { key: 'feastTitle', label: 'Feast title' }, { key: 'feastDescription', label: 'Feast description', type: 'textarea' },
    { key: 'readingTitle', label: 'Reading title' }, { key: 'readingReference', label: 'Reading reference' }, { key: 'readingDurationMinutes', label: 'Reading minutes', type: 'number' },
  ];
  const save = (form: AnyRecord) => { const data = { ...form, feastTitle: form.feastTitle || null, feastDescription: form.feastDescription || null, readingTitle: form.readingTitle || null, readingReference: form.readingReference || null, readingDurationMinutes: form.readingDurationMinutes || null }; const done = () => { qc.invalidateQueries({ queryKey: getListAdminDailyContentQueryKey(params) }); qc.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() }); setEdit(null); }; edit?.id ? update.mutate({ id: edit.id, data: data as any }, { onSuccess: done }) : upsert.mutate({ data: data as any }, { onSuccess: done }); };
  const rows = ((query.data as AnyRecord)?.items ?? []) as AdminDailyContent[]; const filtered = rows.filter((r) => `${r.contentDate} ${r.verseReference} ${r.feastTitle ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  return <main className="workspace"><PageHeader eyebrow="Persistent library · scripture" title="Daily content" subtitle="Shape the verse, feast, and reading that anchor each day." action={<span className="badge badge-published"><Check size={12} /> live library</span>} /><section className="card table-card"><ResourceToolbar search={search} setSearch={setSearch} label="Add daily content" onAdd={() => setEdit({ contentDate: new Date().toISOString().slice(0, 10), calendarSystem: 'gregorian', locale: 'en', verseReference: '', verseText: '', verseAuthor: '', feastTitle: '', feastDescription: '', readingTitle: '', readingReference: '', readingDurationMinutes: null, publicationStatus: 'draft' })} /><QueryState loading={query.isLoading} error={query.isError} empty={!filtered.length}><div className="table-wrap"><table><thead><tr><th>Date</th><th>Verse</th><th>Reading</th><th>Locale</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td className="mono">{row.contentDate}</td><td><div className="table-title">{row.verseReference}</div><span className="table-note">{row.verseText}</span></td><td>{row.readingTitle ?? '—'}<span className="table-note">{row.readingReference ?? 'No reading attached'}</span></td><td><span className="badge badge-draft">{row.locale}</span></td><td><StatusBadge status={row.publicationStatus} /></td><td><div className="actions"><button className="btn btn-quiet btn-small" onClick={() => setEdit(row)} data-testid={`button-edit-daily-${row.id}`}><Pencil size={13} /></button><button className="btn btn-quiet btn-small" onClick={() => { if (confirm('Archive this daily content?')) archive.mutate({ id: row.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListAdminDailyContentQueryKey(params) }) }); }} data-testid={`button-archive-daily-${row.id}`}><Archive size={13} /></button></div></td></tr>)}</tbody></table></div></QueryState></section>{edit && <EditorModal title={edit.id ? 'Edit daily content' : 'New daily content'} fields={fields} initial={edit} onClose={() => setEdit(null)} onSave={save} busy={upsert.isPending || update.isPending} />}</main>;
}

const commonFields: FieldDef[] = [{ key: 'locale', label: 'Locale', options: ['en', 'ar', 'fr'] }, { key: 'publicationStatus', label: 'Status', options: ['draft', 'published', 'archived'] }];
function CalendarPage() {
  const params = useMemo(() => ({ page: 1, limit: 30 }), []); const query = useListAdminCalendarEntries(params); const upsert = useUpsertAdminCalendarEntry(); const update = useUpdateAdminCalendarEntry(); const archive = useArchiveAdminCalendarEntry(); const qc = useQueryClient(); const [search, setSearch] = useState(''); const [edit, setEdit] = useState<AnyRecord | null>(null);
  const fields = [{ key: 'gregorianDate', label: 'Gregorian date', type: 'date' }, { key: 'calendarSystem', label: 'Calendar', options: ['gregorian', 'julian'] }, ...commonFields, { key: 'feastTitle', label: 'Feast title' }, { key: 'fastingTitle', label: 'Fasting title' }, { key: 'liturgy', label: 'Liturgy' }, { key: 'color', label: 'Liturgical color' }, { key: 'saintIds', label: 'Saint IDs · comma separated', span: true }];
  const rows = ((query.data as AnyRecord)?.items ?? []) as AdminCalendarEntry[]; const filtered = rows.filter((r) => `${r.gregorianDate} ${r.feastTitle ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const save = (form: AnyRecord) => { const data = { ...form, feastTitle: form.feastTitle || null, fastingTitle: form.fastingTitle || null, liturgy: form.liturgy || null, color: form.color || null, saintIds: typeof form.saintIds === 'string' ? form.saintIds.split(',').map((s: string) => s.trim()).filter(Boolean) : form.saintIds ?? [] }; const done = () => { qc.invalidateQueries({ queryKey: getListAdminCalendarEntriesQueryKey(params) }); qc.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() }); setEdit(null); }; form.id ? update.mutate({ id: form.id, data: data as any }, { onSuccess: done }) : upsert.mutate({ data: data as any }, { onSuccess: done }); };
  return <main className="workspace"><PageHeader eyebrow="Persistent library · dates" title="Calendar" subtitle="Keep feast days, fasting signals, liturgy, and saint links aligned." /><section className="card table-card"><ResourceToolbar search={search} setSearch={setSearch} label="Add calendar entry" onAdd={() => setEdit({ gregorianDate: new Date().toISOString().slice(0, 10), calendarSystem: 'gregorian', locale: 'en', feastTitle: '', fastingTitle: '', liturgy: '', color: '', saintIds: '', publicationStatus: 'draft' })} /><QueryState loading={query.isLoading} error={query.isError} empty={!filtered.length}><div className="table-wrap"><table><thead><tr><th>Date</th><th>Feast</th><th>Fasting / liturgy</th><th>Saint links</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td className="mono">{row.gregorianDate}<span className="table-note">{row.calendarSystem} · {row.locale}</span></td><td className="table-title">{row.feastTitle ?? 'Ordinary day'}</td><td>{row.fastingTitle ?? 'No fasting note'}<span className="table-note">{row.liturgy ?? 'No liturgy'}</span></td><td>{row.saintIds.length} linked</td><td><StatusBadge status={row.publicationStatus} /></td><td><div className="actions"><button className="btn btn-quiet btn-small" onClick={() => setEdit({ ...row, saintIds: row.saintIds.join(', ') })} data-testid={`button-edit-calendar-${row.id}`}><Pencil size={13} /></button><button className="btn btn-quiet btn-small" onClick={() => { if (confirm('Archive this calendar entry?')) archive.mutate({ id: row.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListAdminCalendarEntriesQueryKey(params) }) }); }} data-testid={`button-archive-calendar-${row.id}`}><Archive size={13} /></button></div></td></tr>)}</tbody></table></div></QueryState></section>{edit && <EditorModal title={edit.id ? 'Edit calendar entry' : 'New calendar entry'} fields={fields} initial={edit} onClose={() => setEdit(null)} onSave={save} busy={upsert.isPending || update.isPending} />}</main>;
}

function SaintsPage() {
  const params = useMemo(() => ({ page: 1, limit: 30 }), []); const query = useListAdminSaints(params); const create = useCreateAdminSaint(); const update = useUpdateAdminSaint(); const archive = useArchiveAdminSaint(); const qc = useQueryClient(); const [search, setSearch] = useState(''); const [edit, setEdit] = useState<AnyRecord | null>(null);
  const rows = ((query.data as AnyRecord)?.items ?? []) as AdminSaint[]; const filtered = rows.filter((r) => `${r.name} ${r.shortBio}`.toLowerCase().includes(search.toLowerCase()));
  const fields: FieldDef[] = [{ key: 'id', label: 'Profile ID' }, { key: 'name', label: 'Name' }, { key: 'feastMonth', label: 'Feast month', type: 'number' }, { key: 'feastDay', label: 'Feast day', type: 'number' }, ...commonFields, { key: 'shortBio', label: 'Short biography', type: 'textarea', span: true }, { key: 'audioText', label: 'Audio text', type: 'textarea', span: true }];
  const save = (form: AnyRecord) => { const data = { ...form, feastMonth: form.feastMonth || null, feastDay: form.feastDay || null }; const done = () => { qc.invalidateQueries({ queryKey: getListAdminSaintsQueryKey(params) }); qc.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() }); setEdit(null); }; form.id && rows.some((r) => r.id === form.id) ? update.mutate({ id: form.id, data: { ...data, id: undefined } as any }, { onSuccess: done }) : create.mutate({ data: data as any }, { onSuccess: done }); };
  return <main className="workspace"><PageHeader eyebrow="Persistent library · synaxarion" title="Saint profiles" subtitle="Maintain concise profiles that make the calendar personal and prayerful." /><section className="card table-card"><ResourceToolbar search={search} setSearch={setSearch} label="Add saint profile" onAdd={() => setEdit({ id: '', name: '', feastMonth: null, feastDay: null, shortBio: '', audioText: '', locale: 'en', publicationStatus: 'draft' })} /><QueryState loading={query.isLoading} error={query.isError} empty={!filtered.length}><div className="table-wrap"><table><thead><tr><th>Profile</th><th>Feast date</th><th>Locale</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><div className="table-title">{row.name}</div><span className="table-note">{row.shortBio}</span></td><td className="mono">{row.feastMonth && row.feastDay ? `${String(row.feastMonth).padStart(2, '0')}.${String(row.feastDay).padStart(2, '0')}` : '—'}</td><td><span className="badge badge-draft">{row.locale}</span></td><td><StatusBadge status={row.publicationStatus} /></td><td><div className="actions"><button className="btn btn-quiet btn-small" onClick={() => setEdit(row)} data-testid={`button-edit-saint-${row.id}`}><Pencil size={13} /></button><button className="btn btn-quiet btn-small" onClick={() => { if (confirm('Archive this saint profile?')) archive.mutate({ id: row.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListAdminSaintsQueryKey(params) }) }); }} data-testid={`button-archive-saint-${row.id}`}><Archive size={13} /></button></div></td></tr>)}</tbody></table></div></QueryState></section>{edit && <EditorModal title={edit.id && rows.some((r) => r.id === edit.id) ? 'Edit saint profile' : 'New saint profile'} fields={fields} initial={edit} onClose={() => setEdit(null)} onSave={save} busy={create.isPending || update.isPending} />}</main>;
}

function FastingPage() {
  const params = useMemo(() => ({ page: 1, limit: 30 }), []); const guidance = useListAdminFastingGuidance(params); const recipes = useListAdminFastingRecipes(params); const upsertGuidance = useUpsertAdminFastingGuidance(); const updateGuidance = useUpdateAdminFastingGuidance(); const archiveGuidance = useArchiveAdminFastingGuidance(); const createRecipe = useCreateAdminFastingRecipe(); const updateRecipe = useUpdateAdminFastingRecipe(); const archiveRecipe = useArchiveAdminFastingRecipe(); const qc = useQueryClient(); const [tab, setTab] = useState<'guidance' | 'recipes'>('guidance'); const [search, setSearch] = useState(''); const [edit, setEdit] = useState<AnyRecord | null>(null);
  const guidanceRows = ((guidance.data as AnyRecord)?.items ?? []) as AdminFastingGuidance[]; const recipeRows = ((recipes.data as AnyRecord)?.items ?? []) as AdminFastingRecipe[]; const rows = tab === 'guidance' ? guidanceRows : recipeRows; const filtered = rows.filter((r) => `${r.title} ${r.locale}`.toLowerCase().includes(search.toLowerCase()));
  const guidanceFields: FieldDef[] = [{ key: 'contentDate', label: 'Content date', type: 'date' }, { key: 'calendarSystem', label: 'Calendar', options: ['gregorian', 'julian'] }, ...commonFields, { key: 'level', label: 'Level', options: ['strict', 'oil', 'fish', 'none'] }, { key: 'title', label: 'Title' }, { key: 'description', label: 'Description', type: 'textarea', span: true }, { key: 'note', label: 'Pastoral note', type: 'textarea', span: true }]; const recipeFields: FieldDef[] = [{ key: 'title', label: 'Recipe title' }, { key: 'subtitle', label: 'Subtitle' }, { key: 'time', label: 'Time' }, { key: 'level', label: 'Level', options: ['strict', 'oil', 'fish', 'none'] }, ...commonFields, { key: 'ingredients', label: 'Ingredients · one per line', type: 'textarea', span: true }, { key: 'steps', label: 'Steps · one per line', type: 'textarea', span: true }];
  const save = (form: AnyRecord) => { const isGuidance = tab === 'guidance'; const data = isGuidance ? { ...form, note: form.note || null } : { ...form, ingredients: typeof form.ingredients === 'string' ? form.ingredients.split('\n').filter(Boolean) : form.ingredients, steps: typeof form.steps === 'string' ? form.steps.split('\n').filter(Boolean) : form.steps }; const done = () => { qc.invalidateQueries({ queryKey: isGuidance ? getListAdminFastingGuidanceQueryKey(params) : getListAdminFastingRecipesQueryKey(params) }); qc.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() }); setEdit(null); }; if (form.id) (isGuidance ? updateGuidance : updateRecipe).mutate({ id: form.id, data: data as any } as any, { onSuccess: done }); else (isGuidance ? upsertGuidance : createRecipe).mutate({ data: data as any } as any, { onSuccess: done }); };
  return <main className="workspace"><PageHeader eyebrow="Persistent library · ascetic rhythm" title="Fasting" subtitle="Pair daily guidance with practical recipes, without losing the pastoral context." action={<div style={{ display: 'flex', gap: 7 }}><button className={`btn ${tab === 'guidance' ? 'btn-primary' : 'btn-quiet'}`} onClick={() => { setTab('guidance'); setEdit(null); }} data-testid="button-tab-guidance"><Clock3 size={14} /> Guidance</button><button className={`btn ${tab === 'recipes' ? 'btn-primary' : 'btn-quiet'}`} onClick={() => { setTab('recipes'); setEdit(null); }} data-testid="button-tab-recipes"><Utensils size={14} /> Recipes</button></div>} /><section className="card table-card"><ResourceToolbar search={search} setSearch={setSearch} label={tab === 'guidance' ? 'Add guidance' : 'Add recipe'} onAdd={() => setEdit(tab === 'guidance' ? { contentDate: new Date().toISOString().slice(0, 10), calendarSystem: 'gregorian', locale: 'en', level: 'none', title: '', description: '', note: '', publicationStatus: 'draft' } : { title: '', subtitle: '', time: '', level: 'none', ingredients: '', steps: '', locale: 'en', publicationStatus: 'draft' })} /><QueryState loading={guidance.isLoading || recipes.isLoading} error={guidance.isError || recipes.isError} empty={!filtered.length}><div className="table-wrap"><table><thead><tr><th>{tab === 'guidance' ? 'Date' : 'Recipe'}</th><th>Title</th><th>Level</th><th>Locale</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td className="mono">{tab === 'guidance' ? (row as AdminFastingGuidance).contentDate : (row as AdminFastingRecipe).time}</td><td><div className="table-title">{row.title}</div><span className="table-note">{tab === 'guidance' ? (row as AdminFastingGuidance).description : (row as AdminFastingRecipe).subtitle}</span></td><td><span className="badge badge-draft">{row.level}</span></td><td><span className="badge badge-draft">{row.locale}</span></td><td><StatusBadge status={row.publicationStatus} /></td><td><div className="actions"><button className="btn btn-quiet btn-small" onClick={() => setEdit(tab === 'recipes' ? { ...row, ingredients: (row as AdminFastingRecipe).ingredients.join('\n'), steps: (row as AdminFastingRecipe).steps.join('\n') } : row)} data-testid={`button-edit-fast-${row.id}`}><Pencil size={13} /></button><button className="btn btn-quiet btn-small" onClick={() => { if (confirm('Archive this fasting record?')) (tab === 'guidance' ? archiveGuidance : archiveRecipe).mutate({ id: row.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: tab === 'guidance' ? getListAdminFastingGuidanceQueryKey(params) : getListAdminFastingRecipesQueryKey(params) }) }); }} data-testid={`button-archive-fast-${row.id}`}><Archive size={13} /></button></div></td></tr>)}</tbody></table></div></QueryState></section>{edit && <EditorModal title={edit.id ? `Edit ${tab === 'guidance' ? 'guidance' : 'recipe'}` : `New ${tab === 'guidance' ? 'guidance' : 'recipe'}`} fields={tab === 'guidance' ? guidanceFields : recipeFields} initial={edit} onClose={() => setEdit(null)} onSave={save} busy={upsertGuidance.isPending || updateGuidance.isPending || createRecipe.isPending || updateRecipe.isPending} />}</main>;
}

function LearningPage() {
  const params = useMemo(() => ({ page: 1, limit: 30 }), []); const query = useListAdminLearningEntries(params); const create = useCreateAdminLearningEntry(); const update = useUpdateAdminLearningEntry(); const archive = useArchiveAdminLearningEntry(); const qc = useQueryClient(); const [search, setSearch] = useState(''); const [edit, setEdit] = useState<AnyRecord | null>(null); const rows = ((query.data as AnyRecord)?.items ?? []) as AdminLearningEntry[]; const filtered = rows.filter((r) => `${r.title} ${r.definition} ${r.alternate ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const fields: FieldDef[] = [{ key: 'category', label: 'Category', options: ['audio', 'icon', 'dictionary'] }, { key: 'locale', label: 'Locale', options: ['en', 'ar', 'fr'] }, ...commonFields.filter((f) => f.key !== 'locale'), { key: 'title', label: 'Title' }, { key: 'alternate', label: 'Alternate spelling' }, { key: 'pronunciation', label: 'Pronunciation' }, { key: 'definition', label: 'Definition', type: 'textarea', span: true }, { key: 'body', label: 'Body', type: 'textarea', span: true }];
  const save = (form: AnyRecord) => { const data = { ...form, alternate: form.alternate || null, pronunciation: form.pronunciation || null, body: form.body || null }; const done = () => { qc.invalidateQueries({ queryKey: getListAdminLearningEntriesQueryKey(params) }); qc.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() }); setEdit(null); }; form.id ? update.mutate({ id: form.id, data: data as any }, { onSuccess: done }) : create.mutate({ data: data as any }, { onSuccess: done }); };
  return <main className="workspace"><PageHeader eyebrow="Persistent library · formation" title="Learning" subtitle="Make words, sounds, and definitions ready for the people learning to pray." /><section className="card table-card"><ResourceToolbar search={search} setSearch={setSearch} label="Add learning entry" onAdd={() => setEdit({ category: 'dictionary', title: '', alternate: '', pronunciation: '', definition: '', body: '', locale: 'en', publicationStatus: 'draft' })} /><QueryState loading={query.isLoading} error={query.isError} empty={!filtered.length}><div className="table-wrap"><table><thead><tr><th>Entry</th><th>Category</th><th>Locale</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><div className="table-title">{row.title}</div><span className="table-note">{row.definition}</span></td><td><span className="badge badge-draft">{row.category}</span></td><td><span className="badge badge-draft">{row.locale}</span></td><td><StatusBadge status={row.publicationStatus} /></td><td><div className="actions"><button className="btn btn-quiet btn-small" onClick={() => setEdit(row)} data-testid={`button-edit-learning-${row.id}`}><Pencil size={13} /></button><button className="btn btn-quiet btn-small" onClick={() => { if (confirm('Archive this learning entry?')) archive.mutate({ id: row.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListAdminLearningEntriesQueryKey(params) }) }); }} data-testid={`button-archive-learning-${row.id}`}><Archive size={13} /></button></div></td></tr>)}</tbody></table></div></QueryState></section>{edit && <EditorModal title={edit.id ? 'Edit learning entry' : 'New learning entry'} fields={fields} initial={edit} onClose={() => setEdit(null)} onSave={save} busy={create.isPending || update.isPending} />}</main>;
}

function ModerationPage() {
  const query = useListAdminPrayerRequests(); const review = useReviewAdminPrayerRequest(); const qc = useQueryClient(); const requests = ((query.data as AnyRecord)?.requests ?? []) as PrayerRequest[];
  const act = (id: string, status: 'approved' | 'rejected' | 'hidden') => review.mutate({ requestId: id, data: { status } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListAdminPrayerRequestsQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() }); } });
  return <main className="workspace"><PageHeader eyebrow="Pastoral care · review queue" title="Moderation" subtitle="Read with care. Keep the community prayer space truthful, safe, and kind." action={<span className="badge badge-pending"><UsersRound size={12} /> {requests.length} awaiting review</span>} /><section className="card table-card"><div className="card-head"><h2>Prayer requests</h2><span className="mono" style={{ color: 'hsl(var(--muted-foreground))', fontSize: 10 }}>PRIVATE REVIEW · NO PUBLIC NAMES</span></div><QueryState loading={query.isLoading} error={query.isError} empty={!requests.length}><div className="table-wrap"><table><thead><tr><th>Request</th><th>Category</th><th>Visibility</th><th>Submitted</th><th>Review</th></tr></thead><tbody>{requests.map((request) => <tr key={request.id}><td><div className="table-title">{request.nameVisibility === 'anonymous' ? 'Anonymous request' : request.name}</div><span className="table-note">Expires {request.expiresAt ? new Date(request.expiresAt).toLocaleDateString() : 'when removed'}</span></td><td>{request.category ?? 'other'}</td><td>{request.visibility}</td><td className="mono">{new Date(request.createdAt).toLocaleDateString()}</td><td><div className="actions"><button className="btn btn-primary btn-small" onClick={() => act(request.id, 'approved')} disabled={review.isPending} data-testid={`button-approve-prayer-${request.id}`}><Check size={13} /> Approve</button><button className="btn btn-quiet btn-small" onClick={() => act(request.id, 'hidden')} disabled={review.isPending} data-testid={`button-hide-prayer-${request.id}`}><Archive size={13} /></button><button className="btn btn-quiet btn-small" onClick={() => act(request.id, 'rejected')} disabled={review.isPending} data-testid={`button-reject-prayer-${request.id}`}><X size={13} /></button></div></td></tr>)}</tbody></table></div></QueryState></section></main>;
}

function Login() {
  const [, setLocation] = useLocation(); const queryClient = useQueryClient(); const session = useCreateAdminSession(); const [key, setKey] = useState(''); const [show, setShow] = useState(false); const [expired, setExpired] = useState(false);
  const submit = (event: FormEvent) => { event.preventDefault(); setExpired(false); session.mutate({ data: { key } }, { onSuccess: (data) => { sessionStorage.setItem(TOKEN_KEY, data.token); setAuthTokenGetter(getToken); queryClient.clear(); setLocation('/'); }, onError: () => setExpired(true) }); };
   return <main className="login-page"><section className="login-art"><Logo /><div className="login-quote"><div className="eyebrow" style={{ color: 'hsl(35 65% 68%)' }}>For the keepers of the day</div><h1 className="serif">A steady hand for sacred content.</h1><p>OrthoTypikon Admin brings the daily word, the calendar, and the people behind the prayers into one calm workspace.</p></div><div className="login-note">CONTENT STEWARDSHIP · ORTHOTYPikon / 01</div></section><section className="login-form-wrap"><form className="login-form" onSubmit={submit}><div className="eyebrow">Administrator access</div><h2>Welcome back.</h2><p>Use the short-lived access key issued to your editorial team. It stays in this browser session only.</p><div className="field"><label htmlFor="admin-key">Access key</label><div style={{ position: 'relative' }}><KeyRound size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'hsl(var(--muted-foreground))' }} /><input id="admin-key" name="admin-access-key" autoComplete="new-password" autoFocus required className="input" style={{ paddingLeft: 34, paddingRight: 62 }} type={show ? 'text' : 'password'} value={key} onChange={(e) => setKey(e.target.value)} placeholder="Enter your access key" data-testid="input-admin-key" /><button type="button" onClick={() => setShow(!show)} className="close" style={{ position: 'absolute', right: 8, top: 6, fontSize: 11 }} data-testid="button-toggle-key">{show ? 'Hide' : 'Show'}</button></div></div>{expired && <div style={{ display: 'flex', gap: 8, color: 'hsl(var(--danger))', fontSize: 12, margin: '16px 0' }} data-testid="status-login-error"><CircleAlert size={15} /> The key was not accepted, or the session has expired.</div>}<button className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} disabled={session.isPending} data-testid="button-submit-login">{session.isPending ? 'Opening workspace…' : 'Enter workspace'} <ChevronRight size={15} /></button><div className="login-foot">Session keys are never stored with your typed value.</div></form></section></main>;
}

function AuthGate({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation(); const [ready, setReady] = useState(false);
  useEffect(() => {
    const redirectOnExpiry = () => setLocation('/login');
    window.addEventListener(SESSION_EXPIRED_EVENT, redirectOnExpiry);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, redirectOnExpiry);
  }, [setLocation]);
  useEffect(() => { setAuthTokenGetter(getToken); setReady(true); if (!getToken() && location !== '/login') setLocation('/login'); }, [location, setLocation]);
  if (!ready) return <div className="login-page"><div className="login-form-wrap"><div className="skeleton" style={{ width: 280, height: 160 }} /></div></div>;
  if (!getToken()) return <Login />;
  return <Shell>{children}</Shell>;
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (error) => { if (is401(error)) clearAdminSession(queryClient); } }),
  mutationCache: new MutationCache({ onError: (error) => { if (is401(error)) clearAdminSession(queryClient); } }),
});
function Router() {
  return <Switch><Route path="/" component={Overview} /><Route path="/daily-content" component={DailyContentPage} /><Route path="/calendar" component={CalendarPage} /><Route path="/saints" component={SaintsPage} /><Route path="/fasting" component={FastingPage} /><Route path="/learning" component={LearningPage} /><Route path="/moderation" component={ModerationPage} /><Route component={NotFound} /></Switch>;
}
function App() {
  return <QueryClientProvider client={queryClient}><AuthGate><Router /></AuthGate></QueryClientProvider>;
}
export default App;