// api/[table].js
// Proxies requests like  https://bond.credit/api/agent_leaderboard_genesis
// to https://<your-project>.supabase.co/rest/v1/agent_leaderboard_genesis
//
// The real Supabase URL and API key never appear in the client — they live
// only in Vercel's environment variables and this server-side function.

export default async function handler(req, res) {
  // CORS (adjust origin if you want to lock this down to your own frontend)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;       // e.g. https://xurzcnthfpzihylgcnly.supabase.co
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;   // your sb_publishable_... key

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Server not configured: missing SUPABASE_URL or SUPABASE_ANON_KEY' });
  }

  const { table, ...query } = req.query;

  if (!table) {
    return res.status(400).json({ error: 'Missing table name in URL, e.g. /api/agent_leaderboard_genesis' });
  }

  // Rebuild the query string, forwarding everything the client sent
  // (filters, select, order, limit, etc. — all standard PostgREST params work)
  const params = new URLSearchParams(query);
  const targetUrl = `${SUPABASE_URL}/rest/v1/${table}${params.toString() ? `?${params.toString()}` : ''}`;

  try {
    const supabaseRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        // Forward Prefer header if the client sends one (used for upserts, counts, etc.)
        ...(req.headers['prefer'] ? { Prefer: req.headers['prefer'] } : {}),
      },
      body: ['POST', 'PATCH', 'PUT'].includes(req.method)
        ? JSON.stringify(req.body)
        : undefined,
    });

    const contentType = supabaseRes.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await supabaseRes.json()
      : await supabaseRes.text();

    return res.status(supabaseRes.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Upstream request failed', details: err.message });
  }
}
