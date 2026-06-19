/* NIS2 Compliance Progress Tracker — tracker.js */
/* Renders a 10-item Art. 21 checklist with localStorage persistence.
   Quiz score auto-marks gaps if quiz was completed this session.        */

(function () {
  var STORAGE_KEY = "nis2_tracker_v1";
  var QUIZ_KEY    = "nis2_quiz_gaps"; // written by quiz.js after score gate

  /* ── Strings (Italian — translated per site by deploy script) ─────────── */
  var S = {
    heading:        "Il tuo progresso di conformità NIS2",
    subheading:     "Seleziona le misure già implementate. Il tuo progresso viene salvato localmente.",
    done_label:     "Implementato",
    todo_label:     "Da fare",
    cta_default:    "Scopri di più →",
    progress_text:  function(done, total) { return done + " di " + total + " misure implementate"; },
    complete_msg:   "🎉 Tutte le misure implementate — congratulazioni! Considera la certificazione ISO 27001.",
    iso_link_text:  "Scopri la certificazione ISO 27001 →",
    reset_label:    "Reimposta progresso",
    last_updated:   "Ultimo aggiornamento: ",
    art_badge:      "Art. 21",
    free_badge:     "gratuito",
    trial_badge:    "trial",
  };

  /* ── Measures (10 Art. 21 NIS2 requirements) ─────────────────────────── */
  var MEASURES = [
    {
      id:       "registration",
      art:      "Registrazione",
      title:    "Registrazione nel registro dei soggetti D.Lgs. n. 138/2024",
      detail:   "Obbligo di registrazione nel registro dei soggetti essenziali e importanti tenuto da ACN. Termine: secondo il recepimento italiano NIS2 (D.Lgs. 138/2024).",
      tool:     "Guida alla registrazione passo dopo passo",
      tool_url: "registrazione-nis2.html",
      cost:     "gratuito",
      quiz_gap: "registration",
    },
    {
      id:       "risk_policy",
      art:      "Art. 21(2)(a)",
      title:    "Analisi del rischio e politiche di sicurezza",
      detail:   "Politica di sicurezza delle informazioni documentata e processo formale di gestione del rischio IT.",
      tool:     "ISMS.online — piano gratuito fino a 25 dipendenti",
      tool_url: "https://isms.online/",
      cost:     "piano gratuito",
      quiz_gap: "isms",
    },
    {
      id:       "incident",
      art:      "Art. 21(2)(b)",
      title:    "Procedure di gestione degli incidenti",
      detail:   "Procedure documentate per il rilevamento, la classificazione e la segnalazione degli incidenti ad ACN entro 24/72 ore.",
      tool:     "ISMS.online — modelli di procedure per la gestione degli incidenti",
      tool_url: "https://isms.online/",
      cost:     "piano gratuito",
      quiz_gap: "isms",
    },
    {
      id:       "continuity",
      art:      "Art. 21(2)(c)",
      title:    "Continuità operativa e gestione delle crisi",
      detail:   "Piano di continuità operativa (BCP) e di ripristino in caso di disastro (DR). Backup dei dati, test di ripristino.",
      tool:     "Acronis Cyber Protect — backup + DR per le PMI",
      tool_url: "https://www.acronis.com/",
      cost:     "da €59/anno",
      quiz_gap: null,
    },
    {
      id:       "supply_chain",
      art:      "Art. 21(2)(d)",
      title:    "Sicurezza della catena di fornitura",
      detail:   "Valutazione dei rischi dei fornitori, clausole di sicurezza nei contratti, registro dei fornitori con accesso ai sistemi.",
      tool:     "Guida alla sicurezza della catena di fornitura NIS2",
      tool_url: "sicurezza-catena-fornitura.html",
      cost:     "gratuito",
      quiz_gap: null,
    },
    {
      id:       "network_security",
      art:      "Art. 21(2)(e)",
      title:    "Sicurezza delle reti e dei sistemi",
      detail:   "Segmentazione della rete, firewall, protezione degli endpoint, gestione delle vulnerabilità e delle patch.",
      tool:     "NordLayer — segmentazione della rete per le aziende",
      tool_url: "https://nordlayer.com/",
      cost:     "da €8/utente",
      quiz_gap: null,
    },
    {
      id:       "pentest",
      art:      "Art. 21(2)(f)",
      title:    "Valutazione dell'efficacia delle misure — test di penetrazione",
      detail:   "Test regolari e audit delle misure di sicurezza implementate, inclusi i test di penetrazione.",
      tool:     "Cobalt.io — test di penetrazione su richiesta",
      tool_url: "https://cobalt.io/",
      cost:     "preventivo personalizzato",
      quiz_gap: null,
    },
    {
      id:       "training",
      art:      "Art. 21(2)(g)",
      title:    "Formazione sulla cybersicurezza",
      detail:   "Formazione regolare per i dipendenti sull'igiene informatica. La formazione del management è un obbligo legale (Art. 20).",
      tool:     "KnowBe4 — trial gratuito di 14 giorni",
      tool_url: "https://www.knowbe4.com/",
      cost:     "trial 14 giorni",
      quiz_gap: "training",
    },
    {
      id:       "crypto_mfa",
      art:      "Art. 21(2)(h)(i)",
      title:    "Crittografia, MFA e controllo degli accessi",
      detail:   "Crittografia dei dati a riposo e in transito. Autenticazione a più fattori (MFA) per tutti gli account privilegiati.",
      tool:     "1Password Business — MFA + gestore delle password",
      tool_url: "https://1password.com/",
      cost:     "da $7,99/utente",
      quiz_gap: "mfa",
    },
    {
      id:       "insurance",
      art:      "Trasferimento del rischio",
      title:    "Assicurazione cyber (trasferimento del rischio)",
      detail:   "Non è un requisito dell'Art. 21, ma copre le sanzioni del Garante/NIS2, i costi degli incidenti e le interruzioni dell'attività. Raccomandato per i soggetti essenziali e importanti.",
      tool:     "Hiscox Cyber — preventivo online in 10 minuti",
      tool_url: "https://hiscox.it/",
      cost:     "preventivo online",
      quiz_gap: "insurance",
    },
  ];

  /* ── State helpers ───────────────────────────────────────────────────── */
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch (e) { return {}; }
  }

  function saveState(state) {
    state._updated = new Date().toLocaleDateString("it-IT");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /* Read gaps that quiz wrote (array of gap ids like ["isms","training","mfa"]) */
  function getQuizGaps() {
    try { return JSON.parse(sessionStorage.getItem(QUIZ_KEY) || "[]"); }
    catch (e) { return []; }
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  function render() {
    var el = document.getElementById("nis2-tracker");
    if (!el) return;

    var state    = loadState();
    var quizGaps = getQuizGaps();
    var total    = MEASURES.length;
    var done     = MEASURES.filter(function(m) { return state[m.id]; }).length;
    var pct      = Math.round((done / total) * 100);

    var progressColor = pct >= 80 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";

    var html = '<section style="background:#f8fafc;padding:3rem 0;" id="tracker-section">';
    html += '<div class="container">';

    /* Header */
    html += '<div class="section-header" style="margin-bottom:1.5rem;">';
    html += '<h2 style="font-size:1.6rem;font-weight:800;color:var(--navy);">' + S.heading + '</h2>';
    html += '<p style="color:var(--gray-600);margin-top:.4rem;">' + S.subheading + '</p>';
    html += '</div>';

    /* Progress bar */
    html += '<div style="background:#e2e8f0;border-radius:99px;height:12px;margin-bottom:.75rem;overflow:hidden;">';
    html += '<div style="background:' + progressColor + ';width:' + pct + '%;height:100%;border-radius:99px;transition:width .4s ease;"></div>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;">';
    html += '<span style="font-weight:700;color:' + progressColor + ';font-size:.95rem;">' + S.progress_text(done, total) + ' (' + pct + '%)</span>';
    if (state._updated) {
      html += '<span style="font-size:.78rem;color:var(--gray-500);">' + S.last_updated + state._updated + '</span>';
    }
    html += '</div>';

    /* Complete banner */
    if (done === total) {
      html += '<div style="background:#dcfce7;border:1px solid #86efac;border-radius:10px;padding:1rem 1.25rem;margin-bottom:1.5rem;display:flex;gap:.75rem;align-items:center;">';
      html += '<span style="font-size:1.1rem;">' + S.complete_msg + '</span>';
      html += '<a href="certificazione-iso-27001.html" style="white-space:nowrap;font-size:.82rem;font-weight:700;color:#166534;">' + S.iso_link_text + '</a>';
      html += '</div>';
    }

    /* Measure cards */
    html += '<div style="display:grid;gap:1rem;">';

    MEASURES.forEach(function(m) {
      var checked    = !!state[m.id];
      var isGap      = quizGaps.length > 0 && m.quiz_gap && quizGaps.indexOf(m.quiz_gap) !== -1;
      var borderColor = checked ? "#86efac" : isGap ? "#fca5a5" : "#e2e8f0";
      var bgColor     = checked ? "#f0fdf4" : isGap ? "#fff5f5" : "#ffffff";

      html += '<div style="background:' + bgColor + ';border:1.5px solid ' + borderColor + ';border-radius:10px;padding:1rem 1.25rem;display:flex;gap:1rem;align-items:flex-start;">';

      /* Checkbox */
      html += '<label style="display:flex;align-items:flex-start;gap:.75rem;cursor:pointer;flex:1;min-width:0;">';
      html += '<input type="checkbox" data-id="' + m.id + '" ';
      html += checked ? 'checked ' : '';
      html += 'style="width:20px;height:20px;flex-shrink:0;margin-top:2px;accent-color:#1e3a5f;cursor:pointer;">';
      html += '<div style="min-width:0;">';

      /* Title row */
      html += '<div style="display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin-bottom:.25rem;">';
      html += '<span style="font-weight:700;color:var(--navy);font-size:.95rem;">' + m.title + '</span>';
      html += '<span style="font-size:.7rem;background:#e0e7ff;color:#3730a3;padding:.15rem .4rem;border-radius:4px;font-weight:600;">' + m.art + '</span>';
      if (checked) {
        html += '<span style="font-size:.7rem;background:#dcfce7;color:#166534;padding:.15rem .4rem;border-radius:4px;font-weight:700;">✓ ' + S.done_label + '</span>';
      } else if (isGap) {
        html += '<span style="font-size:.7rem;background:#fee2e2;color:#991b1b;padding:.15rem .4rem;border-radius:4px;font-weight:700;">⚠ ' + S.todo_label + '</span>';
      }
      html += '</div>';

      /* Detail */
      html += '<p style="font-size:.82rem;color:var(--gray-600);margin:0 0 .5rem;line-height:1.5;">' + m.detail + '</p>';

      /* CTA (only when not done) */
      if (!checked) {
        var isExternal = m.tool_url.startsWith("http");
        var costBadge  = m.cost === "piano gratuito" || m.cost === "gratuito"
          ? '<span style="font-size:.68rem;background:#dcfce7;color:#166534;padding:.1rem .35rem;border-radius:4px;font-weight:700;margin-left:.35rem;">' + S.free_badge + '</span>'
          : m.cost.indexOf("trial") !== -1
          ? '<span style="font-size:.68rem;background:#dbeafe;color:#1e40af;padding:.1rem .35rem;border-radius:4px;font-weight:700;margin-left:.35rem;">' + S.trial_badge + '</span>'
          : '';
        html += '<a href="' + m.tool_url + '" ';
        html += isExternal ? 'target="_blank" rel="noopener" ' : '';
        html += 'style="display:inline-flex;align-items:center;gap:.3rem;font-size:.8rem;font-weight:700;color:var(--navy);text-decoration:none;border:1px solid var(--navy);border-radius:6px;padding:.3rem .65rem;transition:all .15s;">';
        html += m.tool + costBadge;
        html += '</a>';
      }

      html += '</div></label>';
      html += '</div>';
    });

    html += '</div>'; /* grid */

    /* Reset */
    html += '<div style="margin-top:1.25rem;text-align:right;">';
    html += '<button id="tracker-reset" style="font-size:.75rem;color:var(--gray-500);background:none;border:none;cursor:pointer;text-decoration:underline;">' + S.reset_label + '</button>';
    html += '</div>';

    html += '</div></section>'; /* container, section */

    el.innerHTML = html;

    /* Bind events */
    el.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
      cb.addEventListener("change", function() {
        var s = loadState();
        s[cb.dataset.id] = cb.checked;
        saveState(s);
        render();
      });
    });

    var resetBtn = document.getElementById("tracker-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function() {
        if (confirm(S.reset_label + "?")) {
          localStorage.removeItem(STORAGE_KEY);
          render();
        }
      });
    }
  }

  /* ── Init ────────────────────────────────────────────────────────────── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

})();