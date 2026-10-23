import './_group.css';

const exploreItems = [
  { key: 'library', label: 'المكتبة', image: 'services.jpg', route: '/library', color: '#25394A' },
  { key: 'prayer', label: 'المسبحة', image: 'spiritual.jpg', route: '/prayer', color: '#8C5948' },
  { key: 'kitchen', label: 'المطبخ', image: 'family.jpg', route: '/fasting', color: '#55706B' },
  { key: 'learn', label: 'السنكسار والقاموس', image: 'patristics.jpg', route: '/learn', color: '#6C7C96' },
  { key: 'pastoral', label: 'أعياد الأسماء', image: 'saints.jpg', route: '/pastoral', color: '#8C5948' },
  { key: 'places', label: 'أماكن أرثوذكسية قريبة', image: 'spiritual.jpg', route: '/places', color: '#B47732' },
] as const;

const imagePath = (name: string) => `/__mockup/images/orthotypikon-explore/${name}`;

export function Current() {
  return (
    <section className="orthotypikon-explore" lang="ar" dir="rtl" aria-label="استكشف">
      <header className="ot-explore-heading">
        <h2 className="ot-explore-title">استكشف</h2>
        <span className="ot-explore-all" data-route="/library">الكل</span>
      </header>
      <div className="ot-explore-rail" aria-label="أقسام الاستكشاف">
        {exploreItems.map((item) => (
          <article className="ot-explore-current-card" key={item.key} data-route={item.route}>
            <div className="ot-explore-current-artwork" style={{ backgroundColor: item.color }}>
              <img src={imagePath(item.image)} alt="" />
            </div>
            <span className="ot-explore-current-label">{item.label}</span>
            <span className="ot-explore-current-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M15 18 9 12l6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}