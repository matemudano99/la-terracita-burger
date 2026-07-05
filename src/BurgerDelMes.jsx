import { sx } from "./sx";
import { BURGER_DEL_MES as B } from "./mesData";

export default function BurgerDelMes() {
  return (
    <section id="del-mes" style={sx("position:relative;z-index:2;min-height:100svh;display:flex;align-items:center;padding:132px 5vw 72px;max-width:1200px;margin:0 auto")}>
      <div className="ltb-2col" style={sx("display:grid;grid-template-columns:1fr 1fr;gap:52px;align-items:center;width:100%;animation:ltb-rise .7s both")}>
        {/* Photo with neon frame + inset */}
        <div style={sx("position:relative")}>
          <div className="ltb-neon-box" style={sx("position:relative;border-radius:22px;overflow:hidden;aspect-ratio:4/5")}>
            <img src={B.img} alt={`Hamburguesa del mes: ${B.name}`} style={sx("display:block;width:100%;height:100%;object-fit:cover")} />
          </div>
          <div style={sx("position:absolute;right:-14px;bottom:-14px;width:40%;aspect-ratio:1/1;border-radius:16px;overflow:hidden;border:3px solid #0a0806;box-shadow:0 14px 34px rgba(0,0,0,.55)")}>
            <img src={B.img2} alt="" style={sx("display:block;width:100%;height:100%;object-fit:cover")} />
          </div>
          <span style={sx("position:absolute;top:-16px;left:-10px;display:grid;place-items:center;width:92px;height:92px;border-radius:50%;background:rgb(var(--emb));color:#0a0806;font-family:'Anton',sans-serif;font-size:14px;text-align:center;line-height:1.05;text-transform:uppercase;transform:rotate(-10deg);animation:ltb-float 6s ease-in-out infinite")}>Del mes</span>
        </div>

        {/* Info */}
        <div>
          <div style={sx("display:inline-flex;align-items:center;gap:9px;font-size:12px;letter-spacing:.26em;text-transform:uppercase;color:var(--acc-lt);margin-bottom:14px")}>
            <span style={sx("width:7px;height:7px;border-radius:50%;background:rgb(var(--acc));animation:ltb-pulse 1.6s infinite")} />
            Hamburguesa del mes
          </div>
          <h2 className="ltb-neon-text" style={sx("margin:0;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(46px,8vw,104px);line-height:.88;text-transform:uppercase;color:rgb(var(--acc))")}>{B.name}</h2>
          {B.tag && (
            <span style={sx("display:inline-block;margin-top:14px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;padding:6px 12px;border-radius:100px;background:rgb(var(--emb) / .16);color:rgb(var(--emb));border:1px solid rgb(var(--emb) / .4)")}>{B.tag}</span>
          )}
          <p style={sx("margin:20px 0 0;font-size:16.5px;line-height:1.55;color:rgba(246,241,233,.82)")}>{B.hook}</p>
          <div style={sx("display:grid;grid-template-columns:1fr 1fr;gap:11px 22px;margin:24px 0 0")}>
            {B.ingredients.map((it, i) => (
              <div key={i} style={sx("display:flex;align-items:center;gap:10px;font-size:14.5px;color:rgba(246,241,233,.85)")}>
                <span style={sx("font-size:18px;line-height:1")}>{it.icon}</span>{it.text}
              </div>
            ))}
          </div>
          <p style={sx("margin:24px 0 0;font-size:14.5px;line-height:1.5;color:rgba(246,241,233,.6)")}>{B.closing}</p>
          <div style={sx("display:flex;flex-wrap:wrap;gap:14px;margin-top:30px;align-items:center")}>
            <a href="#pedidos" style={sx("font-family:'Anton',sans-serif;font-size:17px;letter-spacing:.05em;padding:15px 32px;border-radius:100px;background:rgb(var(--acc));color:#0a0806;text-decoration:none;box-shadow:0 12px 36px -10px rgb(var(--acc) / .7)")}>PEDIR AHORA</a>
            <a href="#carta" style={sx("font-family:'Anton',sans-serif;font-size:17px;letter-spacing:.05em;padding:15px 32px;border-radius:100px;background:transparent;color:#f6f1e9;text-decoration:none;border:2px solid rgba(246,241,233,.25)")}>VER LA CARTA</a>
            {B.price && <span style={sx("font-family:'Anton',sans-serif;font-size:26px;color:rgb(var(--acc))")}>{B.price}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
