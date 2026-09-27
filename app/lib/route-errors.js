const DEFAULT_ERROR = "No fue posible consultar la ruta.";

export function routeErrorMessage(value, fallback = DEFAULT_ERROR) {
  if (typeof value === "string") return value.trim() || fallback;
  if (Array.isArray(value)) {
    const messages = value.map((item) => routeErrorMessage(item, "")).filter(Boolean);
    return messages.length ? messages.join(" · ") : fallback;
  }
  if (value && typeof value === "object") {
    for (const key of ["msg", "message", "error", "detail"]) {
      const message = routeErrorMessage(value[key], "");
      if (message) return message;
    }
  }
  return fallback;
}
