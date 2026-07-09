// Marca "LTB" como texto en Anton (la misma fuente del badge original).
// Sustituye a logo-ltb-white.png, cuyo origen de 256px salía borroso al reescalar.
export default function LtbMark({ size = 20, label, style }) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        display: "block",
        fontFamily: "'Anton', sans-serif",
        fontWeight: 400,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "0.02em",
        userSelect: "none",
        ...style,
      }}
    >
      LTB
    </span>
  );
}
