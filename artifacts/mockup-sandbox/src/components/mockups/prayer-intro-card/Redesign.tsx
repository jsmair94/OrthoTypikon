import { Heart } from "lucide-react";
import "./_group.css";

export function Redesign() {
  return (
    <main className="prayer-intro-stage" dir="rtl">
      <section className="prayer-intro-redesign" aria-label="بطاقة الصلاة المقترحة">
        <div className="prayer-intro-copy">
          <h2 className="prayer-intro-title">صلِّ بهدوء وحضور</h2>
          <div className="prayer-intro-accent" aria-hidden="true" />
          <p className="prayer-intro-subtitle">
            يا ربي يسوع المسيح، ارحمني أنا عبدك الخاطئ
          </p>
        </div>
        <div className="prayer-intro-emblem" aria-hidden="true">
          <Heart size={23} strokeWidth={1.8} />
        </div>
      </section>
    </main>
  );
}
