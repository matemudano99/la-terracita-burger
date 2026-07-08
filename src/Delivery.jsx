import { useState } from "react";
import { sx } from "./sx";

const LOCS = {
  teatinos: {
    name: "Teatinos",
    address: "Av. Parménides 1, Local 5 · Málaga",
    tel: "628053065",
    phone: "628 053 065",
    rating: "4,8",
    reviews: "567",
    days: "Todos los días excepto martes",
    schedule: "13:00–16:00 · 20:00–23:30",
    rgb: "255 197 49",
    justeat: "https://www.just-eat.es/restaurants-la-terracita-teatinos-malaga/menu?serviceType=collection&utm_source=google&utm_medium=organic&utm_campaign=foodorder",
    glovo: "https://glovoapp.com/es/es/malaga/stores/beher-teatinos-malaga?utm_medium=organic&utm_campaign=google_reserve_place_order_action&utm_source=google",
    ubereats: "https://www.ubereats.com/es/store/la-terracita-burger/KTBmYDR0XIefR_aNDkvgqg?diningMode=PICKUP&utm_campaign=CM2508147-search-free-nonbrand-google-pas_e_all_acq_Global&utm_medium=search-free-nonbrand&utm_source=google-pas",
  },
  rincon: {
    name: "Rincón de la Victoria",
    address: "Av. del Mediterráneo 139 · 29730",
    tel: "622220826",
    phone: "622 220 826",
    rating: "4,7",
    reviews: "807",
    days: "Todos los días",
    schedule: "13:00–16:00 · 20:00–23:30",
    rgb: "255 92 40",
    justeat: "https://www.just-eat.es/restaurants-la-terracita-rincon-de-la-victoria/menu?serviceType=collection&utm_source=google&utm_medium=organic&utm_campaign=foodorder",
    glovo: "https://glovoapp.com/es/es/rincon-de-la-victoria/stores/la-terracita-rincon-de-la-victoria?utm_medium=organic&utm_campaign=google_reserve_place_order_action&utm_source=google",
    ubereats: "https://www.ubereats.com/es/store/la-terracita-burger/Scz720n_WMedBmpzqbI-4A?diningMode=PICKUP&utm_campaign=CM2508147-search-free-nonbrand-google-pas_e_all_acq_Global&utm_medium=search-free-nonbrand&utm_source=google-pas",
  },
};

const PLATFORMS = [
  { key: "justeat", name: "Just Eat", brand: "#ff8000", cls: "ltb-deliv--je" },
  { key: "glovo", name: "Glovo", brand: "#ffc244", cls: "ltb-deliv--gl" },
  { key: "ubereats", name: "Uber Eats", brand: "#06c167", cls: "ltb-deliv--ue" },
];

export default function Delivery() {
  const [loc, setLoc] = useState("teatinos");
  const L = LOCS[loc];

  return (
    <section id="pedidos" style={sx("position:relative;z-index:2;padding:70px 5vw 90px;max-width:1200px;margin:0 auto")}>
      <div data-reveal="" style={sx("opacity:0;transform:translateY(46px);transition:opacity .7s,transform .7s;text-align:center;margin-bottom:8px")}>
        <div style={sx("font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:var(--acc-lt);margin-bottom:12px")}>04 — A domicilio</div>
        <h2 style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(40px,7vw,92px);line-height:.9;text-transform:uppercase")}>Pídela en <span style={sx("color:rgb(var(--acc));text-shadow:0 0 30px rgb(var(--acc) / .5)")}>casa</span></h2>
        <p style={sx("max-width:520px;margin:18px auto 0;font-size:15.5px;line-height:1.55;color:rgba(246,241,233,.62)")}>Elige tu local y pide por tu app favorita. Mismo smash, en tu sofá.</p>
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
          <span style={{ ...sx("width:8px;height:8px;border-radius:50%;animation:ltb-pulse 1.6s infinite"), background: `rgb(${L.rgb})` }} /> Pidiendo en
        </div>

        <h3 style={{ ...sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(34px,6vw,64px);line-height:.92;text-transform:uppercase;position:relative"), color: `rgb(${L.rgb})` }}>{L.name}</h3>

        <div style={sx("display:flex;flex-wrap:wrap;align-items:center;gap:12px 28px;margin:18px 0 32px;font-size:14px;color:rgba(246,241,233,.72);position:relative")}>
          <span>📍 {L.address}</span>
          <span>🕒 {L.days} · {L.schedule}</span>
          <span style={sx("display:inline-flex;align-items:center;gap:7px")}>
            <span style={sx("display:inline-flex;gap:1px")}>
              {[0, 1, 2, 3, 4].map((s) => (
                <span key={s} style={{ ...sx("font-size:14px"), color: `rgb(${L.rgb})`, animation: "ltb-pop .4s both", animationDelay: `${s * 0.06}s` }}>★</span>
              ))}
            </span>
            <strong style={sx("color:#f6f1e9")}>{L.rating}</strong>
            <span style={sx("color:rgba(246,241,233,.5)")}>({L.reviews} reseñas · Google)</span>
          </span>
        </div>

        <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:14px;position:relative")}>
          {PLATFORMS.map((p, idx) => (
            <a
              key={p.key}
              href={L[p.key]}
              target="_blank"
              rel="noreferrer"
              className={`ltb-deliv ${p.cls}`}
              style={{
                ...sx("display:flex;align-items:center;gap:16px;padding:20px;border-radius:16px;background:#100c08;border:1px solid rgba(246,241,233,.12);text-decoration:none;color:#f6f1e9;transition:transform .3s cubic-bezier(.2,.8,.2,1),box-shadow .3s,border-color .3s;animation:ltb-rise .5s both"),
                ["--brand"]: p.brand,
                animationDelay: `${idx * 0.08}s`,
              }}
            >
              <span style={{ ...sx("flex:none;display:grid;place-items:center;width:50px;height:50px;border-radius:14px;font-family:'Anton',sans-serif;font-size:24px;line-height:1"), background: p.brand, color: "#0a0806" }}>{p.name[0]}</span>
              <span style={sx("display:flex;flex-direction:column;gap:1px")}>
                <span style={{ ...sx("font-weight:700;font-size:17px;letter-spacing:.01em"), color: p.brand }}>{p.name}</span>
                <span style={sx("font-size:12.5px;color:rgba(246,241,233,.55)")}>Pedir ahora →</span>
                {p.key === "ubereats" && <span className="ltb-underline" style={{ background: p.brand }} />}
              </span>
              {p.key === "glovo" && <span className="ltb-scooter">🛵</span>}
            </a>
          ))}
        </div>

        <p style={sx("margin:24px 0 0;font-size:13px;color:rgba(246,241,233,.5);position:relative")}>
          ¿Prefieres recoger? Llámanos al{" "}
          <a href={`tel:${L.tel}`} style={{ ...sx("text-decoration:none;font-weight:700"), color: `rgb(${L.rgb})` }}>{L.phone}</a>.
        </p>
      </div>
    </section>
  );
}
