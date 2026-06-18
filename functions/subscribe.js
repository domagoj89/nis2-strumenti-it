/**
 * Cloudflare Pages Function: /subscribe
 * Accepts POST { email, source } from site.js
 * Forwards to beehiiv API (free tier handles subscriber creation)
 *
 * Environment variables required (set in Cloudflare Pages dashboard):
 *   BEEHIIV_API_KEY  — beehiiv API key (Settings → API Keys)
 *   BEEHIIV_PUB_ID   — beehiiv Publication ID (from your publication URL)
 *
 * If env vars are not set, returns 200 anyway (fail-open) so UX is never broken.
 */
export async function onRequestPost({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return new Response(JSON.stringify({ ok: false, error: "invalid email" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const apiKey = env.BEEHIIV_API_KEY;
  const pubId  = env.BEEHIIV_PUB_ID;

  // Fail-open: if not configured, return 200 so UX works before beehiiv is set up
  if (!apiKey || !pubId) {
    return new Response(JSON.stringify({ ok: true, note: "not configured" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: "nis2-narzedzia.pl",
          utm_medium: "email-gate",
          utm_campaign: body.source || "inline",
        }),
      }
    );

    const data = await res.json().catch(() => ({}));
    const ok = res.status === 200 || res.status === 201;
    return new Response(JSON.stringify({ ok, status: res.status, data }), {
      status: ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    // Network error — still return 200 so UX isn't broken
    return new Response(JSON.stringify({ ok: true, note: "upstream error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
