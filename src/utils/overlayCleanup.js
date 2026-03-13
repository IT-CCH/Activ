export function cleanupOverlays() {
  try {
    // Find potential overlay/backdrop elements but do NOT remove them directly.
    // Removing nodes while React still manages them can cause "removeChild" errors
    // (React may try to remove the same node later). Instead, hide them and mark
    // them as cleaned so they won't be visible and won't cause layout issues.
    const candidates = Array.from(document.querySelectorAll('.fixed.inset-0'));
    candidates.forEach((el) => {
      // Skip elements that are flagged as persistent (e.g. TV Display full-screen pages)
      if (el.hasAttribute('data-persist')) return;
      // Only affect elements that look like backdrops/overlays (contain bg- or backdrop class)
      if (/bg-|backdrop|bg-background/.test(el.className)) {
        try {
          // Hide non-destructively and mark as cleaned so future cleanups are no-ops
          el.style.display = 'none';
          el.setAttribute('data-overlay-cleaned', 'true');
        } catch (innerErr) {
          // swallowing errors here - best-effort cleanup
          // eslint-disable-next-line no-console
          console.warn('Failed to hide overlay element', innerErr);
        }
      }
    });

    // Restore body scrolling in case it was locked
    try { document.body.style.overflow = ''; } catch (_) {}
  } catch (e) {
    // best-effort, don't throw
    // eslint-disable-next-line no-console
    console.warn('cleanupOverlays failed', e);
  }
}
