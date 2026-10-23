import { useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { translateCurrentAdminText } from '@/lib/admin-locale';
import {
  AlertCircle, Archive, Check, CheckCircle2, Church, ExternalLink,
  MapPin, Pencil, Plus, RotateCcw, Search, ShieldCheck, X,
} from 'lucide-react';
import {
  getListAdminOrthodoxPlaceReportsQueryKey,
  getListAdminOrthodoxPlacesQueryKey,
  useCreateAdminOrthodoxPlace,
  useListAdminOrthodoxPlaceReports,
  useListAdminOrthodoxPlaces,
  useRetireAdminOrthodoxPlace,
  useReviewAdminOrthodoxPlaceReport,
  useUpdateAdminOrthodoxPlace,
  type AdminOrthodoxPlace,
  type AdminOrthodoxPlaceInput,
  type AdminOrthodoxPlaceReport,
} from '@workspace/api-client-react';

type PlaceForm = Omit<AdminOrthodoxPlaceInput, 'latitude' | 'longitude'> & {
  latitude: string;
  longitude: string;
};

const blankPlace: PlaceForm = {
  name: '',
  category: 'church',
  jurisdiction: '',
  latitude: '',
  longitude: '',
  address: '',
  sourceName: '',
  sourceUrl: '',
  verificationDetails: '',
  isVerified: false,
  status: 'active',
};

const categoryLabel: Record<AdminOrthodoxPlace['category'], string> = {
  church: 'Church',
  monastery: 'Monastery',
  school: 'School',
};

function formatDate(value: string | null) {
  if (!value) return 'Not yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function StatusPill({ value }: { value: string }) {
  return <span className={`places-pill places-pill-${value}`}>{value}</span>;
}

function PlaceEditor({
  place,
  busy,
  error,
  onClose,
  onSave,
}: {
  place: AdminOrthodoxPlace | null;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (form: PlaceForm) => void;
}) {
  const [form, setForm] = useState<PlaceForm>(() => place ? {
    name: place.name,
    category: place.category,
    jurisdiction: place.jurisdiction,
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    address: place.address,
    sourceName: place.sourceName,
    sourceUrl: place.sourceUrl ?? '',
    verificationDetails: place.verificationDetails,
    isVerified: place.isVerified,
    status: place.status,
  } : blankPlace);
  const set = <K extends keyof PlaceForm>(key: K, value: PlaceForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(form);
  };

  return <div className="places-overlay" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget && !busy) onClose();
  }}>
    <form className="places-editor" onSubmit={submit} aria-labelledby="place-editor-title">
      <div className="places-editor-head">
        <div><div className="eyebrow">Directory record</div><h2 id="place-editor-title">{place ? 'Edit listing' : 'Add a place'}</h2></div>
        <button type="button" className="close" onClick={onClose} aria-label="Close editor" data-testid="button-close-place-editor"><X size={19} /></button>
      </div>
      <div className="places-editor-body">
        {error && <div className="places-form-error" role="alert"><AlertCircle size={15} />{error}</div>}
        <div className="places-form-grid">
          <label className="field"><span>Name</span><input className="input" required maxLength={200} value={form.name} onChange={(e) => set('name', e.target.value)} data-testid="input-place-name" /></label>
          <label className="field"><span>Category</span><select className="select" value={form.category} onChange={(e) => set('category', e.target.value as PlaceForm['category'])} data-testid="input-place-category"><option value="church">Church</option><option value="monastery">Monastery</option><option value="school">School</option></select></label>
          <label className="field"><span>Jurisdiction</span><input className="input" required maxLength={200} value={form.jurisdiction} onChange={(e) => set('jurisdiction', e.target.value)} placeholder="e.g. Antiochian Orthodox Archdiocese" data-testid="input-place-jurisdiction" /></label>
          <label className="field"><span>Listing status</span><select className="select" value={form.status} onChange={(e) => set('status', e.target.value as PlaceForm['status'])} data-testid="input-place-status"><option value="active">Active</option><option value="retired">Retired</option></select></label>
          <label className="field places-span-2"><span>Street address</span><input className="input" required maxLength={500} value={form.address} onChange={(e) => set('address', e.target.value)} data-testid="input-place-address" /></label>
          <label className="field"><span>Latitude</span><input className="input" type="number" required min={-90} max={90} step="any" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} data-testid="input-place-latitude" /></label>
          <label className="field"><span>Longitude</span><input className="input" type="number" required min={-180} max={180} step="any" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} data-testid="input-place-longitude" /></label>
          <label className="field"><span>Verification source</span><input className="input" required maxLength={200} value={form.sourceName} onChange={(e) => set('sourceName', e.target.value)} placeholder="Official parish site, diocese…" data-testid="input-place-source" /></label>
          <label className="field"><span>Source URL <small>(optional)</small></span><input className="input" type="url" maxLength={1000} value={form.sourceUrl ?? ''} onChange={(e) => set('sourceUrl', e.target.value)} placeholder="https://" data-testid="input-place-source-url" /></label>
          <label className="field places-span-2"><span>Verification notes</span><textarea className="textarea" required maxLength={2000} value={form.verificationDetails} onChange={(e) => set('verificationDetails', e.target.value)} placeholder="Record what was checked and when…" data-testid="input-place-verification-details" /></label>
          <label className="places-check places-span-2"><input type="checkbox" checked={form.isVerified} onChange={(e) => set('isVerified', e.target.checked)} data-testid="input-place-verified" /><span><strong>Verified listing</strong><small>Mark only when the source details have been checked.</small></span><ShieldCheck size={17} /></label>
        </div>
      </div>
      <div className="places-editor-foot"><button type="button" className="btn btn-quiet" onClick={onClose} disabled={busy} data-testid="button-cancel-place-edit">Cancel</button><button type="submit" className="btn btn-primary" disabled={busy} data-testid="button-save-place"><Check size={14} />{busy ? 'Saving…' : place ? 'Save changes' : 'Create listing'}</button></div>
    </form>
  </div>;
}

function QueryNotice({ loading, error, empty, onRetry }: { loading: boolean; error: boolean; empty: boolean; onRetry: () => void }) {
  if (loading) return <div className="places-loading" aria-label="Loading directory"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  if (error) return <div className="places-notice places-error" role="alert"><AlertCircle size={19} /><div><strong>Directory could not be reached</strong><span>Try again when the content service is available.</span></div><button className="btn btn-quiet btn-small" onClick={onRetry} data-testid="button-retry-places">Retry</button></div>;
  if (empty) return <div className="places-empty"><MapPin size={22} /><strong>No places in this view</strong><span>Adjust the filters or add a listing to begin the directory.</span></div>;
  return null;
}

export default function OrthodoxPlacesPage() {
  const placesQuery = useListAdminOrthodoxPlaces();
  const reportsQuery = useListAdminOrthodoxPlaceReports();
  const create = useCreateAdminOrthodoxPlace();
  const update = useUpdateAdminOrthodoxPlace();
  const retire = useRetireAdminOrthodoxPlace();
  const review = useReviewAdminOrthodoxPlaceReport();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [placeStatus, setPlaceStatus] = useState('all');
  const [reportStatus, setReportStatus] = useState('open');
  const [editorPlace, setEditorPlace] = useState<AdminOrthodoxPlace | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState('');

  const places = placesQuery.data ?? [];
  const reports = reportsQuery.data ?? [];
  const visiblePlaces = useMemo(() => places.filter((place) => {
    const term = search.trim().toLowerCase();
    const matchesTerm = !term || `${place.name} ${place.jurisdiction} ${place.address} ${place.sourceName}`.toLowerCase().includes(term);
    return matchesTerm && (category === 'all' || place.category === category) && (placeStatus === 'all' || place.status === placeStatus);
  }), [places, search, category, placeStatus]);
  const visibleReports = useMemo(() => reports.filter((report) => reportStatus === 'all' || report.status === reportStatus), [reports, reportStatus]);
  const activeCount = places.filter((place) => place.status === 'active').length;
  const verifiedCount = places.filter((place) => place.status === 'active' && place.isVerified).length;
  const openCount = reports.filter((report) => report.status === 'open').length;

  const notify = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(''), 4200);
  };
  const invalidatePlaces = () => queryClient.invalidateQueries({ queryKey: getListAdminOrthodoxPlacesQueryKey() });
  const invalidateReports = () => queryClient.invalidateQueries({ queryKey: getListAdminOrthodoxPlaceReportsQueryKey() });
  const openEditor = (place?: AdminOrthodoxPlace) => {
    setEditorPlace(place ?? null);
    setFormError('');
    setEditorOpen(true);
  };
  const savePlace = (form: PlaceForm) => {
    const data: AdminOrthodoxPlaceInput = {
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      sourceUrl: form.sourceUrl?.trim() || null,
      name: form.name.trim(),
      jurisdiction: form.jurisdiction.trim(),
      address: form.address.trim(),
      sourceName: form.sourceName.trim(),
      verificationDetails: form.verificationDetails.trim(),
    };
    const done = () => {
      void invalidatePlaces();
      setEditorOpen(false);
      notify(editorPlace ? 'Listing changes saved.' : 'Place added to the directory.');
    };
    if (editorPlace) {
      update.mutate({ id: editorPlace.id, data }, { onSuccess: done, onError: () => setFormError('The listing could not be saved. Check your connection and try again.') });
    } else {
      create.mutate({ data }, { onSuccess: done, onError: () => setFormError('The listing could not be created. Check the required details and try again.') });
    }
  };
  const retirePlace = (place: AdminOrthodoxPlace) => {
    if (!window.confirm(translateCurrentAdminText(`Retire “${place.name}” from the active directory? You can restore it by editing its status.`))) return;
    retire.mutate({ id: place.id }, {
      onSuccess: () => { void invalidatePlaces(); notify(`${place.name} retired. Restore it by editing its status to active.`); },
      onError: () => notify('Could not retire this listing. Please try again.'),
    });
  };
  const setReport = (report: AdminOrthodoxPlaceReport, status: AdminOrthodoxPlaceReport['status']) => {
    review.mutate({ id: report.id, data: { status } }, {
      onSuccess: () => { void invalidateReports(); notify(`Report marked ${status}.`); },
      onError: () => notify('The report could not be updated. Please try again.'),
    });
  };

  return <main className="workspace places-page">
    <style>{`
      .places-page{--places-ink:hsl(var(--primary));--places-soft:hsl(214 34% 94%);--places-copper:hsl(var(--accent))}
      .places-page .header-row{align-items:flex-start}
      .places-summary{display:flex;align-items:center;gap:10px;color:hsl(var(--muted-foreground));font:10px var(--app-font-mono);text-transform:uppercase;letter-spacing:.07em}
      .places-summary strong{color:hsl(var(--foreground));font-size:17px;letter-spacing:-.04em;font-family:var(--app-font-sans)}
      .places-summary .summary-divider{height:22px;width:1px;background:hsl(var(--border));margin:0 5px}
      .places-content{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(300px,.86fr);gap:17px;align-items:start}
      .places-panel{overflow:hidden}
      .places-panel-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:17px 19px;border-bottom:1px solid hsl(var(--border))}
      .places-panel-head h2{margin:0;font-size:15px;letter-spacing:-.025em}
      .places-panel-head p{margin:4px 0 0;font-size:11px;color:hsl(var(--muted-foreground))}
      .places-panel-label{font:500 10px var(--app-font-mono);letter-spacing:.1em;text-transform:uppercase;color:hsl(var(--accent))}
      .places-toolbar{display:flex;gap:9px;align-items:end;flex-wrap:wrap;padding:13px 17px;border-bottom:1px solid hsl(var(--border));background:hsl(39 30% 96%/.5)}
      .places-toolbar .field{flex:1;min-width:168px}.places-toolbar .places-filter{width:132px;flex:0 0 132px}
      .places-search-wrap{position:relative}.places-search-wrap .input{padding-left:31px}.places-search-wrap svg{position:absolute;left:10px;top:10px;color:hsl(var(--muted-foreground))}
      .places-directory-list{display:grid}
      .places-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:15px;padding:15px 18px;border-bottom:1px solid hsl(var(--border));transition:background .16s}
      .places-row:last-child{border-bottom:0}.places-row:hover{background:hsl(39 30% 96%/.58)}
      .places-row-main{min-width:0}.places-row-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .places-row-title h3{margin:0;font-size:13px;font-weight:650;letter-spacing:-.02em}
      .places-type{font:500 9px var(--app-font-mono);text-transform:uppercase;letter-spacing:.06em;color:hsl(var(--muted-foreground));border:1px solid hsl(var(--border));border-radius:99px;padding:3px 7px}
      .places-row-meta{display:flex;align-items:center;gap:6px;color:hsl(var(--muted-foreground));font-size:11px;margin-top:6px}
      .places-row-address{font-size:11px;line-height:1.45;color:hsl(var(--muted-foreground));margin-top:5px;overflow-wrap:anywhere}
      .places-row-source{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:10px;color:hsl(var(--muted-foreground));margin-top:8px}
      .places-row-source a{color:hsl(var(--primary));display:inline-flex;align-items:center;gap:3px;text-decoration:none}.places-row-source a:hover{text-decoration:underline}
      .places-row-actions{display:flex;align-items:center;gap:5px}
      .places-pill{display:inline-flex;align-items:center;border-radius:99px;padding:4px 8px;font:500 9px var(--app-font-mono);letter-spacing:.04em;text-transform:uppercase;background:hsl(var(--muted));color:hsl(var(--muted-foreground))}
      .places-pill-active,.places-pill-resolved{background:hsl(var(--success)/.12);color:hsl(var(--success))}
      .places-pill-retired,.places-pill-reviewed{background:hsl(var(--muted));color:hsl(var(--muted-foreground))}
      .places-pill-open{background:hsl(var(--accent)/.15);color:hsl(31 55% 35%)}
      .places-pill-verified{background:hsl(var(--success)/.12);color:hsl(var(--success));gap:4px}
      .places-unverified{color:hsl(var(--muted-foreground));font:10px var(--app-font-mono)}
      .places-reports{display:grid}.places-report{padding:15px 17px;border-bottom:1px solid hsl(var(--border))}
      .places-report:last-child{border-bottom:0}.places-report-top{display:flex;justify-content:space-between;gap:10px;align-items:center}
      .places-report-place{font-size:12px;font-weight:650;letter-spacing:-.01em}.places-report-details{margin:9px 0;color:hsl(var(--foreground));font-size:12px;line-height:1.55;overflow-wrap:anywhere}
      .places-report-date{font:10px var(--app-font-mono);color:hsl(var(--muted-foreground))}
      .places-report-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:11px}
      .places-loading{padding:16px;display:grid;gap:10px}.places-loading .skeleton{height:74px}
      .places-notice{padding:25px 18px;display:flex;align-items:center;gap:12px;color:hsl(var(--muted-foreground));font-size:12px}
      .places-notice>div{display:grid;gap:3px;flex:1}.places-notice strong{color:hsl(var(--foreground))}.places-error{color:hsl(var(--danger))}
      .places-empty{padding:32px 18px;text-align:center;display:grid;justify-items:center;gap:7px;color:hsl(var(--muted-foreground));font-size:11px}
      .places-empty svg{color:hsl(var(--accent));margin-bottom:3px}.places-empty strong{font-size:12px;color:hsl(var(--foreground))}
      .places-overlay{position:fixed;inset:0;z-index:60;background:hsl(214 40% 12%/.48);display:grid;place-items:center;padding:16px;animation:fade-in .16s ease both}
      .places-editor{width:min(720px,100%);max-height:min(850px,calc(100dvh - 32px));overflow:auto;background:hsl(var(--card));border:1px solid hsl(var(--border));border-radius:14px;box-shadow:0 24px 70px hsl(214 40% 12%/.26);animation:rise-in .2s ease both}
      .places-editor-head{padding:19px 22px;border-bottom:1px solid hsl(var(--border));display:flex;justify-content:space-between;align-items:flex-start}
      .places-editor-head h2{font-size:20px;letter-spacing:-.035em;margin:3px 0 0}.places-editor-body{padding:20px 22px}
      .places-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
      .places-form-grid .field{gap:6px}.places-form-grid .field>span{font-size:11px;color:hsl(var(--muted-foreground));font-weight:600}
      .places-form-grid .field small{font-weight:400}.places-span-2{grid-column:span 2}
      .places-check{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid hsl(var(--border));border-radius:8px;background:hsl(39 30% 96%/.48);cursor:pointer}
      .places-check input{accent-color:hsl(var(--success));width:15px;height:15px}.places-check span{display:grid;gap:2px;flex:1;font-size:12px}.places-check small{font-size:10px;color:hsl(var(--muted-foreground))}
      .places-check svg{color:hsl(var(--success))}.places-editor-foot{padding:15px 22px;border-top:1px solid hsl(var(--border));display:flex;justify-content:flex-end;gap:8px}
      .places-form-error{display:flex;gap:8px;align-items:center;padding:10px 12px;margin-bottom:14px;background:hsl(var(--danger)/.08);border-radius:7px;color:hsl(var(--danger));font-size:12px}
      .places-feedback{position:fixed;right:22px;bottom:22px;z-index:80;display:flex;align-items:center;gap:9px;padding:12px 15px;border:1px solid hsl(var(--success)/.22);background:hsl(var(--card));color:hsl(var(--success));border-radius:9px;box-shadow:0 8px 24px hsl(214 30% 20%/.12);font-size:12px;animation:rise-in .18s ease both}
      @media(max-width:1050px){.places-content{grid-template-columns:1fr}.places-reports{grid-template-columns:repeat(2,minmax(0,1fr))}.places-report:nth-child(odd){border-right:1px solid hsl(var(--border))}}
      @media(max-width:720px){.places-summary{flex-wrap:wrap}.places-toolbar .places-filter{flex:1;min-width:130px}.places-reports{grid-template-columns:1fr}.places-report:nth-child(odd){border-right:0}.places-row{padding:14px 13px;grid-template-columns:minmax(0,1fr)}.places-row-actions{justify-content:flex-end}.places-panel-head{padding:15px}.places-form-grid{grid-template-columns:1fr}.places-span-2{grid-column:auto}.places-editor-body{padding:16px}.places-editor-head,.places-editor-foot{padding-left:17px;padding-right:17px}.places-feedback{left:14px;right:14px;bottom:14px}}
    `}</style>
    <div className="header-row">
      <div><div className="eyebrow">Steward desk · directory</div><h1 className="page-title">Orthodox places</h1><p className="page-subtitle">Keep the places people rely on accurate, sourced, and worthy of trust.</p></div>
      <div className="places-summary" aria-label="Directory summary" data-testid="places-summary">
        <span><strong>{activeCount}</strong> active</span><span className="summary-divider" />
        <span><strong>{verifiedCount}</strong> verified</span><span className="summary-divider" />
        <span><strong>{openCount}</strong> reports open</span>
      </div>
    </div>

    <div className="places-content">
      <section className="card places-panel" aria-labelledby="directory-title">
        <div className="places-panel-head">
          <div><h2 id="directory-title">Directory listings</h2><p>Churches, monasteries, and schools entrusted to the directory.</p></div>
          <button className="btn btn-primary" onClick={() => openEditor()} data-testid="button-add-place"><Plus size={15} /> Add place</button>
        </div>
        <div className="places-toolbar">
          <label className="field"><span>Search listings</span><div className="places-search-wrap"><Search size={14} /><input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, jurisdiction, address…" data-testid="input-search-places" /></div></label>
          <label className="field places-filter"><span>Category</span><select className="select" value={category} onChange={(e) => setCategory(e.target.value)} data-testid="select-place-category"><option value="all">All categories</option><option value="church">Church</option><option value="monastery">Monastery</option><option value="school">School</option></select></label>
          <label className="field places-filter"><span>Status</span><select className="select" value={placeStatus} onChange={(e) => setPlaceStatus(e.target.value)} data-testid="select-place-status"><option value="all">All statuses</option><option value="active">Active</option><option value="retired">Retired</option></select></label>
        </div>
        {placesQuery.isLoading || placesQuery.isError || visiblePlaces.length === 0
          ? <QueryNotice loading={placesQuery.isLoading} error={placesQuery.isError} empty={!placesQuery.isLoading && !placesQuery.isError && visiblePlaces.length === 0} onRetry={() => void placesQuery.refetch()} />
          : <div className="places-directory-list">{visiblePlaces.map((place) => <article className="places-row" key={place.id} data-testid={`place-row-${place.id}`}>
            <div className="places-row-main">
              <div className="places-row-title"><Church size={15} color="hsl(var(--accent))" /><h3>{place.name}</h3><span className="places-type">{categoryLabel[place.category]}</span><StatusPill value={place.status} /></div>
              <div className="places-row-meta"><span>{place.jurisdiction}</span><span aria-hidden="true">·</span>{place.isVerified ? <span className="places-pill places-pill-verified"><ShieldCheck size={11} /> verified</span> : <span className="places-unverified">Unverified</span>}</div>
              <div className="places-row-address"><MapPin size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />{place.address}</div>
              <div className="places-row-source"><span>Source: {place.sourceName}</span>{place.sourceUrl && <a href={place.sourceUrl} target="_blank" rel="noreferrer">Visit source <ExternalLink size={10} /></a>}<span>· {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}</span></div>
            </div>
            <div className="places-row-actions">
              <button className="btn btn-quiet btn-small" onClick={() => openEditor(place)} aria-label={`Edit ${place.name}`} data-testid={`button-edit-place-${place.id}`}><Pencil size={13} /> Edit</button>
              {place.status === 'active' && <button className="btn btn-quiet btn-small" onClick={() => retirePlace(place)} disabled={retire.isPending} aria-label={`Retire ${place.name}`} data-testid={`button-retire-place-${place.id}`}><Archive size={13} /></button>}
            </div>
          </article>)}</div>}
      </section>

      <section className="card places-panel" aria-labelledby="reports-title">
        <div className="places-panel-head">
          <div><div className="places-panel-label">Community corrections</div><h2 id="reports-title" style={{ marginTop: 5 }}>Incorrect-detail reports</h2><p>Review each note against its listing and source.</p></div>
          <span className="places-pill places-pill-open">{openCount} open</span>
        </div>
        <div className="toolbar" style={{ padding: '11px 15px' }}>
          <label className="field" style={{ width: '100%' }}><span>Show reports</span><select className="select" value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} data-testid="select-report-status"><option value="open">Open reports</option><option value="reviewed">Reviewed</option><option value="resolved">Resolved</option><option value="all">All reports</option></select></label>
        </div>
        {reportsQuery.isLoading
          ? <div className="places-loading" aria-label="Loading reports"><div className="skeleton" /><div className="skeleton" /></div>
          : reportsQuery.isError
            ? <div className="places-notice places-error" role="alert"><AlertCircle size={18} /><div><strong>Reports unavailable</strong><span>Please retry the report queue.</span></div><button className="btn btn-quiet btn-small" onClick={() => void reportsQuery.refetch()} data-testid="button-retry-reports">Retry</button></div>
            : visibleReports.length === 0
              ? <div className="places-empty"><CheckCircle2 size={22} /><strong>{reportStatus === 'open' ? 'No open reports' : 'No reports in this view'}</strong><span>{reportStatus === 'open' ? 'The directory has no corrections waiting for review.' : 'Try another report status.'}</span></div>
              : <div className="places-reports">{visibleReports.map((report) => <article className="places-report" key={report.id} data-testid={`place-report-${report.id}`}>
                <div className="places-report-top"><div className="places-report-place">{report.placeName}</div><StatusPill value={report.status} /></div>
                <p className="places-report-details">{report.details}</p>
                <div className="places-report-date">Received {formatDate(report.createdAt)}{report.reviewedAt ? ` · reviewed ${formatDate(report.reviewedAt)}` : ''}</div>
                <div className="places-report-actions">
                  {report.status !== 'reviewed' && <button className="btn btn-quiet btn-small" onClick={() => setReport(report, 'reviewed')} disabled={review.isPending} data-testid={`button-review-report-${report.id}`}><Check size={12} /> Mark reviewed</button>}
                  {report.status !== 'resolved' && <button className="btn btn-primary btn-small" onClick={() => setReport(report, 'resolved')} disabled={review.isPending} data-testid={`button-resolve-report-${report.id}`}><CheckCircle2 size={12} /> Resolve</button>}
                  {report.status !== 'open' && <button className="btn btn-quiet btn-small" onClick={() => setReport(report, 'open')} disabled={review.isPending} data-testid={`button-reopen-report-${report.id}`}><RotateCcw size={12} /> Reopen</button>}
                </div>
              </article>)}</div>}
      </section>
    </div>

    {editorOpen && <PlaceEditor place={editorPlace} busy={create.isPending || update.isPending} error={formError} onClose={() => setEditorOpen(false)} onSave={savePlace} />}
    {feedback && <div className="places-feedback" role="status" data-testid="status-place-feedback"><CheckCircle2 size={15} />{feedback}<button className="close" onClick={() => setFeedback('')} aria-label="Dismiss notification"><X size={14} /></button></div>}
  </main>;
}