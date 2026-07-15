import { useState } from "react";
import { sx } from "./sx";
import LtbMark from "./LtbMark";
import { login } from "./authClient";

// Tarjeta de inicio de sesión del equipo (usada por /cocina y /admin).
export default function LoginBox({ titulo, subtitulo, onOk }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const entrar = async () => {
    if (!usuario || !password || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      onOk(await login(usuario.trim(), password));
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  };

  const input = sx("width:100%;padding:14px 16px;border-radius:12px;border:1px solid rgba(246,241,233,.2);background:#0a0806;color:#f6f1e9;font-size:16px;margin-bottom:12px;outline:none;font-family:inherit");

  return (
    <div style={sx("min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px")}>
      <div style={sx("width:min(420px,100%);border:1px solid rgba(246,241,233,.14);border-radius:20px;background:#0d0a07;padding:32px;text-align:center;animation:ltb-rise .5s both")}>
        <LtbMark size={30} style={{ color: "#f6f1e9" }} />
        <h1 style={sx("margin:14px 0 4px;font-family:'Anton',sans-serif;font-weight:400;font-size:28px;text-transform:uppercase")}>{titulo}</h1>
        <p style={sx("margin:0 0 22px;font-size:13.5px;color:rgba(246,241,233,.6)")}>{subtitulo}</p>
        <input
          type="email"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          placeholder="Email"
          autoComplete="username"
          style={input}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && entrar()}
          placeholder="Contraseña"
          autoComplete="current-password"
          style={input}
        />
        {error && <p role="alert" style={sx("margin:2px 0 14px;font-size:13px;color:rgb(255,120,90)")}>⚠️ {error}</p>}
        <button
          onClick={entrar}
          disabled={!usuario || !password || enviando}
          style={sx(`width:100%;font-family:'Anton',sans-serif;font-size:15px;letter-spacing:.04em;padding:14px 18px;border-radius:12px;border:0;cursor:pointer;background:rgb(var(--acc));color:#0a0806;opacity:${!usuario || !password || enviando ? 0.45 : 1}`)}
        >
          {enviando ? "ENTRANDO…" : "ENTRAR"}
        </button>
        <p style={sx("margin:16px 0 0;font-size:11.5px;color:rgba(246,241,233,.4)")}>Solo para el equipo de La Terracita.</p>
      </div>
    </div>
  );
}
