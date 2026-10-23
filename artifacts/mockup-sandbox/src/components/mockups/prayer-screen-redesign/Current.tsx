import { ArrowRight, Headphones, MessageCircle, Pause, Play, Plus, Sun } from "lucide-react";
import { useState } from "react";
import "./_group.css";

const total = 33;

export function Current() {
  const [count, setCount] = useState(29);
  const [playing, setPlaying] = useState(false);

  return (
    <main className="prayer-screen-preview current-screen" dir="rtl">
      <header className="current-header">
        <button className="current-back" aria-label="رجوع"><ArrowRight size={19} /></button>
        <div>
          <span>أداة الصلاة اليومية</span>
          <h1>مسبحة الصلاة</h1>
        </div>
      </header>

      <section className="current-intro" aria-label="وقفة صلاة">
        <div className="current-intro-top"><span>وقفة صلاة</span><Sun size={15} /></div>
        <div className="current-intro-copy">
          <h2>صلِّ بهدوء وحضور</h2>
          <p>يا ربي يسوع المسيح، ارحمني أنا عبدك الخاطئ</p>
        </div>
        <span className="current-intro-footer">•　على مهلٍ، من القلب　•</span>
      </section>

      <section className="current-card current-audio">
        <div className="current-audio-head">
          <div className="current-audio-copy">
            <h2>صلاة يسوع</h2>
            <p>يمكنك تشغيل الصلاة أو إيقافها في أي وقت أثناء المسبحة</p>
          </div>
          <span className="current-audio-icon"><Headphones size={20} /></span>
        </div>
        <div className="current-audio-controls">
          <button onClick={() => setPlaying(!playing)}><span>{playing ? "إيقاف الصلاة" : "تشغيل الصلاة"}</span>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
          <time>0:00 / 7:51</time>
        </div>
        <div className="current-track"><span /></div>
      </section>

      <section className="current-card current-counter">
        <span className="current-muted">العقد المنجزة</span>
        <strong>{count}</strong>
        <span className="current-muted">من {total}</span>
        <div className="current-track"><span style={{ width: `${(count / total) * 100}%` }} /></div>
      </section>

      <button className="current-pray" onClick={() => setCount(count >= total ? 1 : count + 1)}>
        <span>صلِّ العقدة التالية</span><Plus size={21} />
      </button>

      <section className="current-card current-prayer">
        <MessageCircle size={18} />
        <p>«يا ربي يسوع المسيح، ارحمني أنا عبدك الخاطئ»</p>
        <span>صوت خفيف واهتزاز لمسي عند كل عقدة</span>
      </section>
      <button className="current-reset" onClick={() => setCount(0)}>إعادة العداد</button>
    </main>
  );
}
