import { sx } from "./sx";
import { IDIOMAS, useI18n } from "./i18n";

// ─────────────────────────────────────────────────────────────────────────────
// Selector de idioma ES / EN. Control segmentado, bien visible y táctil.
// `size`: "md" (por defecto) o "sm" (para barras compactas).
// ─────────────────────────────────────────────────────────────────────────────
export default function LangSwitcher({ size = "md", style }) {
  const { idioma, setIdioma } = useI18n();
  const sm = size === "sm";

  return (
    <div
      role="group"
      aria-label="Idioma / Language"
      style={{
        ...sx(`display:inline-flex;align-items:center;gap:3px;padding:3px;border-radius:100px;background:rgba(246,241,233,.08);border:1px solid rgba(246,241,233,.18)`),
        ...style,
      }}
    >
      {IDIOMAS.map((l) => {
        const on = idioma === l.id;
        return (
          <button
            key={l.id}
            onClick={() => setIdioma(l.id)}
            aria-pressed={on}
            aria-label={l.nombre}
            title={l.nombre}
            style={sx(
              `display:inline-flex;align-items:center;gap:5px;font-family:'Anton',sans-serif;letter-spacing:.06em;` +
                `font-size:${sm ? 12 : 13.5}px;padding:${sm ? "6px 11px" : "8px 15px"};border-radius:100px;` +
                `border:0;cursor:pointer;transition:all .2s;` +
                `background:${on ? "rgb(var(--acc))" : "transparent"};color:${on ? "#0a0806" : "rgba(246,241,233,.75)"}`
            )}
          >
            <span aria-hidden="true" style={sx(`font-size:${sm ? 12 : 14}px;line-height:1`)}>{l.flag}</span>
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
