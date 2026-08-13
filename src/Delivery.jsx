import { useState } from "react";
import { sx } from "./sx";
import { useI18n } from "./i18n";
import { LOCALES, HORARIO_TEXTO, repartoResumen } from "./locales";
import { fmtEUR } from "./menu";

// Datos de escaparate de cada local; lo compartido (dirección, teléfono,
// horarios, enlaces a las apps) sale de locales.js para no duplicarlo.
const LOCS = {
  teatinos: { ...LOCALES.teatinos, days: "deliv.dias.teatinos", rating: "4,8", reviews: "567" },
  rincon: { ...LOCALES.rincon, days: "deliv.dias.todos", rating: "4,7", reviews: "807" },
};

// ¿Algún local reparte por su cuenta? Cambia el claim de la sección.
const HAY_REPARTO = Object.values(LOCALES).some((l) => l.delivery?.activo);

const PLATFORMS = [
  { key: "justeat", name: "Just Eat", brand: "#ff8000", cls: "ltb-deliv--je" },
  { key: "glovo", name: "Glovo", brand: "#ffc244", cls: "ltb-deliv--gl" },
  { key: "ubereats", name: "Uber Eats", brand: "#06c167", cls: "ltb-deliv--ue" },
];

export default function Delivery() {
  const { t, idioma } = useI18n();
  const [loc, setLoc] = useState("teatinos");
  const L = LOCS[loc];
  // Reparto propio del local (solo Rincón por ahora) — la config vive en locales.js.
  const reparto = LOCALES[loc]?.delivery?.activo ? LOCALES[loc].delivery : null;

  return (
    <section id="pedidos" className="ltb-cv" style={sx("position:relative;z-index:2;padding:70px 5vw 90px;max-width:1200px;margin:0 auto")}>
      <div data-reveal="" style={sx("opacity:0;transform:translateY(46px);transition:opacity .7s,transform .7s;text-align:center;margin-bottom:8px")}>
        <div style={sx("font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:var(--acc-lt);margin-bottom:12px")}>{t("deliv.kicker")}</div>
        <h2 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(40px,7vw,92px);line-height:.9;text-transform:uppercase")}>{t("deliv.h2a")} <span className="ltb-flicker-text" style={sx("color:rgb(var(--acc));text-shadow:0 0 30px rgb(var(--acc) / .5)")}>{t("deliv.h2b")}</span></h2>
        <p style={sx("max-width:520px;margin:18px auto 0;font-size:15.5px;line-height:1.55;color:rgba(246,241,233,.62)")}>{t(HAY_REPARTO ? "deliv.claimReparto" : "deliv.claim")}</p>
      </div>

      {/* Location selector — big, obvious difference */}
      <div style={sx("display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin:38px 0 0")}>
        {Object.keys(LOCS).map((id) => {
          const active = id === loc;
          const o = LOCS[id];
          return (
            <button
              key={id}
              onClick={() => setLoc(id)}
              aria-pressed={active}
              style={{
                ...sx("font-family:'Anton',sans-serif;font-size:clamp(17px,2.3vw,23px);letter-spacing:.04em;text-transform:uppercase;padding:14px 32px;border-radius:100px;cursor:pointer;transition:all .3s cubic-bezier(.2,.8,.2,1)"),
                border: active ? "2px solid transparent" : "2px solid rgba(246,241,233,.2)",
                background: active ? `rgb(${o.rgb})` : "transparent",
                color: active ? "#0a0806" : "#f6f1e9",
                boxShadow: active ? `0 12px 36px -10px rgb(${o.rgb} / .8)` : "none",
                transform: active ? "translateY(-2px)" : "none",
              }}
            >
              {o.name}
            </button>
          );
        })}
      </div>

      {/* Panel — remounts on switch to re-animate; accent recolors per location */}
      <div
        key={loc}
        style={{
          ...sx("position:relative;overflow:hidden;margin-top:26px;border-radius:24px;border:1px solid rgba(246,241,233,.12);background:#0d0a07;padding:clamp(26px,4vw,46px);animation:ltb-rise .5s both"),
        }}
      >
        <div style={{ ...sx("position:absolute;top:0;left:0;right:0;height:4px"), background: `rgb(${L.rgb})` }} />
        <div style={{ ...sx("position:absolute;top:-45%;right:-12%;width:64%;height:180%;pointer-events:none;filter:blur(24px)"), background: `radial-gradient(circle, rgb(${L.rgb} / .18), transparent 62%)` }} />

        <div style={{ ...sx("display:inline-flex;align-items:center;gap:9px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;padding:7px 14px;border-radius:100px;margin-bottom:16px;position:relative"), color: `rgb(${L.rgb})`, border: `1px solid rgb(${L.rgb} / .5)` }}>
          <span style={{ ...sx("width:8px;height:8px;border-radius:50%;animation:ltb-pulse 1.6s infinite"), background: `rgb(${L.rgb})` }} /> {t("deliv.pidiendoEn")}
        </div>

        <h3 style={{ ...sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(34px,6vw,64px);line-height:.92;text-transform:uppercase;position:relative"), color: `rgb(${L.rgb})` }}>{L.name}</h3>

        <div style={sx("display:flex;flex-wrap:wrap;align-items:center;gap:12px 28px;margin:18px 0 32px;font-size:14px;color:rgba(246,241,233,.72);position:relative")}>
          <span>📍 {L.address}</span>
          <span>🕒 {t(L.days)} · {HORARIO_TEXTO}</span>
          {reparto && <span style={{ color: `rgb(${L.rgb})` }}>🛵 {repartoResumen(idioma)}</span>}
          <span style={sx("display:inline-flex;align-items:center;gap:7px")}>
            <span style={sx("display:inline-flex;gap:1px")}>
              {[0, 1, 2, 3, 4].map((s) => (
                <span key={s} style={{ ...sx("font-size:14px"), color: `rgb(${L.rgb})`, animation: "ltb-pop .4s both", animationDelay: `${s * 0.06}s` }}>★</span>
              ))}
            </span>
            <strong style={sx("color:#f6f1e9")}>{L.rating}</strong>
            <span style={sx("color:rgba(246,241,233,.64)")}>{t("deliv.resenas", { n: L.reviews })}</span>
          </span>
        </div>

        {/* Pedir online — opción destacada: sin comisiones, directo a cocina */}
        <a
          href="/pedir"
          className="ltb-deliv ltb-deliv--tel"
          style={{
            ...sx("display:flex;flex-wrap:wrap;align-items:center;gap:16px 20px;margin-bottom:14px;padding:22px 24px;border-radius:16px;border:1px solid rgba(246,241,233,.12);text-decoration:none;color:#0a0806;transition:transform .3s cubic-bezier(.2,.8,.2,1),box-shadow .3s,border-color .3s;animation:ltb-rise .5s both;position:relative"),
            background: `rgb(${L.rgb})`,
            ["--brand"]: `rgb(${L.rgb})`,
          }}
        >
          <span style={sx("position:relative;flex:none;display:grid;place-items:center;width:56px;height:56px;border-radius:14px;font-size:26px;background:rgba(10,8,6,.14)")}>{reparto ? "🛵" : "🍔"}</span>
          <span style={sx("display:flex;flex-direction:column;gap:2px;flex:1;min-width:min(100%,220px)")}>
            <span style={sx("font-family:'Anton',sans-serif;font-size:20px;letter-spacing:.03em;text-transform:uppercase")}>
              {t(reparto ? "deliv.pedirOnlineTituloDom" : "deliv.pedirOnlineTitulo")}
            </span>
            <span style={sx("font-size:13px;color:rgba(10,8,6,.72);font-weight:600")}>
              {reparto
                ? t("deliv.pedirOnlineSubDom", { km: reparto.radioKm, envio: fmtEUR(reparto.gastosCents) })
                : t("deliv.pedirOnlineSub")}
            </span>
          </span>
          <span style={sx("font-family:'Anton',sans-serif;font-size:clamp(20px,3vw,26px);letter-spacing:.04em")}>PEDIR →</span>
        </a>

        {/* Llamar por teléfono */}
        <a
          href={`tel:${L.tel}`}
          className="ltb-deliv ltb-deliv--tel"
          style={{
            ...sx("display:flex;flex-wrap:wrap;align-items:center;gap:16px 20px;margin-bottom:14px;padding:22px 24px;border-radius:16px;background:#100c08;border:1px solid rgba(246,241,233,.12);text-decoration:none;color:#f6f1e9;transition:transform .3s cubic-bezier(.2,.8,.2,1),box-shadow .3s,border-color .3s;animation:ltb-rise .5s both;position:relative"),
            ["--brand"]: `rgb(${L.rgb})`,
          }}
        >
          <span className="ltb-tel-ico" style={{ ...sx("position:relative;flex:none;display:grid;place-items:center;width:56px;height:56px;border-radius:14px;font-size:26px"), background: `rgb(${L.rgb})` }}>📞</span>
          <span style={sx("display:flex;flex-direction:column;gap:2px;flex:1;min-width:min(100%,220px)")}>
            <span style={{ ...sx("font-family:'Anton',sans-serif;font-size:20px;letter-spacing:.03em;text-transform:uppercase"), color: `rgb(${L.rgb})` }}>{t("deliv.llamanos")}</span>
            <span style={sx("font-size:13px;color:rgba(246,241,233,.6)")}>{t("deliv.llamanosSub")}</span>
          </span>
          <span style={sx("font-family:'Anton',sans-serif;font-size:clamp(22px,3.5vw,30px);letter-spacing:.04em")}>{L.phone} →</span>
        </a>

        <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:14px;position:relative")}>
          {PLATFORMS.map((p, idx) => (
            <a
              key={p.key}
              href={L.apps[p.key]}
              target="_blank"
              rel="noreferrer"
              className={`ltb-deliv ${p.cls}`}
              style={{
                ...sx("display:flex;align-items:center;gap:16px;padding:20px;border-radius:16px;background:#100c08;border:1px solid rgba(246,241,233,.12);text-decoration:none;color:#f6f1e9;transition:transform .3s cubic-bezier(.2,.8,.2,1),box-shadow .3s,border-color .3s;animation:ltb-rise .5s both"),
                ["--brand"]: p.brand,
                animationDelay: `${(idx + 1) * 0.08}s`,
              }}
            >
              <span style={{ ...sx("flex:none;display:grid;place-items:center;width:50px;height:50px;border-radius:14px;font-family:'Anton',sans-serif;font-size:24px;line-height:1"), background: p.brand, color: "#0a0806" }}>{p.name[0]}</span>
              <span style={sx("display:flex;flex-direction:column;gap:1px")}>
                <span style={{ ...sx("font-weight:700;font-size:17px;letter-spacing:.01em"), color: p.brand }}>{p.name}</span>
                <span style={sx("font-size:12.5px;color:rgba(246,241,233,.55)")}>{t("deliv.pedirAhora")}</span>
                {p.key === "ubereats" && <span className="ltb-underline" style={{ background: p.brand }} />}
              </span>
              {p.key === "glovo" && <span className="ltb-scooter">🛵</span>}
            </a>
          ))}
        </div>

      </div>
    </section>
  );
}
