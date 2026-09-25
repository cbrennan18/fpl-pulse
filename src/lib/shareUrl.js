// Builds an absolute, UTM-tagged share URL from the current origin + a path
// (defaults to the current route) so links work under the GH Pages basename
// without hardcoding a host.

export function buildShareUrl(path, params = {}, utm = {}) {
  const base = `${window.location.origin}${path ?? window.location.pathname}`;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...utm })) {
    if (value != null) search.set(key, value);
  }
  return `${base}?${search.toString()}`;
}
