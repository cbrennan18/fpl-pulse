// Capture + share helpers wrapping html-to-image. All functions are
// browser-only and assume the node is fully laid out at the requested
// pixel dimensions before they're called.

import { toPng, toBlob } from 'html-to-image';
import { PALETTE } from './constants';
import { fetchFontEmbedCss } from './fontEmbedCss';

async function commonOpts(extra = {}) {
  // document.fonts.ready resolves once all currently-loaded @font-face rules
  // are ready to render. Critical for a non-blank Bebas Neue / Manrope PNG.
  await document.fonts.ready;
  // Providing fontEmbedCSS short-circuits html-to-image's own font scanner
  // (which crashes on a missing font-family entry in some doc stylesheet).
  // The CSS we pass already has woff2 inlined as base64 data URIs so the
  // SVG rasteriser doesn't need to make any cross-origin requests.
  const fontEmbedCSS = await fetchFontEmbedCss();
  return {
    cacheBust: true,
    backgroundColor: PALETTE.bg,
    fontEmbedCSS,
    ...extra,
  };
}

export async function captureNodeToPng(node, { width, height, pixelRatio = 1 } = {}) {
  const opts = await commonOpts({ width, height, pixelRatio });
  return toPng(node, opts);
}

export async function captureNodeToBlob(node, { width, height, pixelRatio = 1 } = {}) {
  const opts = await commonOpts({ width, height, pixelRatio });
  return toBlob(node, opts);
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadBlob(blob, filename) {
  if (!blob) throw new Error('capture failed');
  const url = URL.createObjectURL(blob);
  try {
    downloadDataUrl(url, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

// Writes a PNG blob to the system clipboard. Throws when the browser lacks
// ClipboardItem support (Firefox <127 / Safari <13.1) so callers can show a
// graceful fallback.
export async function copyBlobToClipboard(blob) {
  if (!blob) throw new Error('capture failed');
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error('Clipboard image write not supported in this browser');
  }
  await navigator.clipboard.write([
    new ClipboardItem({ [blob.type || 'image/png']: blob }),
  ]);
}

// Tries Web Share API with a File first (the only path that surfaces native
// share sheets on iOS / Android — including WhatsApp). Falls back to a plain
// download. Returns { method } so callers can update UI accordingly.
export async function sharePngBlob(blob, filename, shareData = {}) {
  if (!blob) throw new Error('share: empty blob');
  const file = new File([blob], filename, { type: blob.type || 'image/png' });

  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], ...shareData });
      return { method: 'web-share' };
    } catch (err) {
      if (err?.name === 'AbortError') return { method: 'aborted' };
      // fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    downloadDataUrl(url, filename);
  } finally {
    // Revoke after the click handler has had a tick to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { method: 'download' };
}
