// Builds a self-contained @font-face CSS string for html-to-image.
//
// 1. Fetch the Google Fonts CSS used by the app (mirrors the @import URLs in
//    src/index.css).
// 2. For each woff2 URL referenced in the CSS, fetch the file and base64-
//    encode it as a data URI.
// 3. Return the rewritten CSS so html-to-image's `fontEmbedCSS` option has
//    everything it needs without making any cross-origin requests during
//    SVG rasterisation (where they'd fail silently).
//
// Without this: html-to-image's own font scanner crashes on a missing
// font-family entry in some stylesheet (`normalizeFontFamily` calls .trim()
// on undefined). Passing raw Google CSS without inlined woff2 leaves the
// rasteriser unable to load fonts and the resulting PNG renders blank.
//
// Cached in-memory for the session — fonts don't change.

const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;600;700&family=DM+Mono&display=swap',
];

let cached = null;
let inFlight = null;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  // Chunked conversion to avoid call-stack overflow on large fonts (~50KB+).
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function inlineWoff2Url(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`woff2 fetch ${res.status} for ${url}`);
  const buf = await res.arrayBuffer();
  return `data:font/woff2;base64,${arrayBufferToBase64(buf)}`;
}

async function inlineFontUrls(css) {
  // Capture every absolute https url() Google Fonts emits. The CSS contains
  // duplicates per unicode-range block, so dedupe before fetching.
  const urls = new Set();
  const re = /url\((https:\/\/[^)]+)\)/g;
  let match;
  while ((match = re.exec(css)) !== null) urls.add(match[1]);

  const replacements = await Promise.all(
    Array.from(urls).map(async (u) => [u, await inlineWoff2Url(u)])
  );
  const map = new Map(replacements);
  return css.replace(re, (_, u) => `url(${map.get(u) || u})`);
}

export async function fetchFontEmbedCss() {
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const cssParts = await Promise.all(
      FONT_URLS.map((url) => fetch(url).then((r) => r.text()))
    );
    const combined = cssParts.join('\n');
    const inlined = await inlineFontUrls(combined);
    cached = inlined;
    return cached;
  })()
    .catch((err) => {
      inFlight = null;
      throw err;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
