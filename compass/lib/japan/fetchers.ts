import type { JapanSource } from "./sources";
import { computeContentHash, classifyIntelItem } from "./classifier";

export type FetchedItem = {
  sourceId: string;
  title: string;
  url: string;
  publishedAt: Date | null;
  category: string;
  language: string | null;
  rawText: string;
  contentHash: string;
  impactLevel: string;
  isMajorUpdate: boolean;
};

// Fetch HTML and extract links/text from common announcement list patterns
async function fetchHtml(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "CompassBot/1.0 (Japan Intel)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// Basic link extraction from HTML
function extractLinks(html: string, baseUrl: string): { title: string; url: string }[] {
  const links: { title: string; url: string }[] = [];
  const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const href = match[1].trim();
    const text = match[2].replace(/<[^>]+>/g, "").trim();
    if (!text || !href || href === "#" || href.startsWith("javascript:")) continue;

    let fullUrl: string;
    try {
      fullUrl = new URL(href, baseUrl).href;
    } catch {
      continue;
    }

    links.push({ title: text, url: fullUrl });
  }
  return links;
}

// Try RSS/Atom feed parsing
function parseRssItems(xml: string): { title: string; url: string; publishedAt: Date | null }[] {
  const items: { title: string; url: string; publishedAt: Date | null }[] = [];

  // Simple RSS/Atom item extraction
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
    const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim()
      ?? block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1]?.trim()
      ?? "";
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim()
      ?? block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1]?.trim()
      ?? null;

    if (title && link) {
      items.push({
        title,
        url: link,
        publishedAt: pubDate ? new Date(pubDate) : null,
      });
    }
  }

  // Atom entries
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
    const link = block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1]?.trim() ?? "";
    const updated = block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1]?.trim() ?? null;

    if (title && link) {
      items.push({
        title,
        url: link,
        publishedAt: updated ? new Date(updated) : null,
      });
    }
  }

  return items;
}

export async function fetchFromSource(source: JapanSource): Promise<FetchedItem[]> {
  const items: FetchedItem[] = [];

  try {
    const html = await fetchHtml(source.url);

    // Try RSS first
    const rssItems = parseRssItems(html);
    if (rssItems.length > 0) {
      for (const ri of rssItems.slice(0, 20)) {
        const classification = classifyIntelItem(ri.title, source.authorityLevel, source.category);
        items.push({
          sourceId: source.id,
          title: ri.title,
          url: ri.url,
          publishedAt: ri.publishedAt,
          category: source.category,
          language: ri.title.match(/[　-鿿]/) ? "ja" : "en",
          rawText: ri.title,
          contentHash: computeContentHash(source.id, ri.title, ri.url, ri.publishedAt?.toISOString() ?? null),
          impactLevel: classification.impactLevel,
          isMajorUpdate: classification.isMajorUpdate,
        });
      }
      return items;
    }

    // Fallback: extract links from HTML
    const links = extractLinks(html, source.url);
    for (const link of links.slice(0, 20)) {
      const classification = classifyIntelItem(link.title, source.authorityLevel, source.category);
      items.push({
        sourceId: source.id,
        title: link.title,
        url: link.url,
        publishedAt: null,
        category: source.category,
        language: link.title.match(/[　-鿿]/) ? "ja" : "en",
        rawText: link.title,
        contentHash: computeContentHash(source.id, link.title, link.url, null),
        impactLevel: classification.impactLevel,
        isMajorUpdate: classification.isMajorUpdate,
      });
    }
  } catch (err) {
    console.error(`[japan-intel] Failed to fetch ${source.id}:`, err);
    throw err;
  }

  return items;
}
