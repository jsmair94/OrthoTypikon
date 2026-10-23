export function managedContentUrl(key: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  const origin = domain
    ? (/^https?:\/\//i.test(domain) ? domain : `https://${domain}`).replace(/\/+$/, "")
    : "";
  return `${origin}/api/content/${encodeURIComponent(key)}`;
}

export async function fetchManagedContent<T>(key: string): Promise<T | null> {
  try {
    const response = await fetch(managedContentUrl(key));
    if (!response.ok) return null;
    const result = await response.json() as { content?: T };
    return result.content ?? null;
  } catch {
    return null;
  }
}
