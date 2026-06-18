(function () {
  "use strict";

  // ── Config ────────────────────────────────────────────────────────────────
  var FORM_ENDPOINT = "/subscribe"; // Cloudflare Pages Function — functions/subscribe.js
  var DEADLINE = new Date("2026-10-03T00:00:00");

  // ── GA4 helper ───────────────────────────────────────────────────────────
  function track(event, params) {
    if (typeof gtag === "function") { gtag("event", event, params || {}); }
  }

  // ── Countdown timer ──────────────────────────────────────────────────────
  function updateCountdowns() {
    var now = new Date();
    var diff = DEADLINE - now;
    if (diff <= 0) { diff = 0; }
    var days = Math.floor(diff / 86400000);
    var hrs  = Math.floor((diff % 86400000) / 3600000);
    var mins = Math.floor((diff % 3600000)  / 60000);

    document.querySelectorAll("[data-countdown]").forEach(function (el) {
      var mode = el.getAttribute("data-countdown");
      if (mode === "days") {
        el.textContent = days;
      } else if (mode === "short") {
        el.textContent = days + "d " + hrs + "h " + mins + "m";
      } else {
        el.textContent = days + " dni";
      }
    });

    // Update deadline-counter blocks
    document.querySelectorAll(".deadline-counter__days").forEach(function (el) {
      el.textContent = days;
    });
  }

  // ── Sticky CTA bar ───────────────────────────────────────────────────────
  function initStickyCta() {
    var bar = document.querySelector(".sticky-cta");
    if (!bar) { return; }

    var dismissed = false;
    var closeBtn = bar.querySelector(".sticky-cta__close");

    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        dismissed = true;
        bar.classList.remove("visible");
        try { sessionStorage.setItem("sticky_cta_dismissed", "1"); } catch (e) {}
      });
    }

    try {
      if (sessionStorage.getItem("sticky_cta_dismissed") === "1") {
        dismissed = true;
      }
    } catch (e) {}

    var shown = false;
    window.addEventListener("scroll", function () {
      if (dismissed) { return; }
      var scrolled = window.scrollY || document.documentElement.scrollTop;
      if (scrolled > 400 && !shown) {
        bar.classList.add("visible");
        shown = true;
        track("sticky_cta_shown");
      } else if (scrolled <= 400 && shown) {
        bar.classList.remove("visible");
        shown = false;
      }
    }, { passive: true });
  }

  // ── Exit intent overlay ──────────────────────────────────────────────────
  function initExitIntent() {
    var overlay = document.querySelector(".exit-overlay");
    if (!overlay) { return; }

    var modal    = overlay.querySelector(".exit-modal");
    var closeBtn = overlay.querySelector(".exit-modal__close");
    var skipLink = overlay.querySelector(".exit-modal__skip");
    var form     = overlay.querySelector(".exit-modal__form");

    var fired = false;

    function dismiss() {
      overlay.classList.remove("visible");
      try { sessionStorage.setItem("exit_overlay_shown", "1"); } catch (e) {}
    }

    try {
      if (sessionStorage.getItem("exit_overlay_shown") === "1") { fired = true; }
    } catch (e) {}

    if (closeBtn) { closeBtn.addEventListener("click", dismiss); }
    if (skipLink) { skipLink.addEventListener("click", function (e) { e.preventDefault(); dismiss(); }); }

    overlay.addEventListener("click", function (e) {
      if (!modal || !modal.contains(e.target)) { dismiss(); }
    });

    document.addEventListener("mouseleave", function (e) {
      if (fired || e.clientY > 10) { return; }
      fired = true;
      overlay.classList.add("visible");
      track("exit_intent_shown");
    });

    if (form && FORM_ENDPOINT) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var emailEl = form.querySelector('input[type="email"]');
        if (!emailEl || !emailEl.value) { return; }
        submitEmail(emailEl.value, "exit_overlay", function () {
          form.innerHTML = '<p style="color:var(--green);font-weight:700;text-align:center;">✓ Zapisano. Sprawdź skrzynkę.</p>';
          track("email_captured", { source: "exit_overlay" });
        });
      });
    }
  }

  // ── Inline email form handler ────────────────────────────────────────────
  function initEmailForms() {
    document.querySelectorAll("[data-email-form]").forEach(function (form) {
      if (!FORM_ENDPOINT) { return; }
      var source = form.getAttribute("data-email-form") || "inline";
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var emailEl = form.querySelector('input[type="email"]');
        if (!emailEl || !emailEl.value) { return; }
        var btn = form.querySelector("button[type='submit']");
        if (btn) { btn.disabled = true; btn.textContent = "Wysyłanie..."; }
        submitEmail(emailEl.value, source, function () {
          var parent = form.parentElement;
          if (parent) {
            parent.innerHTML = '<p style="color:var(--green);font-weight:700;padding:.75rem 0;">✓ Zapisano! Sprawdź skrzynkę email.</p>';
          }
          track("email_captured", { source: source });
        });
      });
    });
  }

  function submitEmail(email, source, onSuccess) {
    if (!FORM_ENDPOINT) { return; }
    fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, source: source, ts: new Date().toISOString() })
    }).then(function (r) {
      if (r.ok && onSuccess) { onSuccess(); }
    }).catch(function () {});
  }

  // ── Social proof counters (simple static values) ─────────────────────────
  function initSocialProof() {
    document.querySelectorAll("[data-counter]").forEach(function (el) {
      var target = parseInt(el.getAttribute("data-counter"), 10);
      if (isNaN(target)) { return; }
      var start = 0;
      var duration = 1200;
      var step = Math.ceil(target / (duration / 16));
      var timer = setInterval(function () {
        start += step;
        if (start >= target) { start = target; clearInterval(timer); }
        el.textContent = start.toLocaleString("pl-PL");
      }, 16);
    });
  }

  // ── Methodology accordion (review pages) ────────────────────────────────
  function initMethodologyBoxes() {
    document.querySelectorAll(".methodology-box").forEach(function (box) {
      var toggle = box.querySelector(".methodology-toggle");
      if (!toggle) { return; }
      toggle.addEventListener("click", function () {
        box.classList.toggle("open");
        var expanded = box.classList.contains("open");
        toggle.setAttribute("aria-expanded", expanded);
      });
    });
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    updateCountdowns();
    setInterval(updateCountdowns, 60000);
    initStickyCta();
    initExitIntent();
    initEmailForms();
    initSocialProof();
    initMethodologyBoxes();
  });

})();
