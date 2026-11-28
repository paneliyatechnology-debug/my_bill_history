/**
 * Escapes HTML special characters to prevent XSS / HTML injection when
 * constructing printable HTML strings for document.write() or popups.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Validates that an image URL uses a safe scheme (http, https, data:image/*, or relative /).
 * Returns empty string for unsafe schemes like javascript: or data:text/html.
 */
export function sanitizeImageUrl(url: unknown): string {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (
    /^https?:\/\//i.test(trimmed) ||
    /^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml);base64,/i.test(trimmed) ||
    (trimmed.startsWith("/") && !trimmed.startsWith("//"))
  ) {
    return escapeHtml(trimmed);
  }
  return "";
}
