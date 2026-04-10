// Vercel Serverless Function â proxies AI requests to Anthropic
// Hardened with: origin allowlist, in-memory rate limit, input validation
// Keeps ANTHROPIC_API_KEY secret in environment variables

const ALLOWED_ORIGINS = [
  'https://nocene.com',
  'https://www.nocene.com',
  'https://nocene-tools.vercel.app'
];

// Allow Vercel preview deployments too (nocene-tools-<hash>.vercel.app)
const PREVIEW_ORIGIN_RE = /^https:\/\/nocene-tools-[\w-]+\.vercel\.app$/;

// In-memory rate limit store (per warm serverless instance)
// Not perfect across cold starts, but deters casual abuse
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 15;                   // 15 requests per IP per hour

const MAX_INPUT_CHARS = 20000;  // ~5000 tokens of input
const MAX_TOKENS_CAP = 2500;    // hard cap on output tokens
const MAX_MESSAGES = 20;        // cap conversation length

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true, remaining: RATE_LIMIT_MAX - entry.count };
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN_RE.test(origin);

  // CORS headers (only reflect origin if allowlisted)
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Block direct/cross-origin requests (curl, other sites)
  if (!isAllowed) {
    return res.status(403).json({ error: 'Forbidden: origin not allowed' });
  }

  // Rate limit per IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
  res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { system, messages, max_tokens, model } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid request: messages required' });
    }
    if (messages.length > MAX_MESSAGES) {
      return res.status(400).json({ error: 'Too many messages' });
    }

    const totalChars = JSON.stringify({ system: system || '', messages }).length;
    if (totalChars > MAX_INPUT_CHARS) {
      return res.status(400).json({ error: 'Input too long' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: Math.min(max_tokens || 2000, MAX_TOKENS_CAP),
        system: system || '',
        messages
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Anthropic API error' });
    }
    return res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
