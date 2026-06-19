/* KSC/NIS2 Compliance Quiz v2 — quiz.js */

(function () {
  "use strict";

  const REPORT_ENDPOINT    = "/generate-report";
  const SUBSCRIBE_ENDPOINT = "/subscribe";

  // ── Affiliate + tool links ──────────────────────────────────────────────────
  const LINKS = {
    reglyze:      { name: "Reglyze",      url: "https://reglyze.com",         review: "narzedzia/reglyze.html" },
    secfix:       { name: "Secfix",       url: "https://secfix.com",          review: "narzedzia/secfix.html" },
    isms_online:  { name: "ISMS.online",  url: "https://isms.online",         review: "narzedzia/isms-online.html" },
    knowbe4:      { name: "KnowBe4",      url: "https://knowbe4.com",         review: "formazione-nis2.html" },
    hiscox:       { name: "Hiscox Cyber", url: "https://hiscox.it",           review: "assicurazione-cyber.html" },
    onepassword:  { name: "1Password",    url: "https://1password.com",       review: "narzedzia/1password.html" },
    nordlayer:    { name: "NordLayer",    url: "https://nordlayer.com",       review: "narzedzia/nordlayer.html" },
    cobalt:       { name: "Cobalt.io",    url: "https://cobalt.io",           review: "test-penetrazione.html" },
    bsi:          { name: "BSI ISO 27001",url: "https://bsigroup.com/pl-PL/", review: "certificazione-iso-27001.html" },
  };

  // ── Tool recommendation by sector + budget ─────────────────────────────────
  const ISMS_RECS = {
    "annex1:free":  "reglyze",   "annex1:low":   "isms_online",
    "annex1:mid":   "secfix",    "annex1:high":  "secfix",
    "annex2:free":  "reglyze",   "annex2:low":   "reglyze",
    "annex2:mid":   "isms_online","annex2:high":  "secfix",
    "other:free":   "reglyze",   "other:low":    "reglyze",
    "other:mid":    "reglyze",   "other:high":   "isms_online",
  };

  // ── State ──────────────────────────────────────────────────────────────────
  const state = {
    step: 0,
    answers: {},
    score: 0,
    missing: [],
    email: null,
  };

  // ── Questions ──────────────────────────────────────────────────────────────
  const questions = [
    {
      id: "sector",
      title: "In quale settore opera la tua azienda?",
      hint: "Seleziona il settore che descrive meglio l'attività principale.",
      options: [
        { value: "annex1", icon: "⚡", label: "Settore essenziale (Allegato I)",
          sub: "Energia, trasporti, bancario, finanza, sanità, acqua, infrastrutture digitali, pubblica amministrazione" },
        { value: "annex2", icon: "📦", label: "Settore importante (Allegato II)",
          sub: "Servizi postali, gestione rifiuti, chimica, alimentare, produzione industriale, fornitori di servizi digitali, PMI/IT" },
        { value: "other", icon: "🏗️", label: "Altro settore",
          sub: "Edilizia, commercio al dettaglio, ristorazione, istruzione privata, altri" },
      ]
    },
    {
      id: "size",
      title: "Quante persone impiega la tua azienda?",
      hint: "Inclusi tutti i dipendenti e collaboratori.",
      options: [
        { value: "micro",  icon: "👤", label: "Meno di 50 dipendenti",  sub: "Micro / piccola impresa" },
        { value: "medium", icon: "👥", label: "50–249 dipendenti",       sub: "Media impresa" },
        { value: "large",  icon: "🏢", label: "250 o più dipendenti",    sub: "Grande impresa" },
      ]
    },
    {
      id: "revenue",
      title: "Qual è il fatturato annuo della tua azienda?",
      hint: "Ricavi annui o totale di bilancio.",
      options: [
        { value: "small",  icon: "💶", label: "Meno di 10 milioni di EUR l'anno",  sub: "Micro / piccola impresa" },
        { value: "medium", icon: "💰", label: "10–50 milioni di EUR l'anno",        sub: "Media impresa" },
        { value: "large",  icon: "💎", label: "Oltre 50 milioni di EUR l'anno",     sub: "Grande impresa" },
      ]
    },
    {
      id: "budget",
      title: "Qual è il budget annuo per la conformità NIS2/D.Lgs. n. 138/2024?",
      hint: "Adatteremo gli strumenti alle tue possibilità finanziarie.",
      options: [
        { value: "free", icon: "🆓", label: "Cerco una soluzione gratuita", sub: "Piano gratuito o costo una tantum di implementazione" },
        { value: "low",  icon: "💵", label: "Fino a 200 € l'anno",          sub: "Strumento SaaS base" },
        { value: "mid",  icon: "💳", label: "200–600 € l'anno",             sub: "Piattaforma compliance completa" },
        { value: "high", icon: "🏦", label: "Oltre 600 € l'anno",           sub: "Soluzione enterprise" },
      ]
    },
    {
      id: "registered",
      title: "La tua azienda è già registrata presso l'ACN (acn.gov.it)?",
      hint: "Scadenza registrazione: secondo il recepimento italiano NIS2 (D.Lgs. 138/2024). È il primo obbligo.",
      options: [
        { value: "yes",  icon: "✅", label: "Sì, ci siamo già registrati", sub: "Auto-identificazione completata" },
        { value: "no",   icon: "❌", label: "No, non l'abbiamo ancora fatto", sub: "Priorità n. 1 — verifica la scadenza sul sito ACN" },
        { value: "unknown", icon: "❓", label: "Non so / non sono sicuro", sub: "Lo verifichiamo insieme" },
      ]
    },
    {
      id: "has_isms",
      title: "Hai implementato un sistema di gestione della sicurezza delle informazioni (ISMS)?",
      hint: "L'ISMS è un insieme di politiche, procedure e controlli di cybersicurezza — richiesto dall'Art. 21 NIS2.",
      options: [
        { value: "yes",     icon: "✅", label: "Sì, abbiamo un ISMS operativo",        sub: "Politiche e procedure di sicurezza documentate" },
        { value: "partial", icon: "🔄", label: "Siamo in fase di implementazione",      sub: "In corso — ma non ancora completato" },
        { value: "no",      icon: "❌", label: "No, non abbiamo nulla in questo ambito", sub: "Nessun sistema di gestione della sicurezza" },
      ]
    },
    {
      id: "has_training",
      title: "I dipendenti e il management hanno seguito formazione sulla cybersicurezza?",
      hint: "La formazione del management è un obbligo legale ai sensi dell'Art. 20 NIS2.",
      options: [
        { value: "yes", icon: "✅", label: "Sì, abbiamo formazione regolare",         sub: "Dipendenti e management sono formati" },
        { value: "no",  icon: "❌", label: "No, non abbiamo formazione in questo ambito", sub: "La formazione del management è un obbligo legale ai sensi del D.Lgs. n. 138/2024" },
      ]
    },
    {
      id: "has_insurance",
      title: "La tua azienda ha una polizza assicurativa contro i rischi informatici?",
      hint: "L'assicurazione cyber trasferisce il rischio residuale ed è parte della gestione del rischio NIS2.",
      options: [
        { value: "yes",     icon: "✅", label: "Sì, abbiamo un'assicurazione cyber",     sub: "Il rischio è coperto" },
        { value: "no",      icon: "❌", label: "No, non abbiamo un'assicurazione",        sub: "Un preventivo online richiede 20 minuti" },
        { value: "unknown", icon: "❓", label: "Non so / non ne ho mai sentito parlare",  sub: "Spieghiamo cos'è e quanto costa" },
      ]
    },
    {
      id: "role",
      title: "Qual è il tuo ruolo in azienda?",
      hint: "Adatteremo il piano alle tue responsabilità e ai tuoi poteri decisionali.",
      options: [
        { value: "ceo",        icon: "👔", label: "Titolare / CEO / Management", sub: "Sei responsabile delle decisioni e del budget" },
        { value: "it",         icon: "💻", label: "IT Manager / CTO / CISO",     sub: "Sei responsabile dell'implementazione tecnica" },
        { value: "compliance", icon: "📋", label: "Compliance / Legale",          sub: "Sei responsabile della conformità normativa" },
        { value: "cfo",        icon: "💰", label: "CFO / Direttore Finanziario",  sub: "Sei responsabile del budget e del rischio finanziario" },
      ]
    },
  ];

  const TOTAL = questions.length;

  // ── Score calculation ──────────────────────────────────────────────────────
  function computeScore() {
    const a = state.answers;
    let score = 2; // base: everyone has some basics
    const missing = [];

    if (a.registered === "yes")        { score += 2; }
    else                               { missing.push("registration"); }

    if (a.has_isms === "yes")          { score += 3; }
    else if (a.has_isms === "partial") { score += 1; missing.push("isms"); }
    else                               { missing.push("isms"); }

    if (a.has_training === "yes")      { score += 2; }
    else                               { missing.push("training"); }

    if (a.has_insurance === "yes")     { score += 1; }
    else                               { missing.push("insurance"); }

    score = Math.min(10, Math.max(1, score));
    state.score   = score;
    state.missing = missing;
    return { score, missing };
  }

  function computeScope() {
    const { sector, size, revenue } = state.answers;
    if (sector === "other") return "out";
    const isLarge  = size === "large"  || revenue === "large";
    const isMedium = !isLarge && (size === "medium" || revenue === "medium");
    if (sector === "annex1" && isLarge)           return "essential";
    if (sector === "annex1" && isMedium)          return "important";
    if (sector === "annex2" && (isLarge||isMedium)) return "important";
    return "check"; // small companies in scope sectors
  }

  // ── Today actions (client-side, shown on result screen immediately) ────────
  function buildTodayActions() {
    const missing   = state.missing;
    const sector    = state.answers.sector  || "annex2";
    const budget    = state.answers.budget  || "low";
    const ismsTool  = LINKS[ISMS_RECS[sector+":"+budget] || "reglyze"];
    const actions   = [];

    if (missing.includes("registration")) {
      actions.push({
        step: actions.length + 1,
        time: "30 min · gratuito",
        title: "Registra la tua azienda presso l'ACN",
        desc:  "Scadenza: secondo il recepimento italiano NIS2 (D.Lgs. 138/2024). Modulo di auto-identificazione online. È la tua priorità #1.",
        cta:   "Guida passo dopo passo →",
        url:   "registrazione-nis2.html",
        affiliate: false,
      });
    }

    if (missing.includes("isms")) {
      actions.push({
        step: actions.length + 1,
        time: "20 min · piano gratuito",
        title: "Avvia il sistema ISMS — " + ismsTool.name,
        desc:  "Il piano gratuito copre la valutazione completa dei gap NIS2. Dopo la registrazione: compila il questionario D.Lgs. n. 138/2024 integrato — l'AI genera le politiche automaticamente.",
        cta:   "Inizia a €0 → " + ismsTool.name,
        url:   ismsTool.url,
        affiliate: true,
        badge: "Raccomandazione #1",
      });
    }

    if (missing.includes("insurance")) {
      actions.push({
        step: actions.length + 1,
        time: "20 min · preventivo online",
        title: "Ottieni un'offerta di assicurazione cyber",
        desc:  "Il trasferimento del rischio è parte della gestione del rischio NIS2. Preventivo Hiscox: 20 minuti online, senza parlare con un agente.",
        cta:   "Verifica l'offerta Hiscox →",
        url:   LINKS.hiscox.url,
        affiliate: true,
      });
    }

    if (missing.includes("training")) {
      actions.push({
        step: actions.length + 1,
        time: "30 min · trial gratuito 14 giorni",
        title: "Avvia la formazione sulla cybersicurezza — KnowBe4",
        desc:  "La formazione del management è un obbligo legale (Art. 20 D.Lgs. n. 138/2024). KnowBe4: piattaforma online, primo modulo inviato al team entro 24h.",
        cta:   "Inizia il trial gratuito →",
        url:   LINKS.knowbe4.url,
        affiliate: true,
      });
    }

    // Always suggest 1Password if no training (implies basics missing)
    if (missing.includes("isms") && actions.length < 5) {
      actions.push({
        step: actions.length + 1,
        time: "30 min · trial gratuito 14 giorni",
        title: "Implementa un gestore di password + MFA — 1Password",
        desc:  "L'autenticazione a più fattori (MFA) è richiesta dall'Art. 21(j) D.Lgs. n. 138/2024. 1Password Business: configurazione in 30 minuti, distribuzione al team nella stessa giornata.",
        cta:   "Inizia il trial gratuito →",
        url:   LINKS.onepassword.url,
        affiliate: true,
      });
    }

    return actions.slice(0, 4); // max 4 today actions
  }

  // ── GA4 helper ─────────────────────────────────────────────────────────────
  function track(event, params) {
    if (typeof gtag === "function") gtag("event", event, params || {});
  }

  // ── Render: question step ──────────────────────────────────────────────────
  function renderStep() {
    const q   = questions[state.step];
    const el  = document.getElementById("quiz-container");
    if (!el) return;

    const pct    = Math.round((state.step / TOTAL) * 100);
    const isLast = state.step === TOTAL - 1;

    el.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-progress">
          <div class="quiz-progress__bar" style="width:${pct}%"></div>
        </div>
        <p class="text-sm text-gray" style="margin-bottom:.25rem;">Domanda ${state.step + 1} di ${TOTAL}</p>
        <h3>${q.title}</h3>
        <p style="color:var(--gray-500);font-size:.9rem;margin-bottom:1rem;">${q.hint}</p>
        <div class="quiz-options">
          ${q.options.map(opt => `
            <button class="quiz-option${state.answers[q.id] === opt.value ? " selected" : ""}"
                    data-value="${opt.value}" type="button">
              <span class="quiz-option__icon">${opt.icon}</span>
              <span>
                <span class="quiz-option__text">${opt.label}</span>
                <span class="quiz-option__sub">${opt.sub}</span>
              </span>
            </button>
          `).join("")}
        </div>
        <div class="quiz-nav">
          ${state.step > 0
            ? `<button class="btn btn--outline btn--sm" id="quiz-back">← Indietro</button>`
            : `<span></span>`}
          <button class="btn btn--primary btn--sm" id="quiz-next"
                  ${state.answers[q.id] ? "" : "disabled"}>
            ${isLast ? "Calcola il mio punteggio →" : "Avanti →"}
          </button>
        </div>
      </div>`;

    el.querySelectorAll(".quiz-option").forEach(btn => {
      btn.addEventListener("click", () => {
        state.answers[q.id] = btn.dataset.value;
        el.querySelectorAll(".quiz-option").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        el.querySelector("#quiz-next").removeAttribute("disabled");
        track("quiz_answer", { question: q.id, answer: btn.dataset.value });
        // Auto-advance on click for faster UX
        setTimeout(() => {
          if (isLast) { computeScore(); renderScoreGate(); }
          else { state.step++; renderStep(); }
        }, 280);
      });
    });

    el.querySelector("#quiz-back")?.addEventListener("click", () => {
      state.step--;
      renderStep();
    });

    el.querySelector("#quiz-next")?.addEventListener("click", () => {
      if (!state.answers[q.id]) return;
      if (isLast) { computeScore(); renderScoreGate(); }
      else { state.step++; renderStep(); }
    });
  }

  // ── Render: score + email gate ─────────────────────────────────────────────
  function renderScoreGate() {
    const el = document.getElementById("quiz-container");
    if (!el) return;

    const { score, missing } = state;
    const pct    = Math.round((score / 10) * 100);
    const scope  = computeScope();

    const scoreColor = score <= 3 ? "#dc2626"
                     : score <= 6 ? "#d97706"
                     : "#16a34a";

    const scopeMsg = {
      essential: "La tua azienda è un <strong>soggetto essenziale NIS2</strong> — il livello più alto di requisiti.",
      important:  "La tua azienda è un <strong>soggetto importante NIS2</strong> — devi soddisfare i requisiti NIS2.",
      check:      "La tua azienda potrebbe essere soggetta al D.Lgs. n. 138/2024 — verifica le eccezioni per le piccole imprese.",
      out:        "La tua azienda probabilmente non è soggetta al D.Lgs. n. 138/2024 — è comunque utile implementare le basi.",
    }[scope] || "";

    const gapText = missing.length === 0
      ? "Congratulazioni — hai implementato tutte le misure di sicurezza fondamentali!"
      : `Mancano <strong>${missing.length}</strong> misure di sicurezza fondamentali. Puoi implementare la maggior parte in 3 giorni.`;

    el.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-progress">
          <div class="quiz-progress__bar" style="width:100%"></div>
        </div>

        <div style="text-align:center;padding:1rem 0 .5rem;">
          <div style="font-size:.8rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem;">
            Il tuo punteggio di conformità NIS2
          </div>
          <div style="font-size:3.5rem;font-weight:800;color:${scoreColor};line-height:1;">
            ${score}<span style="font-size:1.5rem;color:var(--gray-400);font-weight:500;">/10</span>
          </div>
          <div style="margin:.75rem auto;max-width:280px;height:10px;background:#e5e7eb;border-radius:99px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${scoreColor};border-radius:99px;transition:width 1s;"></div>
          </div>
          <p style="font-size:.9rem;color:var(--gray-600);">${scopeMsg}</p>
          <p style="font-size:.92rem;">${gapText}</p>
        </div>

        <div style="background:#f0f7ff;border-radius:12px;padding:1.25rem;margin:1rem 0;">
          <p style="font-size:.95rem;font-weight:700;color:#1a1a2e;margin:0 0 .35rem;">
            📬 Ricevi il tuo piano d'azione in 3 giorni
          </p>
          <p style="font-size:.82rem;color:#555;margin:0 0 .75rem;">
            Il tuo piano personalizzato: cosa fare oggi, domani e questa settimana.
            Link agli strumenti pronti all'uso + prompt AI per Claude / ChatGPT / Gemini.
          </p>
          <form id="score-email-form" style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <input type="email" name="email" placeholder="tua@email.it" required
                   style="flex:1;min-width:180px;padding:.6rem .9rem;border:1px solid #d1d5db;border-radius:8px;font-size:.95rem;">
            <button type="submit" class="btn btn--primary">Inviami il piano →</button>
          </form>
          <p style="font-size:.75rem;color:#9ca3af;margin:.5rem 0 0;">Niente spam. Una sola email con il piano + promemoria opzionali.</p>
        </div>

        <button id="quiz-skip-email" type="button"
                style="background:none;border:none;color:var(--gray-400);font-size:.8rem;cursor:pointer;width:100%;text-align:center;padding:.25rem 0;">
          Mostra solo il risultato, senza piano →
        </button>
      </div>`;

    track("quiz_score_shown", { score, missing: missing.join(","), scope });

    document.getElementById("score-email-form")?.addEventListener("submit", e => {
      e.preventDefault();
      const email = e.target.querySelector("input[type=email]").value.trim();
      if (!email) return;
      const btn = e.target.querySelector("button");
      btn.disabled = true;
      btn.textContent = "Invio in corso...";
      state.email = email;
      _submitEmailAndReport(email, () => renderResult(true));
    });

    document.getElementById("quiz-skip-email")?.addEventListener("click", () => {
      track("quiz_email_skipped");
      renderResult(false);
    });
  }

  // ── Submit email to Beehiiv + trigger report ───────────────────────────────
  function _submitEmailAndReport(email, onDone) {
    const { score, missing, answers } = state;

    // Score tier tag
    const scoreTier = score <= 3 ? "score_low" : score <= 6 ? "score_mid" : "score_high";
    const tags = [scoreTier,
      "sector_" + (answers.sector || "unknown"),
      "role_"   + (answers.role   || "unknown"),
      ...(missing.includes("registration") ? ["missing_registration"] : []),
      ...(missing.includes("isms")         ? ["missing_isms"]         : []),
      ...(missing.includes("training")     ? ["missing_training"]     : []),
      ...(missing.includes("insurance")    ? ["missing_insurance"]    : []),
    ];

    // Call both endpoints in parallel
    const subscribeCall = fetch(SUBSCRIBE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        source: "quiz_score_gate",
        tags,
        quiz_answers: {
          sector: answers.sector, size: answers.size, revenue: answers.revenue,
          budget: answers.budget, registered: answers.registered,
          has_isms: answers.has_isms, has_training: answers.has_training,
          has_insurance: answers.has_insurance, role: answers.role,
          score,
        },
      }),
    }).catch(() => {});

    const reportCall = fetch(REPORT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sector:        answers.sector,
        size:          answers.size,
        revenue:       answers.revenue,
        budget:        answers.budget,
        registered:    answers.registered,
        has_isms:      answers.has_isms,
        has_training:  answers.has_training,
        has_insurance: answers.has_insurance,
        role:          answers.role,
        score,
        missing,
        email,
        lang:   document.documentElement.lang || "it",
        domain: window.location.hostname,
      }),
    }).catch(() => {});

    Promise.allSettled([subscribeCall, reportCall]).then(() => {
      track("quiz_completed", { score, sector: answers.sector, email_captured: true });
      if (onDone) onDone();
    });
  }

  // ── Render: result with today-actions ──────────────────────────────────────
  function renderResult(emailCaptured) {
    const el = document.getElementById("quiz-container");
    if (!el) return;

    const { score, missing, answers } = state;
    const scope    = computeScope();
    const actions  = buildTodayActions();
    const pct      = Math.round((score / 10) * 100);
    const scoreColor = score <= 3 ? "#dc2626" : score <= 6 ? "#d97706" : "#16a34a";

    const scopeBadge = {
      essential: { text: "🚨 Soggetto essenziale",  color: "#fee2e2", tc: "#991b1b" },
      important:  { text: "⚠️ Soggetto importante", color: "#fefce8", tc: "#854d0e" },
      check:      { text: "🔍 Verifica le eccezioni", color: "#fefce8", tc: "#854d0e" },
      out:        { text: "✅ Probabilmente fuori ambito NIS2", color: "#dcfce7", tc: "#166534" },
    }[scope] || { text: "NIS2", color: "#e5e7eb", tc: "#374151" };

    function actionCard(a) {
      const isAffiliate = a.affiliate;
      return `
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:1rem 1.1rem;margin-bottom:.75rem;${isAffiliate ? "border-left:3px solid var(--navy);" : ""}">
          <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem;">
            <span style="background:var(--navy);color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;flex-shrink:0;">${a.step}</span>
            <span style="font-size:.75rem;color:var(--gray-500);">${a.time}</span>
            ${isAffiliate && a.badge ? `<span style="background:#dcfce7;color:#166534;font-size:.68rem;font-weight:700;padding:.1rem .45rem;border-radius:4px;">${a.badge}</span>` : ""}
          </div>
          <div style="font-weight:700;font-size:.95rem;margin-bottom:.3rem;">${a.title}</div>
          <div style="font-size:.82rem;color:#555;margin-bottom:.6rem;">${a.desc}</div>
          <a href="${a.url}" ${isAffiliate ? 'target="_blank" rel="nofollow noopener"' : ''}
             style="display:inline-block;padding:.45rem .9rem;background:var(--navy);color:#fff;border-radius:6px;font-size:.82rem;font-weight:600;text-decoration:none;">
            ${a.cta}
          </a>
        </div>`;
    }

    const reskipBlock = missing.length === 0
      ? `<div style="background:#dcfce7;border-radius:10px;padding:1rem;text-align:center;margin-bottom:1rem;">
           <strong>🎉 La tua azienda è in ottima forma!</strong><br>
           <span style="font-size:.85rem;">Hai implementato tutte le misure fondamentali NIS2. Valuta la certificazione ISO 27001 come prova di conformità.</span>
           <br><a href="certificazione-iso-27001.html" style="font-size:.82rem;color:var(--navy);font-weight:700;">Scopri di più su ISO 27001 →</a>
         </div>`
      : actions.map(actionCard).join("");

    el.innerHTML = `
      <div class="quiz-card">

        ${emailCaptured
          ? `<div style="background:#dcfce7;border-radius:8px;padding:.6rem 1rem;font-size:.82rem;color:#166534;font-weight:600;margin-bottom:1rem;text-align:center;">
               ✅ Piano inviato a ${state.email || "la tua email"} — controlla la tua casella di posta
             </div>`
          : ""}

        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;">
          <div style="text-align:center;flex-shrink:0;">
            <div style="font-size:2.5rem;font-weight:800;color:${scoreColor};line-height:1;">
              ${score}<span style="font-size:1rem;color:var(--gray-400);font-weight:500;">/10</span>
            </div>
            <div style="font-size:.7rem;color:var(--gray-500);">Punteggio NIS2</div>
          </div>
          <div style="flex:1;min-width:140px;">
            <div style="height:8px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin-bottom:.35rem;">
              <div style="height:100%;width:${pct}%;background:${scoreColor};border-radius:99px;"></div>
            </div>
            <span style="display:inline-block;padding:.2rem .6rem;border-radius:12px;font-size:.75rem;font-weight:700;background:${scopeBadge.color};color:${scopeBadge.tc};">
              ${scopeBadge.text}
            </span>
          </div>
        </div>

        <h3 style="font-size:1.05rem;margin-bottom:.35rem;">
          ${missing.length > 0
            ? `🏃 Da fare OGGI — circa ~${Math.min(120, missing.length * 30)} minuti in totale`
            : "Il tuo stato NIS2"}
        </h3>
        <p style="font-size:.82rem;color:var(--gray-500);margin-bottom:1rem;">
          ${missing.length > 0
            ? `${missing.length} passaggi mancanti. Puoi completare quelli indicati oggi.`
            : "Tutte le misure fondamentali sono in atto."}
        </p>

        ${reskipBlock}

        ${missing.length > 0 ? `
          <div style="border-top:1px solid #e5e7eb;padding-top:1rem;margin-top:.5rem;">
            <p style="font-size:.78rem;color:var(--gray-500);margin-bottom:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">
              Prossimi passi (pianifica le date)
            </p>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
              <a href="test-penetrazione.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🔍 Test di penetrazione
              </a>
              <a href="certificazione-iso-27001.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🏅 Certificazione ISO 27001
              </a>
              <a href="sicurezza-catena-fornitura.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🔗 Sicurezza della catena di fornitura
              </a>
            </div>
          </div>` : ""}

        <div style="margin-top:1.25rem;display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn--outline btn--sm" id="quiz-restart">← Ricomincia</button>
          <a href="porownanie.html" class="btn btn--primary btn--sm">Confronta gli strumenti NIS2 →</a>
        </div>

        ${!emailCaptured ? `
          <div style="margin-top:1rem;background:#f0f7ff;border-radius:8px;padding:.85rem;text-align:center;">
            <p style="font-size:.82rem;margin:0 0 .5rem;"><strong>Ricevi il piano completo via email</strong> con prompt AI e link agli strumenti</p>
            <form id="late-email-form" style="display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;">
              <input type="email" placeholder="tua@email.it" required
                     style="flex:1;min-width:160px;padding:.45rem .75rem;border:1px solid #d1d5db;border-radius:6px;font-size:.85rem;">
              <button type="submit" class="btn btn--primary btn--sm">Invia →</button>
            </form>
          </div>` : ""}
      </div>`;

    document.getElementById("quiz-restart")?.addEventListener("click", () => {
      state.step = 0; state.answers = {}; state.score = 0;
      state.missing = []; state.email = null;
      try { history.replaceState(null, "", window.location.pathname); } catch (e) {}
      renderStep();
    });

    document.getElementById("late-email-form")?.addEventListener("submit", e => {
      e.preventDefault();
      const email = e.target.querySelector("input[type=email]").value.trim();
      if (!email) return;
      const btn = e.target.querySelector("button");
      btn.disabled = true; btn.textContent = "Invio in corso...";
      state.email = email;
      _submitEmailAndReport(email, () => {
        e.target.parentElement.innerHTML =
          `<p style="font-size:.82rem;color:#166534;font-weight:700;">✅ Inviato a ${email}</p>`;
      });
    });

    track("quiz_result_shown", { score, scope, email_captured: emailCaptured });
  }

  // ── FAQ accordion ──────────────────────────────────────────────────────────
  function initFaq() {
    document.querySelectorAll(".faq-question").forEach(btn => {
      btn.addEventListener("click", () => {
        const item   = btn.closest(".faq-item");
        const isOpen = item.classList.contains("open");
        document.querySelectorAll(".faq-item.open").forEach(i => i.classList.remove("open"));
        if (!isOpen) item.classList.add("open");
      });
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("quiz-container");
    if (container) renderStep();
    initFaq();
  });

})();