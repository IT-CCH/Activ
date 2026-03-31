/**
 * Lightweight HTML sanitizer that only allows safe formatting tags.
 * Used for rendering rich text editor content (benefits field etc.)
 */
const ALLOWED_TAGS = new Set([
  'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'br', 'p', 'span'
]);

export default function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  // Replace any tag not in the allowlist with its text content
  return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/gi, (match, tag) => {
    if (ALLOWED_TAGS.has(tag.toLowerCase())) return match.replace(/ on\w+="[^"]*"/gi, '').replace(/ on\w+='[^']*'/gi, '');
    return '';
  });
}
