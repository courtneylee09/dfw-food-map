import type { PlacesResult } from "./places";
import type { Verdict } from "./agent";

// Key 1 of two-key approval: plain code (no AI) confirms that each quote the
// agent cites actually appears on the cited page.

export interface CheckedEvidence {
  url: string;
  source_type: string;
  observed_date: string | null;
  quote: string | null;
  quoteVerified: boolean;
  // Page text around the quote, for the second-opinion checker
  excerpt: string | null;
}

const USER_AGENT = "FoodInTheDFW-Verifier/1.0 (+https://dfwfoodmap.imtechsavvy.org)";
const FETCH_TIMEOUT_MS = 15000;
const EXCERPT_CHARS = 1500;

const pageCache = new Map<string, Promise<string | null>>();

function decodeEntities(text: string): string {
  const named: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
    rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…", middot: "·",
  };
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => named[name.toLowerCase()] ?? m);
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<(br|p|div|li|tr|h[1-6])\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\n\s*/g, "\n")
    .trim();
}

async function fetchPageText(url: string): Promise<string | null> {
  if (!/^https?:\/\//i.test(url) || /google\.[a-z.]+\/maps|maps\.google\./i.test(url)) return null;
  if (!pageCache.has(url)) {
    pageCache.set(
      url,
      (async () => {
        try {
          const response = await fetch(url, {
            headers: { "User-Agent": USER_AGENT, Accept: "text/html,text/plain;q=0.9" },
            redirect: "follow",
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          });
          if (!response.ok) return null;
          const type = response.headers.get("content-type") ?? "";
          if (!/text\/html|text\/plain|application\/xhtml/i.test(type)) return null;
          const body = await response.text();
          return type.includes("text/plain") ? body : htmlToText(body);
        } catch {
          return null;
        }
      })(),
    );
  }
  return pageCache.get(url)!;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‐‑‒–—―−]/g, "-")
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/(\d):00\b/g, "$1")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Returns the character position of the quote in the page, or -1.
// Exact match after normalizing; otherwise ≥ 90% of the quote's words, in a
// window no longer than 1.5× the quote (tolerates small formatting differences).
function findQuote(quote: string, pageText: string): number {
  const q = normalize(quote);
  const t = normalize(pageText);
  if (!q) return -1;
  const exact = t.indexOf(q);
  if (exact >= 0) return Math.round((exact / Math.max(t.length, 1)) * pageText.length);

  const qWords = q.split(" ").filter((w) => w.length > 1);
  if (qWords.length < 3) return -1;
  const tWords = t.split(" ");
  const windowSize = Math.ceil(qWords.length * 1.5);
  for (let start = 0; start + qWords.length <= tWords.length; start++) {
    const window = tWords.slice(start, start + windowSize);
    let wi = 0;
    let matched = 0;
    for (const word of qWords) {
      const found = window.indexOf(word, wi);
      if (found >= 0) {
        matched++;
        wi = found + 1;
      }
    }
    if (matched / qWords.length >= 0.9) {
      return Math.round((start / Math.max(tWords.length, 1)) * pageText.length);
    }
  }
  return -1;
}

function placesText(places: PlacesResult): string {
  const p = places.match;
  if (!p) return "";
  return [p.name, p.address, p.businessStatus, p.phone, p.website, ...(p.hours ?? [])].filter(Boolean).join("\n");
}

export async function checkEvidence(verdict: Verdict, places: PlacesResult): Promise<CheckedEvidence[]> {
  return Promise.all(
    verdict.evidence.map(async (e): Promise<CheckedEvidence> => {
      const base = { url: e.url, source_type: e.source_type, observed_date: e.observed_date, quote: e.quote };
      if (!e.quote) return { ...base, quoteVerified: false, excerpt: null };

      const text = e.source_type === "google_places" ? placesText(places) : await fetchPageText(e.url);
      if (!text) return { ...base, quoteVerified: false, excerpt: null };

      const at = findQuote(e.quote, text);
      if (at < 0) return { ...base, quoteVerified: false, excerpt: null };
      const start = Math.max(0, at - EXCERPT_CHARS / 2);
      return { ...base, quoteVerified: true, excerpt: text.slice(start, start + EXCERPT_CHARS) };
    }),
  );
}
