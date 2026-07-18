import { useState } from "react";
import { sx } from "../sx";
import LtbMark from "../LtbMark";
import { fmtEUR } from "../menu";

// ─────────────────────────────────────────────────────────────────────────────
// /pago-simulado — SOLO DESARROLLO. Finge ser la página de pago de MONEI para
// probar el flujo completo sin claves reales: dispara el mismo webhook que
// dispararía MONEI. En producción el backend rechaza la simulación (403).
// ─────────────────────────────────────────────────────────────────────────────
export default function PagoSimulado() {
  const params = new URLSearchParams(window.location.search);
  const p = params.get("p") || "";
  const total = Number(params.get("total")) || 0;
  const punto = p.lastIndexOf(".");
  const orderId = punto > 0 ? p.slice(0, punto) : p;
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const resolver = async (resultado) => {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/pago-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulada: true, orderId, resultado }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `Error ${res.status}`);
      window.location.href = `/pedir?p=${p}`;
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  };

  return (
    <div style={sx("min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px")}>
      <div style={sx("width:min(420px,100%);border:1px dashed rgba(246,241,233,.35);border-radius:20px;background:#0d0a07;padding:32px;text-align:center;animation:ltb-rise .4s both")}>
        <LtbMark size={28} style={{ color: "#f6f1e9" }} />
        <h1 style={sx("margin:14px 0 4px;font-family:'Anton',sans-serif;font-weight:400;font-size:24px;text-transform:uppercase")}>Pasarela simulada</h1>
        <p style={sx("margin:0 0 6px;font-size:13px;color:rgba(246,241,233,.6)")}>Solo existe en desarrollo — aquí estaría la página segura de MONEI.</p>
        {total > 0 && <p style={sx("margin:0 0 22px;font-family:'Anton',sans-serif;font-size:30px;color:rgb(var(--acc))")}>{fmtEUR(total)}</p>}
        {error && <p role="alert" style={sx("margin:0 0 14px;font-size:13px;color:rgb(255,120,90)")}>⚠️ {error}</p>}
        <div style={sx("display:flex;flex-direction:column;gap:10px")}>
          <button onClick={() => resolver("ok")} disabled={enviando} style={sx("font-family:'Anton',sans-serif;font-size:15px;letter-spacing:.04em;padding:15px 18px;border-radius:100px;border:0;cursor:pointer;background:rgb(120,220,130);color:#0a0806")}>
            ✅ SIMULAR PAGO CORRECTO
          </button>
          <button onClick={() => resolver("ko")} disabled={enviando} style={sx("font-size:13px;font-weight:700;padding:13px 18px;border-radius:100px;border:1px solid rgba(255,100,80,.5);background:transparent;color:rgb(255,120,90);cursor:pointer")}>
            ❌ Simular pago cancelado
          </button>
        </div>
      </div>
    </div>
  );
}
