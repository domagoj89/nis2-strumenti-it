/**
 * CF Pages Function — POST /generate-report
 *
 * Receives quiz answers, calls Claude API, returns personalized
 * NIS2 compliance report as HTML (printable as PDF).
 *
 * Env vars required (set in CF Pages dashboard or via factory step 03):
 *   ANTHROPIC_API_KEY
 */

export async function onRequestPost(context) {
  const { ANTHROPIC_API_KEY } = context.env;

  if (!ANTHROPIC_API_KEY) {
    return json({ error: "Report generation not configured." }, 503);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const { sector, size, revenue, budget, lang = "pl", domain = "", email = "" } = body;

  if (!sector || !size || !revenue || !budget) {
    return json({ error: "Missing quiz answers." }, 400);
  }

  const prompt = buildPrompt({ sector, size, revenue, budget, lang, domain });

  try {
    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResp.ok) {
      const err = await aiResp.text();
      console.error("Claude API error:", err);
      return json({ error: "Report generation failed." }, 502);
    }

    const aiData = await aiResp.json();
    const reportHtml = aiData.content?.[0]?.text || "";
    const fullHtml = wrapReport(reportHtml, lang);

    if (email && context.env.RESEND_API_KEY) {
      await sendReportEmail({ email, html: fullHtml, lang, env: context.env });
    }

    return json({ html: fullHtml });
  } catch (err) {
    console.error("generate-report error:", err);
    return json({ error: "Unexpected error." }, 500);
  }
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt({ sector, size, revenue, budget, lang, domain }) {
  const sectorLabel = {
    annex1: "essential entity (Annex I — energy, transport, banking, health, digital infrastructure)",
    annex2: "important entity (Annex II — postal, waste, chemicals, food, manufacturing, digital providers)",
    other:  "outside NIS2 scope (non-regulated sector)",
  }[sector] || sector;

  const sizeLabel   = { micro: "under 50 employees", medium: "50–249 employees", large: "250+ employees" }[size] || size;
  const revLabel    = { small: "under €10M/year", medium: "€10–50M/year", large: "over €50M/year" }[revenue] || revenue;
  const budgetLabel = { free: "free / zero budget", low: "up to €200/year", mid: "€200–1400/year", high: "€1400+/year" }[budget] || budget;

  const langInstruction = {
    pl: "Respond entirely in Polish.",
    cs: "Respond entirely in Czech.",
    sk: "Respond entirely in Slovak.",
    ro: "Respond entirely in Romanian.",
    hr: "Respond entirely in Croatian.",
    hu: "Respond entirely in Hungarian.",
    it: "Respond entirely in Italian.",
  }[lang] || "Respond entirely in English.";

  // Affiliate links — these get embedded in the report and in the AI-ready prompt
  const toolLinks = {
    "Reglyze":    "https://reglyze.com",
    "ISMS.online":"https://isms.online",
    "Secfix":     "https://secfix.com",
    "NordLayer":  "https://nordlayer.com",
    "Sprinto":    "https://sprinto.com",
    "ComplyCloud":"https://complycloud.eu",
    "Vanta":      "https://vanta.com",
    "Drata":      "https://drata.com",
  };

  // Pick 2 tools based on sector + budget
  const [tool1, tool2] = pickTools(sector, budget);
  const t1url = toolLinks[tool1] || "#";
  const t2url = toolLinks[tool2] || "#";

  return `${langInstruction}

You are a NIS2 compliance expert. Generate a personalized compliance report for this company profile:

- Sector: ${sectorLabel}
- Size: ${sizeLabel}
- Annual revenue: ${revLabel}
- Compliance budget: ${budgetLabel}

Generate a structured HTML report (no <html>/<body> tags — just the inner content). Use these exact HTML sections:

<div class="report-section">
  <h2>Your Company Profile</h2>
  [2-3 sentences summarizing their profile and NIS2 status]
</div>

<div class="report-section">
  <h2>Your Compliance Obligations</h2>
  [Bullet list of 4-5 specific NIS2 obligations for their entity type and sector. Be specific to their profile.]
</div>

<div class="report-section">
  <h2>Priority Action Plan</h2>
  [Numbered list of 6 priority actions they must take. Format each as: <strong>Action title</strong> — explanation. Order by urgency.]
</div>

<div class="report-section">
  <h2>Recommended Tools for Your Profile</h2>
  <p>Based on your sector and budget, we recommend:</p>
  <div class="report-tools">
    <div class="report-tool">
      <strong>#1 — ${tool1}</strong><br>
      [1 sentence why it fits their profile]<br>
      <a href="${t1url}" target="_blank" rel="noopener nofollow">${t1url}</a>
    </div>
    <div class="report-tool">
      <strong>#2 — ${tool2}</strong><br>
      [1 sentence why it fits their profile]<br>
      <a href="${t2url}" target="_blank" rel="noopener nofollow">${t2url}</a>
    </div>
  </div>
</div>

<div class="report-section report-ai-prompt">
  <h2>🤖 Get AI-Guided Step-by-Step Help</h2>
  <p>Copy the text below and paste it into <strong>Claude</strong> or <strong>ChatGPT</strong> to get personalized step-by-step implementation guidance:</p>
  <div class="report-ai-box">
    <textarea readonly rows="10">I am a company in the ${sectorLabel} with ${sizeLabel} and ${revLabel} annual revenue. I need to achieve NIS2 compliance.

My key gaps (based on my assessment):
[List the 3 most important gaps from the action plan you identified]

Tools recommended for my profile:
- ${tool1}: ${t1url}
- ${tool2}: ${t2url}

Please guide me step by step to implement NIS2 compliance, starting with the highest priority action. For each step, tell me exactly what to do and which tool helps with it.</textarea>
    <button onclick="this.previousElementSibling.select(); document.execCommand('copy'); this.textContent='Copied!';" class="report-copy-btn">Copy to clipboard</button>
  </div>
</div>

Make the report detailed, specific to their company profile, and actionable. Do not include generic advice — every point must be relevant to their sector and size.`;
}

function pickTools(sector, budget) {
  const map = {
    "annex1:free":  ["Reglyze",    "ISMS.online"],
    "annex1:low":   ["ISMS.online","Reglyze"],
    "annex1:mid":   ["Secfix",     "ISMS.online"],
    "annex1:high":  ["Secfix",     "Vanta"],
    "annex2:free":  ["Reglyze",    "ComplyCloud"],
    "annex2:low":   ["Reglyze",    "ISMS.online"],
    "annex2:mid":   ["ISMS.online","Secfix"],
    "annex2:high":  ["Secfix",     "Sprinto"],
    "other:free":   ["Reglyze",    "ComplyCloud"],
    "other:low":    ["Reglyze",    "ComplyCloud"],
    "other:mid":    ["ComplyCloud","Reglyze"],
    "other:high":   ["ComplyCloud","Secfix"],
  };
  return map[`${sector}:${budget}`] || ["Reglyze", "ISMS.online"];
}

// ── Report wrapper — full printable HTML page ─────────────────────────────────

function wrapReport(content, lang) {
  const title = {
    pl: "Twój Raport Zgodności NIS2",
    cs: "Váš přehled souladu NIS2",
    sk: "Váš prehľad súladu NIS2",
    ro: "Raportul dumneavoastră de conformitate NIS2",
    hr: "Vaše izvješće o usklađenosti s NIS2",
    hu: "Az Ön NIS2 megfelelőségi jelentése",
    it: "Il tuo rapporto di conformità NIS2",
  }[lang] || "Your NIS2 Compliance Report";

  const printBtn = {
    pl: "Pobierz jako PDF",
    cs: "Stáhnout jako PDF",
    sk: "Stiahnuť ako PDF",
    ro: "Descarcă ca PDF",
    hr: "Preuzmi kao PDF",
    hu: "Letöltés PDF-ként",
    it: "Scarica come PDF",
  }[lang] || "Download as PDF";

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; background: #f8f9fa; padding: 2rem 1rem; }
  .report-wrapper { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,.08); overflow: hidden; }
  .report-header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 2rem; }
  .report-header h1 { font-size: 1.5rem; margin-bottom: .5rem; }
  .report-header p { opacity: .75; font-size: .9rem; }
  .report-body { padding: 2rem; }
  .report-section { margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #f0f0f0; }
  .report-section:last-child { border-bottom: none; margin-bottom: 0; }
  .report-section h2 { font-size: 1.1rem; color: #1a1a2e; margin-bottom: 1rem; padding-bottom: .5rem; border-bottom: 2px solid #e8f4f8; }
  .report-section p, .report-section li { font-size: .92rem; line-height: 1.65; color: #444; }
  .report-section ul, .report-section ol { padding-left: 1.5rem; margin-top: .5rem; }
  .report-section li { margin-bottom: .5rem; }
  .report-tools { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
  .report-tool { background: #f8f9fa; border-radius: 8px; padding: 1rem; font-size: .88rem; line-height: 1.6; }
  .report-tool a { color: #0066cc; word-break: break-all; }
  .report-ai-prompt { background: #f0f7ff; border-radius: 8px; padding: 1.25rem; border: none; }
  .report-ai-prompt h2 { border-bottom-color: #c0d8f0; }
  .report-ai-box { margin-top: 1rem; }
  .report-ai-box textarea { width: 100%; padding: .75rem; border: 1px solid #c0d8f0; border-radius: 6px; font-size: .82rem; font-family: inherit; line-height: 1.6; resize: vertical; background: #fff; color: #333; }
  .report-copy-btn { margin-top: .5rem; padding: .5rem 1.25rem; background: #0066cc; color: #fff; border: none; border-radius: 5px; font-size: .85rem; cursor: pointer; }
  .report-copy-btn:hover { background: #0052a3; }
  .report-actions { text-align: center; padding: 1.5rem 2rem; background: #f8f9fa; border-top: 1px solid #eee; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
  .btn-print { padding: .65rem 1.5rem; background: #1a1a2e; color: #fff; border: none; border-radius: 6px; font-size: .9rem; cursor: pointer; }
  .btn-print:hover { background: #16213e; }
  @media print {
    body { background: #fff; padding: 0; }
    .report-wrapper { box-shadow: none; border-radius: 0; }
    .report-actions { display: none; }
  }
  @media (max-width: 600px) {
    .report-tools { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<div class="report-wrapper">
  <div class="report-header">
    <h1>${title}</h1>
    <p>Generated ${new Date().toLocaleDateString(lang + '-' + lang.toUpperCase(), { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
  <div class="report-body">
    ${content}
  </div>
  <div class="report-actions">
    <button class="btn-print" onclick="window.print()">${printBtn}</button>
  </div>
</div>
</body>
</html>`;
}

// ── Email delivery via Resend ─────────────────────────────────────────────────

async function sendReportEmail({ email, html, lang, env }) {
  const from = env.RESEND_FROM_EMAIL || "report@nis2-narzedzia.pl";

  const subject = {
    pl: "Twój Raport Zgodności NIS2",
    cs: "Váš přehled souladu NIS2",
    sk: "Váš prehľad súladu NIS2",
    ro: "Raportul dumneavoastră de conformitate NIS2",
    hr: "Vaše izvješće o usklađenosti s NIS2",
    hu: "Az Ön NIS2 megfelelőségi jelentése",
    it: "Il tuo rapporto di conformità NIS2",
  }[lang] || "Your NIS2 Compliance Report";

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [email], subject, html }),
    });
    if (!r.ok) {
      console.error("Resend error:", await r.text());
    }
  } catch (err) {
    console.error("Resend send failed:", err);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
