// Convert a CSS declaration string into a React style object, preserving exact
// design values (colors, clamp(), gradients, animations).
export const sx = (css) =>
  Object.fromEntries(
    css
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((rule) => {
        const i = rule.indexOf(":");
        const key = rule
          .slice(0, i)
          .trim()
          .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        return [key, rule.slice(i + 1).trim()];
      })
  );
