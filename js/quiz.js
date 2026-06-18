/* KSC/NIS2 Eligibility Quiz — quiz.js */

(function () {
  "use strict";

  // ── Config ─────────────────────────────────────────────────────────────────
  const FORM_ENDPOINT = "/subscribe";

  // ── Tools registry ─────────────────────────────────────────────────────────
  const TOOLS = {
    reglyze: {
      name: "Reglyze",
      tagline: "Najlepsze dla MŚP bez CISO — start za €0",
      price: "€0–490/rok",
      badge: "Nasz faworyt #1",
      badgeFeatured: true,
      reviewUrl: "narzedzia/reglyze.html",
      vendorUrl: "https://reglyze.com"
    },
    secfix: {
      name: "Secfix",
      tagline: "ISO 27001 + NIS2 w jednej platformie",
      price: "Wycena indywidualna",
      badge: "Certyfikacja ISO",
      badgeFeatured: false,
      reviewUrl: "narzedzia/secfix.html",
      vendorUrl: "https://secfix.com"
    },
    isms_online: {
      name: "ISMS.online",
      tagline: "Pełny ISMS w przeglądarce, platforma EU-native",
      price: "€499/rok",
      badge: "Mid-market",
      badgeFeatured: false,
      reviewUrl: "narzedzia/isms-online.html",
      vendorUrl: "https://isms.online"
    },
    sprinto: {
      name: "Sprinto",
      tagline: "Najszybsze wdrożenie compliance na rynku",
      price: "Wycena indywidualna",
      badge: "Szybkie wdrożenie",
      badgeFeatured: false,
      reviewUrl: "narzedzia/sprinto.html",
      vendorUrl: "https://sprinto.com"
    },
    vanta: {
      name: "Vanta",
      tagline: "Lider enterprise GRC — 8 000+ klientów",
      price: "$10 000+/rok",
      badge: "Enterprise",
      badgeFeatured: false,
      reviewUrl: "narzedzia/vanta.html",
      vendorUrl: "https://vanta.com"
    },
    complycloud: {
      name: "ComplyCloud",
      tagline: "GDPR + NIS2 z siedzibą w UE",
      price: "Wycena indywidualna",
      badge: "Privacy-first",
      badgeFeatured: false,
      reviewUrl: "narzedzia/complycloud.html",
      vendorUrl: "https://complycloud.eu"
    },
    drata: {
      name: "Drata",
      tagline: "Automatyzacja GRC klasy enterprise",
      price: "$15 000+/rok",
      badge: "Enterprise Automation",
      badgeFeatured: false,
      reviewUrl: "narzedzia/drata.html",
      vendorUrl: "https://drata.com"
    }
  };

  // ── Tool recommendation map ────────────────────────────────────────────────
  // key: "<resultType>:<budget>" → [primary, secondary]
  const TOOL_RECS = {
    "kluczowy:free":   ["reglyze",    "isms_online"],
    "kluczowy:low":    ["isms_online", "reglyze"],
    "kluczowy:mid":    ["secfix",     "isms_online"],
    "kluczowy:high":   ["secfix",     "vanta"],
    "wazny:free":      ["reglyze",    "complycloud"],
    "wazny:low":       ["reglyze",    "isms_online"],
    "wazny:mid":       ["isms_online","reglyze"],
    "wazny:high":      ["secfix",     "isms_online"],
    "depends:free":    ["reglyze",    "complycloud"],
    "depends:low":     ["reglyze",    "complycloud"],
    "depends:mid":     ["reglyze",    "isms_online"],
    "depends:high":    ["secfix",     "reglyze"],
    "no:free":         ["reglyze",    "complycloud"],
    "no:low":          ["reglyze",    "complycloud"],
    "no:mid":          ["complycloud","reglyze"],
    "no:high":         ["complycloud","secfix"]
  };

  // ── State ──────────────────────────────────────────────────────────────────
  const state = {
    step: 0,
    answers: {},
    emailSubmitted: false
  };

  // ── Questions ──────────────────────────────────────────────────────────────
  const questions = [
    {
      id: "sector",
      title: "W jakim sektorze działa Twoja firma?",
      hint: "Wybierz sektor, który najlepiej opisuje główną działalność Twojej firmy.",
      options: [
        {
          value: "annex1",
          icon: "⚡",
          label: "Sektor kluczowy (Załącznik I)",
          sub: "Energia, transport, bankowość, finanse, ochrona zdrowia, woda, infrastruktura cyfrowa, administracja publiczna, sektor kosmiczny"
        },
        {
          value: "annex2",
          icon: "📦",
          label: "Sektor ważny (Załącznik II)",
          sub: "Usługi pocztowe, gospodarka odpadami, produkcja chemikaliów, produkcja żywności, produkcja przemysłowa, dostawcy usług cyfrowych, badania naukowe"
        },
        {
          value: "other",
          icon: "🏗️",
          label: "Inny sektor",
          sub: "Budownictwo, handel detaliczny, gastronomia, edukacja (prywatna), inne"
        }
      ]
    },
    {
      id: "size",
      title: "Ile osób zatrudnia Twoja firma?",
      hint: "Łącznie z osobami pracującymi na umowy cywilnoprawne jeśli są traktowane jak pracownicy.",
      options: [
        {
          value: "micro",
          icon: "👤",
          label: "Mniej niż 50 pracowników",
          sub: "Mikroprzedsiębiorstwo lub mała firma"
        },
        {
          value: "medium",
          icon: "👥",
          label: "50–249 pracowników",
          sub: "Średnie przedsiębiorstwo"
        },
        {
          value: "large",
          icon: "🏢",
          label: "250 lub więcej pracowników",
          sub: "Duże przedsiębiorstwo"
        }
      ]
    },
    {
      id: "revenue",
      title: "Jaki jest roczny obrót Twojej firmy?",
      hint: "Chodzi o roczne przychody. Suma bilansowa traktowana jest podobnie.",
      options: [
        {
          value: "small",
          icon: "💶",
          label: "Poniżej 10 mln EUR rocznie",
          sub: "Mikroprzedsiębiorstwo lub mała firma"
        },
        {
          value: "medium",
          icon: "💰",
          label: "10–50 mln EUR rocznie",
          sub: "Lub suma bilansowa 10–43 mln EUR"
        },
        {
          value: "large",
          icon: "💎",
          label: "Powyżej 50 mln EUR rocznie",
          sub: "Lub suma bilansowa powyżej 43 mln EUR"
        }
      ]
    },
    {
      id: "budget",
      title: "Jaki budżet roczny ma Twoja firma na zgodność z NIS2/KSC?",
      hint: "Dopasujemy narzędzie do możliwości finansowych Twojej firmy.",
      options: [
        {
          value: "free",
          icon: "🆓",
          label: "Szukamy darmowego rozwiązania",
          sub: "Wolny plan lub tylko jednorazowy koszt wdrożenia"
        },
        {
          value: "low",
          icon: "💵",
          label: "Do 1 000 PLN rocznie (~€200)",
          sub: "Podstawowe narzędzie SaaS dla MŚP"
        },
        {
          value: "mid",
          icon: "💳",
          label: "1 000–6 000 PLN rocznie (~€200–1 400)",
          sub: "Pełna platforma compliance klasy mid-market"
        },
        {
          value: "high",
          icon: "🏦",
          label: "Powyżej 6 000 PLN rocznie (€1 400+)",
          sub: "Rozwiązanie enterprise z pełnym wsparciem"
        }
      ]
    }
  ];

  const TOTAL = questions.length; // 4

  // ── GA4 helper ─────────────────────────────────────────────────────────────
  function track(event, params) {
    if (typeof gtag === "function") { gtag("event", event, params || {}); }
  }

  // ── URL params (shareable results) ─────────────────────────────────────────
  function encodeStateToUrl() {
    const params = new URLSearchParams();
    if (state.answers.sector)  params.set("s", state.answers.sector);
    if (state.answers.size)    params.set("z", state.answers.size);
    if (state.answers.revenue) params.set("r", state.answers.revenue);
    if (state.answers.budget)  params.set("b", state.answers.budget);
    const newUrl = window.location.pathname + "?" + params.toString();
    try { history.replaceState(null, "", newUrl); } catch (e) {}
  }

  function loadStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("s"); const z = params.get("z");
    const r = params.get("r"); const b = params.get("b");
    const validSectors = ["annex1","annex2","other"];
    const validSizes   = ["micro","medium","large"];
    const validRev     = ["small","medium","large"];
    const validBudgets = ["free","low","mid","high"];
    if (s && validSectors.includes(s)) state.answers.sector  = s;
    if (z && validSizes.includes(z))   state.answers.size    = z;
    if (r && validRev.includes(r))     state.answers.revenue = r;
    if (b && validBudgets.includes(b)) state.answers.budget  = b;
    // If all 4 answers pre-filled, jump straight to result
    if (state.answers.sector && state.answers.size &&
        state.answers.revenue && state.answers.budget) {
      return true; // signal: render result immediately
    }
    return false;
  }

  // ── Result computation ──────────────────────────────────────────────────────
  function computeResult() {
    const sector  = state.answers.sector;
    const size    = state.answers.size;
    const revenue = state.answers.revenue;

    if (sector === "other") {
      return {
        type: "no",
        title: "Twoja firma prawdopodobnie nie podlega KSC/NIS2",
        subtitle: "Nie dotyczy Cię ustawa o krajowym systemie cyberbezpieczeństwa",
        body: "Firmy spoza sektorów wymienionych w Załączniku I i II dyrektywy NIS2 generalnie nie podlegają obowiązkom ustawy KSC. Możesz jednak dobrowolnie wdrożyć standardy bezpieczeństwa (np. ISO 27001) jeśli obsługujesz klientów z sektorów objętych KSC lub chcesz wygrywać przetargi publiczne.",
        badge: "Prawdopodobnie nie podlega",
        badgeColor: "green"
      };
    }

    const isLarge  = size === "large"  || revenue === "large";
    const isMedium = !isLarge && (size === "medium" || revenue === "medium");

    if (sector === "annex1" && isLarge) {
      return {
        type: "kluczowy",
        title: "Twoja firma to PODMIOT KLUCZOWY",
        subtitle: "Najwyższy poziom obowiązków KSC i NIS2",
        body: "Jako duże przedsiębiorstwo w sektorze kluczowym (Załącznik I) podlegasz najbardziej rygorystycznym wymogom KSC. Obowiązki: pełny ISMS zgodny z ISO 27001, raportowanie incydentów do CERT Polska w ciągu 24h, audyt co 2 lata, zarządzanie bezpieczeństwem łańcucha dostaw. Kara za naruszenie: do 10 000 000 EUR lub 2% globalnego obrotu.",
        badge: "Podmiot kluczowy",
        badgeColor: "red"
      };
    }

    if (sector === "annex1" && isMedium) {
      return {
        type: "wazny",
        title: "Twoja firma to PODMIOT WAŻNY",
        subtitle: "Obowiązki KSC — nieco mniej rygorystyczne niż podmiot kluczowy",
        body: "Jako średnie przedsiębiorstwo w sektorze kluczowym (Załącznik I) jesteś podmiotem ważnym. Kontrola jest reaktywna — audyt tylko po incydencie lub skardze. Kara za naruszenie: do 7 000 000 EUR lub 1,4% globalnego obrotu. Deadline samoidentyfikacji: 3 październik 2026.",
        badge: "Podmiot ważny",
        badgeColor: "yellow"
      };
    }

    if (sector === "annex2" && (isLarge || isMedium)) {
      return {
        type: "wazny",
        title: "Twoja firma to PODMIOT WAŻNY",
        subtitle: "Obowiązki KSC dla sektora Załącznik II",
        body: "Jako firma w sektorze z Załącznika II i rozmiarze co najmniej średnim podlegasz obowiązkom jako podmiot ważny. Wymogi: środki zarządzania ryzykiem cyberbezpieczeństwa, raportowanie poważnych incydentów, wyznaczenie osoby odpowiedzialnej. Kara: do 7 000 000 EUR lub 1,4% globalnego obrotu. Deadline: 3 październik 2026.",
        badge: "Podmiot ważny",
        badgeColor: "yellow"
      };
    }

    if (sector === "annex1" || sector === "annex2") {
      return {
        type: "depends",
        title: "Twoja firma prawdopodobnie nie podlega KSC — ale sprawdź wyjątki",
        subtitle: "Mikro i małe firmy są generalnie wyłączone — z ważnymi wyjątkami",
        body: "Mikro i małe przedsiębiorstwa (<50 pracowników i <10 mln EUR obrotu) są generalnie wyłączone z KSC. Jednak ustawa przewiduje wyjątki: dostawcy usług zaufania, rejestry domen, dostawcy usług DNS i inne specyficzne podmioty. Zalecamy konsultację prawną jeśli działasz jako podwykonawca dla podmiotów kluczowych lub ważnych.",
        badge: "Prawdopodobnie wyłączona — sprawdź wyjątki",
        badgeColor: "yellow"
      };
    }

    return {
      type: "no",
      title: "Twoja firma nie podlega KSC/NIS2",
      subtitle: "",
      body: "Na podstawie podanych informacji Twoja firma nie wchodzi w zakres ustawy o krajowym systemie cyberbezpieczeństwa.",
      badge: "Nie podlega",
      badgeColor: "green"
    };
  }

  function getToolPair() {
    const result = computeResult();
    const budget = state.answers.budget || "low";
    const key = result.type + ":" + budget;
    return TOOL_RECS[key] || ["reglyze", "isms_online"];
  }

  // ── Render: question step ───────────────────────────────────────────────────
  function renderStep() {
    const q = questions[state.step];
    const container = document.getElementById("quiz-container");
    if (!container) { return; }

    const pct = Math.round((state.step / TOTAL) * 100);
    const isLast = state.step === TOTAL - 1;

    const optionsHtml = q.options.map(opt => `
      <button class="quiz-option${state.answers[q.id] === opt.value ? " selected" : ""}"
              data-value="${opt.value}" type="button">
        <span class="quiz-option__icon">${opt.icon}</span>
        <span>
          <span class="quiz-option__text">${opt.label}</span>
          <span class="quiz-option__sub">${opt.sub}</span>
        </span>
      </button>
    `).join("");

    container.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-progress">
          <div class="quiz-progress__bar" style="width:${pct}%"></div>
        </div>
        <p class="text-sm text-gray" style="margin-bottom:.25rem;">Pytanie ${state.step + 1} z ${TOTAL}</p>
        <h3>${q.title}</h3>
        <p>${q.hint}</p>
        <div class="quiz-options" id="quiz-options">${optionsHtml}</div>
        <div class="quiz-nav">
          ${state.step > 0
            ? `<button class="btn btn--outline btn--sm" id="quiz-back">← Wstecz</button>`
            : `<span></span>`}
          <button class="btn btn--primary btn--sm" id="quiz-next"
                  ${state.answers[q.id] ? "" : "disabled"}>
            ${isLast ? "Zobacz moje narzędzia →" : "Dalej →"}
          </button>
        </div>
      </div>
    `;

    container.querySelectorAll(".quiz-option").forEach(btn => {
      btn.addEventListener("click", () => {
        state.answers[q.id] = btn.dataset.value;
        container.querySelectorAll(".quiz-option").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        const nextBtn = document.getElementById("quiz-next");
        if (nextBtn) { nextBtn.removeAttribute("disabled"); }
        track("quiz_answer", { question: q.id, answer: btn.dataset.value });
      });
    });

    const backBtn = document.getElementById("quiz-back");
    if (backBtn) {
      backBtn.addEventListener("click", () => { state.step--; renderStep(); });
    }

    const nextBtn = document.getElementById("quiz-next");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (!state.answers[q.id]) { return; }
        if (isLast) {
          encodeStateToUrl();
          if (FORM_ENDPOINT && !state.emailSubmitted) {
            renderEmailGate();
          } else {
            renderResult();
          }
        } else {
          state.step++;
          renderStep();
        }
      });
    }
  }

  // ── Render: email gate ──────────────────────────────────────────────────────
  function renderEmailGate() {
    const container = document.getElementById("quiz-container");
    if (!container) { return; }

    const pair = getToolPair();
    const primary = TOOLS[pair[0]] || TOOLS.reglyze;

    container.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-progress">
          <div class="quiz-progress__bar" style="width:95%"></div>
        </div>
        <div class="quiz-email-gate">
          <div style="font-size:2.5rem;margin-bottom:.75rem;">📬</div>
          <h3>Wynik jest gotowy!</h3>
          <p>Podaj email, a wyślemy Ci też gotowy <strong>checklist KSC 2026</strong> (12 kroków do zgodności) — bezpłatnie.</p>
          <form class="quiz-gate-form" id="quiz-gate-form">
            <input type="email" class="form-input" placeholder="twoj@email.pl" required>
            <button type="submit" class="btn btn--primary">Wyślij i zobacz wynik →</button>
          </form>
          <button class="quiz-gate-skip" id="quiz-gate-skip" type="button">Pomiń i pokaż wynik</button>
        </div>
      </div>
    `;

    track("quiz_email_gate_shown");

    const form = document.getElementById("quiz-gate-form");
    if (form) {
      form.addEventListener("submit", e => {
        e.preventDefault();
        const emailEl = form.querySelector('input[type="email"]');
        if (!emailEl || !emailEl.value) { return; }
        const btn = form.querySelector("button[type='submit']");
        if (btn) { btn.disabled = true; btn.textContent = "Zapisywanie..."; }
        submitEmail(emailEl.value, "quiz_gate", () => {
          state.emailSubmitted = true;
          track("email_captured", { source: "quiz_gate" });
          renderResult();
        });
      });
    }

    const skipBtn = document.getElementById("quiz-gate-skip");
    if (skipBtn) {
      skipBtn.addEventListener("click", () => {
        track("quiz_email_gate_skipped");
        renderResult();
      });
    }
  }

  function submitEmail(email, source, onSuccess) {
    if (!FORM_ENDPOINT) { return; }
    fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, source: source, ts: new Date().toISOString() })
    }).then(r => {
      if (r.ok && onSuccess) { onSuccess(); }
    }).catch(() => { if (onSuccess) { onSuccess(); } }); // fail open — still show result
  }

  // ── Render: result ──────────────────────────────────────────────────────────
  function renderResult() {
    const container = document.getElementById("quiz-container");
    if (!container) { return; }

    const result = computeResult();
    const pair   = getToolPair();
    const iconMap = { kluczowy: "🚨", wazny: "⚠️", depends: "🔍", no: "✅" };
    const icon    = iconMap[result.type] || "📋";
    const badgeColorMap = {
      green:  "background:#dcfce7;color:#166534",
      yellow: "background:#fefce8;color:#854d0e",
      red:    "background:#fee2e2;color:#991b1b"
    };
    const badgeStyle = badgeColorMap[result.badgeColor] || badgeColorMap.green;

    function toolCardHtml(toolKey, rank) {
      const t = TOOLS[toolKey];
      if (!t) { return ""; }
      const isFeatured = rank === 1 && t.badgeFeatured;
      return `
        <div class="result-tool-card${isFeatured ? "" : ""}">
          <div class="result-tool-card__rank">${rank === 1 ? "★ Rekomendacja #1" : "Alternatywa #2"}</div>
          <div class="result-tool-card__name">${t.name}</div>
          <div class="result-tool-card__tag">${t.tagline}</div>
          <div class="result-tool-card__price">${t.price}</div>
          <div class="result-tool-card__actions">
            <a href="${t.vendorUrl}" class="btn btn--primary btn--xs" target="_blank" rel="nofollow noopener">
              Wypróbuj ↗
            </a>
            <a href="${t.reviewUrl}" class="btn btn--outline btn--xs">Recenzja</a>
          </div>
        </div>
      `;
    }

    const toolsHtml = `
      <div class="result-tools">
        ${toolCardHtml(pair[0], 1)}
        ${toolCardHtml(pair[1], 2)}
      </div>
    `;

    const shareUrl = window.location.href;

    container.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-result">
          <div class="quiz-result__icon">${icon}</div>
          <div style="display:inline-block;padding:.3rem 1rem;border-radius:20px;font-size:.8rem;font-weight:700;margin-bottom:1rem;${badgeStyle}">
            ${result.badge}
          </div>
          <h3>${result.title}</h3>
          ${result.subtitle
            ? `<p style="font-weight:600;color:var(--gray-500);margin-bottom:.75rem;">${result.subtitle}</p>`
            : ""}
          <p style="text-align:left;margin-top:.75rem;">${result.body}</p>

          ${result.type !== "no"
            ? `<div style="margin-top:1.5rem;text-align:left;">
                 <p style="font-size:.82rem;color:var(--gray-500);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.75rem;">
                   Dopasowane narzędzia dla Twojej firmy
                 </p>
                 ${toolsHtml}
               </div>`
            : `<div style="margin-top:1.5rem;text-align:left;">
                 <p style="font-size:.82rem;color:var(--gray-500);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.75rem;">
                   Warto mieć na przyszłość
                 </p>
                 ${toolsHtml}
               </div>`}

          <div style="margin-top:1.5rem;padding:.85rem 1rem;background:var(--gray-50);border-radius:6px;font-size:.8rem;color:var(--gray-600);">
            📎 <strong>Udostępnij wynik:</strong>
            <input type="text" value="${shareUrl}" readonly
              style="width:100%;margin-top:.35rem;padding:.4rem .6rem;border:1px solid var(--gray-300);border-radius:4px;font-size:.78rem;font-family:inherit;"
              onclick="this.select()">
          </div>

          <div style="margin-top:1.5rem;padding:1rem;background:#f0f7ff;border-radius:8px;text-align:left;">
            <p style="font-size:.85rem;font-weight:700;color:#1a1a2e;margin-bottom:.4rem;">📄 Twój spersonalizowany raport zgodności</p>
            <p style="font-size:.82rem;color:#555;margin-bottom:.75rem;">Pobierz raport PDF z Twoim planem działań, listą obowiązków i gotowym promptem dla AI (Claude / ChatGPT), który poprowadzi Cię krok po kroku.</p>
            <button class="btn btn--primary btn--sm" id="quiz-get-report">Pobierz raport →</button>
            <div id="quiz-report-status" style="margin-top:.5rem;font-size:.8rem;color:#555;display:none;"></div>
          </div>

          <div style="margin-top:1.25rem;display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;">
            <button class="btn btn--outline btn--sm" id="quiz-restart">← Zacznij od nowa</button>
            <a href="porownanie.html" class="btn btn--primary btn--sm">Porównaj wszystkie narzędzia →</a>
          </div>
        </div>
      </div>
    `;

    track("quiz_completed", { result_type: result.type, budget: state.answers.budget });

    const restartBtn = document.getElementById("quiz-restart");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        state.step = 0;
        state.answers = {};
        state.emailSubmitted = false;
        try { history.replaceState(null, "", window.location.pathname); } catch (e) {}
        renderStep();
      });
    }

    const reportBtn = document.getElementById("quiz-get-report");
    if (reportBtn) {
      reportBtn.addEventListener("click", () => {
        if (!state.emailSubmitted) {
          _showReportEmailGate();
        } else {
          _generateReport();
        }
      });
    }
  }

  // ── Report: email gate + generation ────────────────────────────────────────

  function _showReportEmailGate() {
    const box = document.getElementById("quiz-report-status");
    if (!box) { return; }
    box.style.display = "block";
    box.innerHTML = `
      <form id="report-email-form" style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.35rem;">
        <input type="email" placeholder="twoj@email.pl" required
          style="flex:1;min-width:180px;padding:.4rem .6rem;border:1px solid #ccc;border-radius:4px;font-size:.82rem;">
        <button type="submit" class="btn btn--primary btn--xs">Wyślij i pobierz →</button>
      </form>
    `;
    track("report_email_gate_shown");
    const form = document.getElementById("report-email-form");
    if (form) {
      form.addEventListener("submit", e => {
        e.preventDefault();
        const emailEl = form.querySelector("input[type=email]");
        if (!emailEl || !emailEl.value) { return; }
        const btn = form.querySelector("button");
        if (btn) { btn.disabled = true; btn.textContent = "Wysyłanie..."; }
        submitEmail(emailEl.value, "report_gate", () => {
          state.emailSubmitted = true;
          track("email_captured", { source: "report_gate" });
          box.innerHTML = "";
          _generateReport();
        });
      });
    }
  }

  function _generateReport() {
    const reportBtn = document.getElementById("quiz-get-report");
    const status    = document.getElementById("quiz-report-status");
    if (reportBtn) { reportBtn.disabled = true; reportBtn.textContent = "Generowanie..."; }
    if (status)    { status.style.display = "block"; status.textContent = "Generuję Twój raport... (10–20 sekund)"; }
    track("report_requested", { sector: state.answers.sector, budget: state.answers.budget });

    fetch("/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sector:  state.answers.sector,
        size:    state.answers.size,
        revenue: state.answers.revenue,
        budget:  state.answers.budget,
        lang:    document.documentElement.lang || "pl",
        domain:  window.location.hostname,
      }),
    })
    .then(r => r.json())
    .then(data => {
      if (data.html) {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(data.html);
          win.document.close();
          track("report_generated");
          if (status) { status.style.display = "none"; }
        } else {
          if (status) { status.textContent = "Zezwól na otwieranie nowych okien w przeglądarce i spróbuj ponownie."; }
        }
      } else {
        if (status) { status.textContent = "Błąd generowania raportu. Spróbuj ponownie."; }
      }
      if (reportBtn) { reportBtn.disabled = false; reportBtn.textContent = "Pobierz raport →"; }
    })
    .catch(() => {
      if (status) { status.textContent = "Błąd połączenia. Spróbuj ponownie."; }
      if (reportBtn) { reportBtn.disabled = false; reportBtn.textContent = "Pobierz raport →"; }
    });
  }

  // ── FAQ accordion (unchanged) ───────────────────────────────────────────────
  function initFaq() {
    document.querySelectorAll(".faq-question").forEach(btn => {
      btn.addEventListener("click", () => {
        const item = btn.closest(".faq-item");
        const isOpen = item.classList.contains("open");
        document.querySelectorAll(".faq-item.open").forEach(i => i.classList.remove("open"));
        if (!isOpen) { item.classList.add("open"); }
      });
    });
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    const quizContainer = document.getElementById("quiz-container");
    if (quizContainer) {
      const jumpToResult = loadStateFromUrl();
      if (jumpToResult) {
        renderResult();
      } else {
        renderStep();
      }
    }
    initFaq();
  });

})();
