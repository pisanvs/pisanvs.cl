/**
 * pisanvs-live — Cloudflare Worker
 *
 * Single endpoint that aggregates live data from external APIs,
 * caches for 5 minutes, and returns everything in one JSON response.
 *
 * Secrets to set in Cloudflare dashboard (or wrangler secret put):
 *   LASTFM_KEY    — last.fm API key (free at last.fm/api)
 *   NOTION_TOKEN  — Notion integration token
 *
 * Deploy:
 *   cd worker && npx wrangler deploy
 *   Then add route live.pisanvs.cl/* → pisanvs-live in Cloudflare dashboard
 */

const CACHE_TTL   = 300; // seconds
const CACHE_KEY   = 'https://pisanvs-live/v2';
const LASTFM_USER = 'maxmorelpisano';
const DISCOGS_USER = 'pisanvs';
const NOTION_DB   = '9a9a392ec4be4a47bbc2de013f744d36';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// ── fetchers ──────────────────────────────────────────────────────────────────

async function fetchLastFm(key) {
  if (!key) return null;
  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USER}&limit=1&format=json&api_key=${key}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'pisanvs.cl/1.0' } });
  const d = await r.json();
  const t = d.recenttracks?.track?.[0];
  if (!t) return null;
  return {
    name:       t.name,
    artist:     t.artist['#text'],
    url:        t.url,
    nowplaying: t['@attr']?.nowplaying === 'true',
  };
}

async function fetchSubstack() {
  const r = await fetch('https://pisanvs.substack.com/feed', {
    headers: { 'User-Agent': 'pisanvs.cl/1.0' }
  });
  const xml = await r.text();
  const item = xml.match(/<item>([\s\S]*?)<\/item>/)?.[1];
  if (!item) return null;
  const title = (
    item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]>/) ||
    item.match(/<title>([\s\S]*?)<\/title>/)
  )?.[1]?.trim();
  const link = item.match(/<link>(https?:\/\/[^<\s]+)<\/link>/)?.[1]
    || 'https://pisanvs.substack.com';
  return title ? { title, link } : null;
}

async function fetchDiscogsWantlist(token) {
  const url = `https://api.discogs.com/users/${DISCOGS_USER}/wants?per_page=50&sort=added&sort_order=desc`;
  const headers = { 'User-Agent': 'pisanvs.cl/1.0' };
  if (token) headers['Authorization'] = `Discogs token=${token}`;
  const r = await fetch(url, { headers });
  const d = await r.json();
  return (d.wants || []).map(w => ({
    title:  w.basic_information.title,
    artist: w.basic_information.artists?.[0]?.name || '',
    year:   w.basic_information.year || null,
    thumb:  w.basic_information.thumb || '',
  }));
}

async function fetchNotion(token) {
  if (!token) return null;
  const r = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page_size: 100 }),
  });
  const d = await r.json();
  if (!d.results) return null;
  return d.results.map(p => {
    const props = p.properties;
    const title  = props.Name?.title?.[0]?.plain_text || '';
    const author = props.Author?.rich_text?.[0]?.plain_text || '';
    const status = props.Status?.status?.name || '';
    const rating = props.Rating?.select?.name || null;
    const type   = props.Type?.select?.name || '';
    return { title, author, status, rating, type };
  }).filter(b => b.title);
}

// ── handler ───────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const cache = caches.default;
    const cacheKey = new Request(CACHE_KEY);

    const cached = await cache.match(cacheKey);
    if (cached) {
      const res = new Response(cached.body, cached);
      res.headers.set('X-Cache', 'HIT');
      return res;
    }

    const [track, post, wantlist, books] = await Promise.allSettled([
      fetchLastFm(env.LASTFM_KEY),
      fetchSubstack(),
      fetchDiscogsWantlist(env.DISCOGS_TOKEN),
      fetchNotion(env.NOTION_TOKEN),
    ]);

    const data = {
      track:    track.status    === 'fulfilled' ? track.value    : null,
      post:     post.status     === 'fulfilled' ? post.value     : null,
      wantlist: wantlist.status === 'fulfilled' ? wantlist.value : [],
      books:    books.status    === 'fulfilled' ? books.value    : null,
    };

    const res = new Response(JSON.stringify(data), {
      headers: {
        ...CORS,
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'X-Cache': 'MISS',
      },
    });

    await cache.put(cacheKey, res.clone());
    return res;
  },
};
