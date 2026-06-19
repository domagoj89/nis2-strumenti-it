/**
 * CF Pages Function — POST /generate-report
 *
 * Receives quiz answers, calls Claude Haiku, returns a personalized
 * 3-day NIS2 compliance sprint report as HTML.
 * If email is provided, also sends via Resend.
 *
 * Env vars: ANTHROPIC_API_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL
 */

export async function onRequestPost(context) {
  const { ANTHROPIC_API_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL } = context.env;

  if (!ANTHROPIC_API_KEY) {
    return json({ error: "Report generation not configured." }, 503);
  }

  let body;
  try { body = await context.request.json(); }
  catch { return json({ error: "Invalid request body." }, 400); }

  const {
    sector = "annex2", size = "medium", revenue = "medium", budget = "low",
    registered = "no", has_isms = "no", has_training = "no", has_insurance = "no",
    role = "ceo", score = 3, missing = [], email = "",
    lang = "pl", domain = "",
  } = body;

  const prompt = buildPrompt({ sector, size, revenue, budget, registered, has_isms,
    has_training, has_insurance, role, score, missing, lang, domain });

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
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResp.ok) {
      console.error("Claude API error:", await aiResp.text());
      return json({ error: "Report generation failed." }, 502);
    }

    const aiData  = await aiResp.json();
    const inner   = aiData.content?.[0]?.text || "";
    const aiPrompt = buildAiPrompt({ sector, size, revenue, registered, has_isms,
      has_training, has_insurance, role, score, missing, lang, domain });
    const fullHtml = wrapReport(inner, aiPrompt, { sector, size, score, lang });

    if (email && RESEND_API_KEY && RESEND_FROM_EMAIL) {
      await sendReportEmail({ email, html: fullHtml, lang, score, env: context.env });
    }

    return json({ html: fullHtml });
  } catch (err) {
    console.error("Report error:", err);
    return json({ error: "Internal error." }, 500);
  }
}

// ── Tool links per language ───────────────────────────────────────────────────
function toolLinks(lang) {
  return {
    reglyze:     "https://reglyze.com",
    secfix:      "https://secfix.com",
    isms_online: "https://isms.online",
    knowbe4:     "https://knowbe4.com",
    hiscox:      "https://hiscox.it",
    onepassword: "https://1password.com",
    nordlayer:   "https://nordlayer.com",
    cobalt:      "https://cobalt.io",
    bsi:         "https://bsigroup.com/pl-PL/iso/iso-27001/",
    sprinto:     "https://sprinto.com",
  };
}

function pickIsmsTool(sector, budget) {
  const map = {
    "annex1:free":  "reglyze",   "annex1:low":  "isms_online",
    "annex1:mid":   "secfix",    "annex1:high": "secfix",
    "annex2:free":  "reglyze",   "annex2:low":  "reglyze",
    "annex2:mid":   "isms_online","annex2:high": "secfix",
    "other:free":   "reglyze",   "other:low":   "reglyze",
    "other:mid":    "reglyze",   "other:high":  "isms_online",
  };
  return map[sector + ":" + budget] || "reglyze";
}

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt({ sector, size, revenue, budget, registered, has_isms,
    has_training, has_insurance, role, score, missing, lang, domain }) {

  const LANG = {
    pl: "Polish", cs: "Czech", sk: "Slovak", ro: "Romanian",
    hr: "Croatian", hu: "Hungarian", it: "Italian",
  }[lang] || "Polish";

  const sectorLabel = {
    annex1: "essential entity (Annex I — energy, transport, banking, health, digital infrastructure)",
    annex2: "important entity (Annex II — postal, waste, chemicals, food, manufacturing, MSPs, digital providers)",
    other:  "outside NIS2 scope (non-regulated sector) — but may serve in-scope clients",
  }[sector] || sector;

  const sizeLabel    = { micro:"<50 employees", medium:"50–249 employees", large:"250+ employees" }[size] || size;
  const revLabel     = { small:"<€10M/yr", medium:"€10–50M/yr", large:">€50M/yr" }[revenue] || revenue;
  const budgetLabel  = { free:"€0 (free tools only)", low:"<€200/yr", mid:"€200–1400/yr", high:"€1400+/yr" }[budget] || budget;
  const roleLabel    = { ceo:"Owner/CEO/Board", it:"IT Manager/CTO/CISO", compliance:"Compliance Officer/Lawyer", cfo:"CFO/Finance Director" }[role] || role;

  const links  = toolLinks(lang);
  const ismsTool = pickIsmsTool(sector, budget);
  const ismsUrl  = links[ismsTool] || links.reglyze;
  const ismsName = { reglyze:"Reglyze", isms_online:"ISMS.online", secfix:"Secfix", sprinto:"Sprinto" }[ismsTool] || "Reglyze";

  const statusBlock = [
    `Registered with authority: ${registered}`,
    `Has ISMS/security policies: ${has_isms}`,
    `Has cybersecurity training: ${has_training}`,
    `Has cyber insurance: ${has_insurance}`,
    `Compliance score: ${score}/10`,
    `Missing: ${missing.length > 0 ? missing.join(", ") : "nothing — already compliant"}`,
  ].join("\n");

  const missingInstructions = missing.length === 0
    ? "The company is already compliant on key measures. Focus on optimization and ISO 27001 certification path."
    : `Generate TODAY/TOMORROW/DAY 3 actions ONLY for what is missing: ${missing.join(", ")}.
       Skip actions for things they already have.
       Each action must include: specific tool name, direct URL, realistic time estimate.`;

  return `Respond entirely in ${LANG}. Output ONLY HTML — no markdown, no code blocks, no commentary.

You are a NIS2 compliance expert generating a personalized 3-day compliance sprint report.

COMPANY PROFILE:
- Sector: ${sectorLabel}
- Size: ${sizeLabel}
- Revenue: ${revLabel}
- Budget: ${budgetLabel}
- Role of person reading this: ${roleLabel}

CURRENT COMPLIANCE STATUS:
${statusBlock}

RECOMMENDED ISMS TOOL FOR THIS PROFILE: ${ismsName} (${ismsUrl})
TRAINING TOOL: KnowBe4 (${links.knowbe4})
INSURANCE: Hiscox Cyber (${links.hiscox})
PASSWORD MANAGER: 1Password (${links.onepassword})
PEN TESTING: Cobalt.io (${links.cobalt})
ISO CERTIFICATION: BSI Group (${links.bsi})

INSTRUCTIONS: ${missingInstructions}

Generate ONLY the inner report body using these exact HTML sections.
Each section wraps in <div class="report-section">.
Use ONLY inline styles. No CSS classes except report-section and report-sprint-action.

SECTION 1 — Compliance Summary (2-3 sentences specific to their profile and score):
<div class="report-section">
  <h2>[Summary heading in ${LANG}]</h2>
  [2-3 sentences. Be specific: name their sector, their score, what it means legally.]
</div>

SECTION 2 — TODAY (actions for missing items, each under 30 min):
<div class="report-section">
  <h2>🏃 [TODAY heading — e.g. "Zrób DZIŚ — ok. 90 minut łącznie"]</h2>
  [For each missing item, one sprint-action div:]
  <div class="report-sprint-action">
    <div style="font-size:.75rem;color:#6b7280;margin-bottom:.25rem;">[Step N · X min · cost]</div>
    <h3 style="font-size:1rem;margin:.25rem 0;">[Action title]</h3>
    <p style="font-size:.85rem;margin:.25rem 0 .5rem;">[1-2 sentences WHY and WHAT exactly to do]</p>
    <a href="[URL]" style="display:inline-block;padding:.4rem .85rem;background:#1a1a2e;color:#fff;border-radius:6px;font-size:.82rem;font-weight:600;text-decoration:none;" target="_blank" rel="nofollow noopener">[CTA text →]</a>
  </div>
  [Repeat for each missing item]
</div>

SECTION 3 — THIS WEEK (deeper implementation, 1-3 items):
<div class="report-section">
  <h2>📅 [THIS WEEK heading]</h2>
  [1-3 specific follow-up actions for the same tools they started today.
   E.g.: "Complete risk assessment in ${ismsName} (2-3 hours)", "Have management board formally approve security policies", "Run first phishing simulation in KnowBe4"]
  [Same sprint-action div format]
</div>

SECTION 4 — BOOK NOW (longer-term, schedule today):
<div class="report-section">
  <h2>📆 [BOOK NOW heading]</h2>
  <p>[Brief intro — these take weeks but book TODAY]</p>
  [2 items: pen test + ISO 27001 certification]
  [sprint-action format with Cobalt.io and BSI URLs]
</div>

SECTION 5 — WHO DOES WHAT (role-specific table for: ${roleLabel}):
<div class="report-section">
  <h2>👥 [WHO DOES WHAT heading]</h2>
  <p>[1 sentence intro]</p>
  <table style="width:100%;border-collapse:collapse;font-size:.85rem;">
    <tr style="background:#f3f4f6;">
      <th style="padding:.5rem;text-align:left;border:1px solid #e5e7eb;">[Task col]</th>
      <th style="padding:.5rem;text-align:left;border:1px solid #e5e7eb;">[Who col]</th>
      <th style="padding:.5rem;text-align:left;border:1px solid #e5e7eb;">[When col]</th>
    </tr>
    [4-6 rows covering all missing items, assign to CEO/IT/HR/CFO as appropriate]
  </table>
</div>

Rules:
- Every tool recommendation must use the exact URLs provided above
- Be specific: name exact sections to fill in, exact menus to click where you know them
- Time estimates must be realistic (registration: 30min, ISMS setup: 20min, training deploy: 30min)
- Do NOT include generic advice — every sentence must be specific to this company's profile
- Do NOT wrap output in markdown code blocks`;
}

// ── AI prompt builder (for Claude/ChatGPT/Gemini buttons) ────────────────────
function buildAiPrompt({ sector, size, revenue, registered, has_isms,
    has_training, has_insurance, role, score, missing, lang, domain }) {

  const COUNTRY_AUTHORITY = {
    pl: "CERT Polska (cert.pl), under the KSC Act",
    cs: "NUKIB (nukib.cz), under the Czech NIS2 transposition",
    sk: "NBÚ (nbu.gov.sk), under the Slovak NIS2 transposition",
    ro: "DNSC (dnsc.ro), under the Romanian NIS2 transposition",
    hr: "ZSIS (zsis.hr), under the Croatian NIS2 transposition",
    hu: "SZTFH (nmhh.hu), under the Hungarian NIS2 transposition",
    it: "ACN (acn.gov.it), under the Italian NIS2 transposition",
  }[lang] || "the national cybersecurity authority";

  const sectorLabel  = { annex1:"essential entity (Annex I)", annex2:"important entity (Annex II)", other:"outside mandatory scope" }[sector] || sector;
  const sizeLabel    = { micro:"under 50 employees", medium:"50–249 employees", large:"250+ employees" }[size] || size;
  const revLabel     = { small:"under €10M/year", medium:"€10–50M/year", large:"over €50M/year" }[revenue] || revenue;
  const roleLabel    = { ceo:"Owner/CEO", it:"IT Manager/CISO", compliance:"Compliance Officer", cfo:"CFO" }[role] || role;
  const ismsTool     = pickIsmsTool(sector, "low");
  const ismsName     = { reglyze:"Reglyze (reglyze.com)", isms_online:"ISMS.online (isms.online)", secfix:"Secfix (secfix.com)" }[ismsTool] || "Reglyze";

  const statusLines = [
    `- Registered with authority: ${registered === "yes" ? "YES" : "NOT YET — URGENT"}`,
    `- ISMS / security policy system: ${has_isms === "yes" ? "in place" : has_isms === "partial" ? "partially in place" : "NOT in place"}`,
    `- Security awareness training: ${has_training === "yes" ? "deployed" : "NOT deployed"}`,
    `- Cyber insurance: ${has_insurance === "yes" ? "in place" : "NOT in place"}`,
    `- NIS2 compliance score: ${score}/10`,
    `- Missing steps: ${missing.length > 0 ? missing.join(", ") : "none — fully compliant on assessed measures"}`,
  ].join("\n");

  return `I am a ${roleLabel} at a company classified as an NIS2 ${sectorLabel} with ${sizeLabel} and ${revLabel} annual revenue.

My NIS2 compliance status:
${statusLines}

I am registered with ${COUNTRY_AUTHORITY}.
I am starting with ${ismsName} as my ISMS platform (just signed up or about to sign up for the free plan).

Please guide me step by step to achieve full NIS2 compliance. Start with the single most urgent action and walk me through exactly:
1. What to do
2. Where to go (exact URL, menu, or form)
3. What to fill in or configure
4. How long it takes

After completing each step, tell me what the next step is.

Be specific and actionable. Do not give generic compliance advice — I need exact instructions for my situation.`;
}

// ── Wrap report in full HTML document ─────────────────────────────────────────
function wrapReport(inner, aiPrompt, { sector, size, score, lang }) {
  const scoreColor = score <= 3 ? "#dc2626" : score <= 6 ? "#d97706" : "#16a34a";
  const pct        = Math.round((score / 10) * 100);

  const TITLES = {
    pl: "Twój plan zgodności NIS2/KSC",
    cs: "Váš plán souladu NIS2",
    sk: "Váš plán súladu NIS2",
    ro: "Planul dvs. de conformitate NIS2",
    hr: "Vaš plan usklađenosti NIS2",
    hu: "Az Ön NIS2 megfelelési terve",
    it: "Il tuo piano di conformità NIS2",
  };
  const AI_HEADINGS = {
    pl: "🤖 Twój asystent AI — jedno kliknięcie",
    cs: "🤖 Váš AI asistent — jedno kliknutí",
    sk: "🤖 Váš AI asistent — jedno kliknutie",
    ro: "🤖 Asistentul dvs. AI — un singur clic",
    hr: "🤖 Vaš AI asistent — jedan klik",
    hu: "🤖 Az Ön AI asisztense — egy kattintás",
    it: "🤖 Il tuo assistente AI — un clic",
  };
  const AI_DESCS = {
    pl: "Prompt jest już spersonalizowany dla Twojej firmy. Kliknij jedno z poniższych, aby otworzyć czat AI z gotowym pytaniem. Dla ChatGPT, Gemini i Perplexity prompt jest kopiowany do schowka — wklej go po otwarciu (Ctrl+V).",
    cs: "Prompt je personalizovaný pro vaši firmu. Klikněte na jedno z níže uvedených pro otevření AI chatu s připravenou otázkou.",
    sk: "Prompt je personalizovaný pre vašu firmu. Kliknite na jedno z nižšie uvedených pre otvorenie AI chatu.",
    ro: "Promptul este personalizat pentru compania dvs. Faceți clic mai jos pentru a deschide chat-ul AI.",
    hr: "Prompt je personaliziran za vašu tvrtku. Kliknite ispod za otvaranje AI chata.",
    hu: "A prompt az Ön cégére van személyre szabva. Kattintson alább az AI chat megnyitásához.",
    it: "Il prompt è personalizzato per la tua azienda. Clicca sotto per aprire la chat AI.",
  };
  const COPY_NOTES = {
    pl: "Dla ChatGPT, Gemini i Perplexity: prompt jest kopiowany do schowka — wklej go (Ctrl+V) po otwarciu.",
    cs: "Pro ChatGPT, Gemini a Perplexity: prompt je zkopírován do schránky — vložte jej (Ctrl+V) po otevření.",
    sk: "Pre ChatGPT, Gemini a Perplexity: prompt je skopírovaný do schránky — vložte ho (Ctrl+V) po otvorení.",
    ro: "Pentru ChatGPT, Gemini și Perplexity: promptul este copiat în clipboard — lipiți-l (Ctrl+V) după deschidere.",
    hr: "Za ChatGPT, Gemini i Perplexity: prompt se kopira u međuspremnik — zalijepite ga (Ctrl+V) nakon otvaranja.",
    hu: "A ChatGPT, Gemini és Perplexity esetén: a prompt a vágólapra másolódik — illessze be (Ctrl+V) megnyitás után.",
    it: "Per ChatGPT, Gemini e Perplexity: il prompt viene copiato negli appunti — incollalo (Ctrl+V) dopo l'apertura.",
  };

  const title     = TITLES[lang]       || TITLES.pl;
  const aiHeading = AI_HEADINGS[lang]  || AI_HEADINGS.pl;
  const aiDesc    = AI_DESCS[lang]     || AI_DESCS.pl;
  const copyNote  = COPY_NOTES[lang]   || COPY_NOTES.pl;

  const encodedPrompt = encodeURIComponent(aiPrompt);
  const claudeUrl     = `https://claude.ai/new?q=${encodedPrompt}`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#f3f4f6;color:#1a1a2e;line-height:1.6}
    .wrapper{max-width:720px;margin:0 auto;padding:1.5rem 1rem 4rem}
    .report-header{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:#fff;border-radius:12px;padding:2rem;margin-bottom:1.5rem}
    .score-bar-bg{height:10px;background:rgba(255,255,255,.2);border-radius:99px;overflow:hidden;margin:.75rem 0}
    .score-bar-fill{height:100%;border-radius:99px;background:${scoreColor}}
    .report-section{background:#fff;border-radius:10px;padding:1.5rem;margin-bottom:1rem;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .report-section h2{font-size:1.1rem;margin-bottom:1rem;color:#1a1a2e}
    .report-section h3{font-size:.95rem;margin:.25rem 0}
    .report-section p{font-size:.88rem;color:#374151;line-height:1.6}
    .report-sprint-action{border:1px solid #e5e7eb;border-radius:8px;padding:1rem;margin-bottom:.75rem}
    .report-sprint-action:last-child{margin-bottom:0}
    table{width:100%;border-collapse:collapse;font-size:.85rem}
    th,td{padding:.5rem .75rem;border:1px solid #e5e7eb;text-align:left}
    th{background:#f9fafb;font-weight:600}
    .ai-section{background:#1a1a2e;color:#fff;border-radius:10px;padding:1.5rem;margin-bottom:1rem}
    .ai-section h2{color:#fff;font-size:1.1rem;margin-bottom:.5rem}
    .ai-section p{color:rgba(255,255,255,.75);font-size:.85rem}
    .ai-prompt-area{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:.75rem;margin:1rem 0;font-size:.78rem;line-height:1.6;color:rgba(255,255,255,.9);white-space:pre-wrap;font-family:monospace;max-height:200px;overflow-y:auto}
    .ai-buttons{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.75rem}
    .ai-btn{display:inline-flex;align-items:center;gap:.4rem;padding:.5rem 1rem;border-radius:8px;font-size:.82rem;font-weight:600;text-decoration:none;cursor:pointer;border:none;font-family:inherit}
    .ai-btn-claude{background:#D97706;color:#fff}
    .ai-btn-chatgpt{background:#10a37f;color:#fff}
    .ai-btn-gemini{background:#4285F4;color:#fff}
    .ai-btn-perplexity{background:#6366f1;color:#fff}
    .copy-note{font-size:.72rem;color:rgba(255,255,255,.5);margin-top:.5rem}
    .toast{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#1a1a2e;color:#fff;padding:.5rem 1.25rem;border-radius:8px;font-size:.82rem;font-weight:600;z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none}
    .toast.show{opacity:1}
    @media print{.ai-buttons,.toast{display:none}}
  </style>
</head>
<body>
<div class="wrapper">

  <div class="report-header">
    <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.6);margin-bottom:.5rem;">
      NIS2 / KSC — ${new Date().toLocaleDateString(lang === "pl" ? "pl-PL" : lang + "-" + lang.toUpperCase())}
    </div>
    <h1 style="font-size:1.4rem;font-weight:800;margin-bottom:.75rem;">${title}</h1>
    <div style="display:flex;align-items:center;gap:1rem;">
      <div>
        <span style="font-size:2.5rem;font-weight:800;color:${scoreColor}">${score}</span>
        <span style="font-size:1rem;color:rgba(255,255,255,.5)">/10</span>
      </div>
      <div style="flex:1">
        <div class="score-bar-bg">
          <div class="score-bar-fill" style="width:${pct}%"></div>
        </div>
        <div style="font-size:.78rem;color:rgba(255,255,255,.6);">${pct}% compliant</div>
      </div>
    </div>
  </div>

  ${inner}

  <div class="ai-section">
    <h2>${aiHeading}</h2>
    <p style="margin-bottom:.5rem;">${aiDesc}</p>
    <div class="ai-prompt-area" id="ai-prompt-text">${aiPrompt.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
    <div class="ai-buttons">
      <a href="${claudeUrl}" target="_blank" rel="noopener" class="ai-btn ai-btn-claude">
        ◆ Claude (1 klik)
      </a>
      <button onclick="copyAndOpen('https://chatgpt.com/')" class="ai-btn ai-btn-chatgpt">
        ● ChatGPT
      </button>
      <button onclick="copyAndOpen('https://gemini.google.com/app')" class="ai-btn ai-btn-gemini">
        ✦ Gemini
      </button>
      <button onclick="copyAndOpen('https://www.perplexity.ai/')" class="ai-btn ai-btn-perplexity">
        ⊕ Perplexity
      </button>
    </div>
    <div class="copy-note">${copyNote}</div>
  </div>

  <div style="text-align:center;font-size:.75rem;color:#9ca3af;margin-top:1.5rem;">
    Ten raport ma charakter informacyjny i nie stanowi porady prawnej. | NIS2-Narzedzia.pl
  </div>
</div>

<div class="toast" id="toast">Prompt skopiowany! Wklej (Ctrl+V) w oknie czatu.</div>

<script>
function copyAndOpen(url) {
  const text = document.getElementById('ai-prompt-text').innerText;
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
  });
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
  setTimeout(() => window.open(url, '_blank'), 200);
}
</script>
</body>
</html>`;
}

// ── Send via Resend ───────────────────────────────────────────────────────────
async function sendReportEmail({ email, html, lang, score, env }) {
  const subjects = {
    pl: `Twój plan NIS2 — wynik ${score}/10 | 3-dniowy sprint do zgodności`,
    cs: `Váš plán NIS2 — skóre ${score}/10`,
    sk: `Váš plán NIS2 — skóre ${score}/10`,
    ro: `Planul dvs. NIS2 — scor ${score}/10`,
    hr: `Vaš plan NIS2 — ocjena ${score}/10`,
    hu: `Az Ön NIS2 terve — pontszám ${score}/10`,
    it: `Il tuo piano NIS2 — punteggio ${score}/10`,
  };
  const subject = subjects[lang] || subjects.pl;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to:   email,
      subject,
      html,
    }),
  });
}

// ── Helper ────────────────────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

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
