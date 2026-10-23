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

export function CompactCards() {
  return (
    <section className="orthotypikon-explore" lang="ar" dir="rtl" aria-label="استكشف">
      <header className="ot-explore-heading">
        <h2 className="ot-explore-title">استكشف</h2>
        <span className="ot-explore-all" data-route="/library">الكل</span>
      </header>
      <div className="ot-explore-rail ot-explore-compact-rail" aria-label="أقسام الاستكشاف">
        {Array.from({ length: Math.ceil(exploreItems.length / 2) }, (_, groupIndex) => (
          <div className="ot-explore-compact-stack" key={`stack-${groupIndex}`}>
            {exploreItems.slice(groupIndex * 2, groupIndex * 2 + 2).map((item) => (
              <article className="ot-explore-compact-card" key={item.key} data-route={item.route}>
                <div className="ot-explore-compact-artwork" style={{ backgroundColor: item.color }}>
                  <img src={imagePath(item.image)} alt="" />
                </div>
                <span className="ot-explore-compact-label">{item.label}</span>
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}