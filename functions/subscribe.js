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

  const tags = buildTags(body);

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
          send_welcome_email: false,
          utm_source: "nis2-strumenti.it",
          utm_medium: "email-gate",
          utm_campaign: body.source || "inline",
          tags: [...tags, "seq_started"],
        }),
      }
    );

    const data = await res.json().catch(() => ({}));
    const ok = res.status === 200 || res.status === 201;

    // Send sequence email 0 immediately via Resend
    if (ok && env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
      const tier = tags.find(t => t === "score_low") ? "A"
                 : tags.find(t => t === "score_high") ? "C" : "B";
      await sendSequenceEmail0(email, tier, env).catch(() => {});
    }

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

// Build Beehiiv tags from quiz answers for segmented email sequences
function buildTags(body) {
  const tags = [];
  const qa   = body.quiz_answers || {};
  const score = Number(qa.score) || 0;

  // Score tier — drives which nurture sequence subscriber receives
  if (score <= 3)      tags.push("score_low");
  else if (score <= 6) tags.push("score_mid");
  else                 tags.push("score_high");

  // Sector
  if (qa.sector) tags.push("sector_" + qa.sector);

  // Role
  if (qa.role)   tags.push("role_" + qa.role);

  // Missing items — used for personalised email subject lines + content
  if (qa.registered === "no" || qa.registered === "unknown") tags.push("missing_registration");
  if (qa.has_isms === "no" || qa.has_isms === "partial")      tags.push("missing_isms");
  if (qa.has_training === "no")                               tags.push("missing_training");
  if (qa.has_insurance === "no" || qa.has_insurance === "unknown") tags.push("missing_insurance");

  // Source tag
  if (body.source) tags.push("source_" + body.source.replace(/[^a-z0-9_]/gi, "_"));

  return tags.filter(Boolean);
}

// Immediate sequence email — sent the moment someone subscribes
async function sendSequenceEmail0(email, tier, env) {
  const EMAILS = {
  "A": {
    "subject": "Il tuo piano d'azione NIS2 — 3 giorni, 3 passi",
    "html": "<p style=\"font-family:sans-serif;font-size:15px;line-height:1.6;color:#111;\">Hai appena completato il quiz NIS2 — il tuo punteggio indica che c'è ancora molto da fare prima della scadenza.<br><br><strong>La buona notizia:</strong> Le aziende in situazioni simili raggiungono la conformità in 60–90 giorni, se partono dai passi giusti.</p><h3 style=\"font-family:sans-serif;color:#1e3a5f;\">Il tuo piano di partenza in 3 giorni:</h3><p style=\"font-family:sans-serif;font-size:15px;line-height:1.7;color:#111;\"><strong>Giorno 1 (30 min) — Verifica se sei soggetto alla NIS2:</strong><br><a href=\"https://nis2-strumenti.it/calcolatore.html\" style=\"color:#1e3a5f;\">Scopri se la tua azienda rientra nell'ambito NIS2 →</a><br><br><strong>Giorno 2 (20 min) — Avvia un ISMS gratuito:</strong><br><a href=\"https://isms.online/\" style=\"color:#1e3a5f;\">ISMS.online — piano gratuito fino a 25 dipendenti →</a><br><br><strong>Giorno 3 (30 min) — Forma il tuo management:</strong><br><a href=\"https://www.knowbe4.com/\" style=\"color:#1e3a5f;\">KnowBe4 — trial gratuito 14 giorni →</a><br><br><a href=\"https://nis2-strumenti.it/#tracker-section\" style=\"color:#1e3a5f;\">Monitora i tuoi progressi nel tracker NIS2 →</a></p>"
  },
  "B": {
    "subject": "Il tuo punteggio NIS2: buona base — ecco come arrivare al 100%",
    "html": "<p style=\"font-family:sans-serif;font-size:15px;line-height:1.6;color:#111;\">Hai già le basi della NIS2 — è un buon segnale. Mancano 2–3 elementi che le autorità di vigilanza controllano più spesso.</p><p style=\"font-family:sans-serif;font-size:15px;line-height:1.7;color:#111;\"><strong>Test di penetrazione (Art. 21(2)(f)):</strong><br><a href=\"https://nis2-strumenti.it/test-penetrazione.html\" style=\"color:#1e3a5f;\">Guida ai penetration test NIS2 →</a><br><br><strong>MFA per gli account privilegiati (Art. 21(2)(i)):</strong><br><a href=\"https://nis2-strumenti.it/strumenti/1password.html\" style=\"color:#1e3a5f;\">1Password Business — MFA + gestore password →</a><br><br><strong>Sicurezza della catena di fornitura (Art. 21(2)(d)):</strong><br><a href=\"https://nis2-strumenti.it/sicurezza-catena-fornitura.html\" style=\"color:#1e3a5f;\">Guida alla sicurezza dei fornitori →</a><br><br><a href=\"https://nis2-strumenti.it/#tracker-section\" style=\"color:#1e3a5f;\">Segna i progressi nel tracker NIS2 →</a></p>"
  },
  "C": {
    "subject": "Ottimo punteggio NIS2 — ecco il tuo ultimo passo",
    "html": "<p style=\"font-family:sans-serif;font-size:15px;line-height:1.6;color:#111;\">Alto livello di preparazione NIS2 — un risultato davvero ottimo. Rimane un solo punto aperto: la validazione esterna formale.</p><p style=\"font-family:sans-serif;font-size:15px;line-height:1.7;color:#111;\"><strong>Test di penetrazione</strong> — prova dell'efficacia delle misure di sicurezza (Art. 21(2)(f)):<br><a href=\"https://nis2-strumenti.it/test-penetrazione.html\" style=\"color:#1e3a5f;\">Guida ai penetration test NIS2 →</a><br><br><strong>Certificazione ISO 27001</strong> — validazione esterna dell'intero ISMS:<br><a href=\"https://nis2-strumenti.it/certificazione-iso-27001.html\" style=\"color:#1e3a5f;\">Guida alla certificazione ISO 27001 →</a><br><br><a href=\"https://nis2-strumenti.it/#tracker-section\" style=\"color:#1e3a5f;\">Spunta le ultime voci nel tracker →</a></p>"
  }
};

  const msg = EMAILS[tier] || EMAILS["B"];
  const footer = `<hr style="margin:2rem 0;border:none;border-top:1px solid #e5e7eb;">
<p style="font-family:sans-serif;font-size:12px;color:#9ca3af;">
  NIS2-Strumenti.it &nbsp;|&nbsp;
  <a href="https://nis2-strumenti.it/unsubscribe?email=${encodeURIComponent(email)}" style="color:#9ca3af;">Wypisz się</a>
</p>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [email],
      subject: msg.subject,
      html: msg.html + footer,
    }),
  });
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
