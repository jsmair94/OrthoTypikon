import { Heart } from "lucide-react";
import "./_group.css";

export function Current() {
  return (
    <main className="prayer-intro-stage" dir="rtl">
      <section className="prayer-intro-current" aria-label="بطاقة الصلاة الحالية">
        <div className="prayer-intro-current-icon" aria-hidden="true">
          <Heart size={22} strokeWidth={1.8} />
        </div>
        <div className="prayer-intro-copy">
          <h2 className="prayer-intro-title">صلِّ بهدوء وحضور</h2>
          <p className="prayer-intro-subtitle">
            يا ربي يسوع المسيح، ارحمني أنا عبدك الخاطئ
          </p>
        </div>
      </section>
    </main>
  );
}
