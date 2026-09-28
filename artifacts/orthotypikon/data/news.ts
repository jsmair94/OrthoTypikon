export type NewsRegionKey = 'jordan' | 'syria' | 'lebanon';

export type NewsArticle = {
  id: string;
  title: string;
  link: string;
  publishedAt?: string;
};

export type NewsRegionSource = {
  key: NewsRegionKey;
  websiteUrl?: string;
  feedUrl?: string;
};

export const NEWS_REGION_SOURCES: readonly NewsRegionSource[] = [
  {
    key: 'jordan',
    websiteUrl: 'https://orthodoxjo.tv/%d8%a7%d9%84%d8%a3%d8%ae%d8%a8%d8%a7%d8%b1/',
    feedUrl: 'https://orthodoxjo.tv/wp-json/wp/v2/posts?per_page=8&_embed=1',
  },
  { key: 'syria' },
  { key: 'lebanon' },
];

const decodeHtml = (value: string) =>
  value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();

type WordPressPost = {
  id?: number;
  date?: string;
  link?: string;
  title?: { rendered?: string };
};

export async function fetchJordanNews(): Promise<NewsArticle[]> {
  const source = NEWS_REGION_SOURCES.find((item) => item.key === 'jordan');
  if (!source?.feedUrl) return [];

  const response = await fetch(source.feedUrl);
  if (!response.ok) throw new Error(`Jordan news request failed: ${response.status}`);

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) return [];

  return payload
    .map((post) => post as WordPressPost)
    .map((post) => ({
      id: String(post.id ?? post.link ?? post.title?.rendered ?? ''),
      title: decodeHtml(post.title?.rendered ?? ''),
      link: post.link ?? source.websiteUrl ?? '',
      publishedAt: post.date,
    }))
    .filter((article) => article.title.length > 0 && article.link.length > 0);
}