import { Heart, Sparkles } from "lucide-react";
import "./hearthlight.css";

export function Hearthlight() {
  return (
    <main className="hearthlight-stage" dir="rtl">
      <article className="hearthlight-card" aria-label="بطاقة الصلاة المقترحة">
        <div className="hearthlight-topline">
          <span className="hearthlight-kicker">وقفة صلاة</span>
          <span className="hearthlight-mark" aria-hidden="true">
            <Sparkles size={13} strokeWidth={1.5} />
          </span>
        </div>

        <div className="hearthlight-copy">
          <h2 className="hearthlight-title">صلِّ بهدوء وحضور</h2>
          <span className="hearthlight-rule" aria-hidden="true">
            <i />
            <Heart size={12} strokeWidth={1.5} />
            <i />
          </span>
          <p className="hearthlight-subtitle">
            يا ربي يسوع المسيح، ارحمني أنا عبدك الخاطئ
          </p>
        </div>

        <div className="hearthlight-bottom">
          <span className="hearthlight-dot" aria-hidden="true" />
          <span>على مهلٍ، من القلب</span>
          <span className="hearthlight-dot" aria-hidden="true" />
        </div>
        <span className="hearthlight-corner hearthlight-corner-one" aria-hidden="true" />
        <span className="hearthlight-corner hearthlight-corner-two" aria-hidden="true" />
      </article>
    </main>
  );
}
