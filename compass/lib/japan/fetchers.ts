import { computeContentHash, classifyIntelItem } from "./classifier";

type FetchableSource = {
  id: string;
  name: string;
  url: string;
  category: string;
  authorityLevel: string;
};

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

const USER_AGENT = "CompassBot/1.0 (Japan Intel; personal monitoring)";

async function fetchHtml(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractReadableText(html: string): string {
  // Remove script, style, nav, footer, header tags and their content
  let cleaned = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, "");
  cleaned = cleaned.replace(/<nav[\s\S]*?<\/nav>/gi, "");
  cleaned = cleaned.replace(/<footer[\s\S]*?<\/footer>/gi, "");
  cleaned = cleaned.replace(/<header[\s\S]*?<\/header>/gi, "");
  cleaned = cleaned.replace(/<aside[\s\S]*?<\/aside>/gi, "");

  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  cleaned = cleaned.replace(/&amp;/g, "&");
  cleaned = cleaned.replace(/&lt;/g, "<");
  cleaned = cleaned.replace(/&gt;/g, ">");
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&nbsp;/g, " ");

  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Truncate to 8000 chars
  if (cleaned.length > 8000) {
    cleaned = cleaned.slice(0, 8000) + "…";
  }

  return cleaned;
}

async function fetchDetailText(url: string): Promise<string | null> {
  try {
    const html = await fetchHtml(url, 10000);
    return extractReadableText(html);
  } catch {
    return null;
  }
}

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

function parseRssItems(xml: string): { title: string; url: string; publishedAt: Date | null }[] {
  const items: { title: string; url: string; publishedAt: Date | null }[] = [];

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
      items.push({ title, url: link, publishedAt: pubDate ? new Date(pubDate) : null });
    }
  }

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
    const link = block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1]?.trim() ?? "";
    const updated = block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1]?.trim() ?? null;

    if (title && link) {
      items.push({ title, url: link, publishedAt: updated ? new Date(updated) : null });
    }
  }

  return items;
}

export async function fetchFromSource(source: FetchableSource): Promise<FetchedItem[]> {
  const items: FetchedItem[] = [];

  try {
    const html = await fetchHtml(source.url);

    // Try RSS first
    const rssItems = parseRssItems(html);
    const rawCandidates: { title: string; url: string; publishedAt?: Date | null }[] =
      rssItems.length > 0
        ? rssItems.slice(0, 20)
        : extractLinks(html, source.url).slice(0, 20);
    const candidates = rawCandidates.map((c) => ({
      title: c.title,
      url: c.url,
      publishedAt: (c.publishedAt as Date | null) ?? null,
    }));

    for (const candidate of candidates) {
      // Fetch detail page for richer content
      let rawText = candidate.title;
      const detailText = await fetchDetailText(candidate.url);
      if (detailText && detailText.length > candidate.title.length) {
        rawText = candidate.title + "\n\n" + detailText;
      }

      const classification = classifyIntelItem(rawText, source.authorityLevel, source.category);
      items.push({
        sourceId: source.id,
        title: candidate.title,
        url: candidate.url,
        publishedAt: candidate.publishedAt ?? null,
        category: source.category,
        language: rawText.match(/[　-鿿]/) ? "ja" : "en",
        rawText,
        contentHash: computeContentHash(source.id, candidate.title, candidate.url, candidate.publishedAt?.toISOString() ?? null),
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
