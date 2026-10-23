import { ArrowRight, Headphones, Pause, Play, Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import "./_group.css";
import "./redesign.css";

const totalBeads = 33;
const duration = 7 * 60 + 51;

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function Redesign() {
  const [count, setCount] = useState(29);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setElapsed((current) => Math.min(duration, current + 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (elapsed >= duration) setPlaying(false);
  }, [elapsed]);

  const progress = (elapsed / duration) * 100;

  return (
    <main className="prayer-hearthlight" dir="rtl">
      <div className="prayer-screen-content">
        <header className="prayer-screen-header">
          <button className="prayer-back" aria-label="رجوع" onClick={() => window.history.back()}>
            <ArrowRight size={18} strokeWidth={1.7} />
          </button>
          <div className="prayer-heading">
            <span>أداة الصلاة اليومية</span>
            <h1>مسبحة الصلاة</h1>
          </div>
          <span className="header-seal" aria-hidden="true"><Sparkles size={15} strokeWidth={1.5} /></span>
        </header>

        <section className="hearthlight-prayer-card" aria-label="وقفة صلاة">
          <div className="hearthlight-card-top">
            <span className="prayer-kicker">وقفة صلاة</span>
            <span className="prayer-sparkle" aria-hidden="true"><Sparkles size={13} strokeWidth={1.5} /></span>
          </div>
          <div className="hearthlight-card-copy">
            <h2>صلِّ بهدوء وحضور</h2>
            <span className="hearthlight-divider" aria-hidden="true"><i /><b /><i /></span>
            <p>يا ربي يسوع المسيح، ارحمني أنا عبدك الخاطئ</p>
          </div>
          <div className="hearthlight-card-footer">
            <span className="tiny-dot" aria-hidden="true" />
            <span>على مهلٍ، من القلب</span>
            <span className="tiny-dot" aria-hidden="true" />
          </div>
          <span className="card-corner card-corner-top" aria-hidden="true" />
          <span className="card-corner card-corner-bottom" aria-hidden="true" />
        </section>

        <section className="prayer-audio-panel" aria-label="صلاة يسوع">
          <div className="audio-panel-heading">
            <span className="audio-mark" aria-hidden="true"><Headphones size={18} strokeWidth={1.6} /></span>
            <div className="audio-copy">
              <h2>صلاة يسوع</h2>
              <p>يمكنك تشغيل الصلاة أو إيقافها في أي وقت أثناء المسبحة</p>
            </div>
          </div>
          <div className="audio-controls">
            <button className="audio-toggle" onClick={() => setPlaying((current) => !current)}>
              <span>{playing ? "إيقاف الصلاة" : "تشغيل الصلاة"}</span>
              {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            </button>
            <time className="audio-time" aria-live="off">{formatTime(elapsed)} / 7:51</time>
          </div>
          <div
            className="audio-track"
            role="progressbar"
            aria-label="تقدم الصلاة الصوتية"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={elapsed}
          >
            <span className="audio-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </section>

        <section className="bead-progress-panel" aria-label="العقد المنجزة">
          <div className="bead-progress-copy">
            <span className="progress-label">العقد المنجزة</span>
            <div className="progress-number"><strong>{count}</strong><span>من {totalBeads}</span></div>
          </div>
          <svg className="bead-wheel" viewBox="0 0 112 112" role="img" aria-label={`${count} من ${totalBeads} عقدة`}>
            <circle className="wheel-guide" cx="56" cy="56" r="43" />
            {Array.from({ length: totalBeads }, (_, index) => {
              const angle = (index / totalBeads) * Math.PI * 2 - Math.PI / 2;
              const x = 56 + Math.cos(angle) * 43;
              const y = 56 + Math.sin(angle) * 43;
              return (
                <circle
                  key={index}
                  className={index < count ? "wheel-bead wheel-bead-done" : "wheel-bead"}
                  cx={x}
                  cy={y}
                  r={index < count ? 2.25 : 1.8}
                />
              );
            })}
            <circle className="wheel-center" cx="56" cy="56" r="31" />
            <path className="wheel-center-mark" d="M56 43v26M49.5 49.5h13" />
          </svg>
        </section>

        <button className="next-bead-button" onClick={() => setCount((current) => current >= totalBeads ? 1 : current + 1)}>
          <span>صلِّ العقدة التالية</span>
          <span className="next-bead-icon" aria-hidden="true"><Plus size={18} strokeWidth={1.8} /></span>
        </button>

        <section className="prayer-words-panel">
          <span className="prayer-quote-mark" aria-hidden="true">”</span>
          <p>«يا ربي يسوع المسيح، ارحمني أنا عبدك الخاطئ»</p>
          <span className="prayer-hint">صوت خفيف واهتزاز لمسي عند كل عقدة</span>
        </section>

        <button className="reset-prayer" onClick={() => setCount(0)}>إعادة العداد</button>
      </div>
    </main>
  );
}
