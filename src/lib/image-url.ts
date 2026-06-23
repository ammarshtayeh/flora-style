export function isValidImageSource(url: string) {
  const value = url.trim();
  if (!value) return false;
  if (value.startsWith("/")) return true;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function uniqueImageUrls(urls: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of urls) {
    const url = raw.trim();
    if (!isValidImageSource(url) || seen.has(url)) continue;
    seen.add(url);
    output.push(url);
  }

  return output;
}

export function shouldOptimizeRemoteImage(url: string) {
  if (url.startsWith("/")) return true;

  try {
    const { hostname } = new URL(url);
    return hostname.endsWith(".supabase.co") || hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}
