/**
 * Cloudflare Pages Function: /unsubscribe?email=...
 * Best-effort unsubscribe in beehiiv, then a localized confirmation page.
 * Always returns 200 so the opt-out link never 404s.
 */
const TITLE = 'Iscrizione annullata';
const BODY  = 'Non riceverai più le nostre email.';

export async function onRequestGet({ request, env }) {
  const email = (new URL(request.url).searchParams.get("email") || "").trim().toLowerCase();
  if (email && email.includes("@") && env.BEEHIIV_API_KEY && env.BEEHIIV_PUB_ID) {
    try {
      const lookup = await fetch(
        `https://api.beehiiv.com/v2/publications/${env.BEEHIIV_PUB_ID}/subscriptions/by_email/${encodeURIComponent(email)}`,
        { headers: { Authorization: `Bearer ${env.BEEHIIV_API_KEY}` } }
      );
      const data = await lookup.json().catch(() => ({}));
      const id = data && data.data && data.data.id;
      if (id) {
        await fetch(
          `https://api.beehiiv.com/v2/publications/${env.BEEHIIV_PUB_ID}/subscriptions/${id}`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${env.BEEHIIV_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ unsubscribe: true }),
          }
        );
      }
    } catch (e) { /* fail-open: still show confirmation */ }
  }
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${TITLE}</title>
<style>body{font-family:system-ui,sans-serif;max-width:540px;margin:4rem auto;padding:0 1.25rem;color:#0f172a;text-align:center;line-height:1.6}h1{font-size:1.4rem}a{color:#2563eb}</style>
</head><body><h1>${TITLE}</h1><p>${BODY}</p><p><a href="/">&larr;</a></p></body></html>`;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
