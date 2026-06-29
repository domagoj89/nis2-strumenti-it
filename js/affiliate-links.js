// Centralized affiliate link registry.
// Fill in your affiliate URLs — all matching vendor links on every page update automatically.
// No HTML edits needed: the script matches by vendor domain pattern.

const AFFILIATE_MAP = [
  { match: "reglyze.com",  affiliate: "" },  // 
  { match: "secfix.com",  affiliate: "" },  // 
  { match: "isms.online",  affiliate: "" },  // 
  { match: "sprinto.com",  affiliate: "" },  // 
  { match: "vanta.com",  affiliate: "" },  // 
  { match: "complycloud.eu",  affiliate: "" },  // 
  { match: "drata.com",  affiliate: "" },  // 
  { match: "nordlayer.com",  affiliate: "" },  // 
  { match: "1password.com",  affiliate: "" },  // 
  { match: "bitwarden.com",  affiliate: "" },  // 
  { match: "bitdefender.com",  affiliate: "" },  // 
  { match: "acronis.com",  affiliate: "https://www.tkqlhce.com/click-101804169-13492976" },  // 
];

/* aff-compliance v1 */
/* tg-channel-cta v1 */
window.addEventListener("load", function () {
  if (document.getElementById("tg-cta")) return;
  var a = document.createElement("a");
  a.id = "tg-cta";
  a.href = "https://t.me/nis2strumenti";
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = "📣 Aggiornamenti NIS2 su Telegram";
  a.style.cssText = "display:inline-flex;align-items:center;gap:.4rem;margin:1rem auto;padding:.55rem 1.1rem;border-radius:999px;background:#229ED9;color:#fff;font-size:.85rem;font-weight:600;text-decoration:none;";
  var wrap = document.createElement("div");
  wrap.style.cssText = "text-align:center;";
  wrap.appendChild(a);
  (document.querySelector("footer") || document.body).appendChild(wrap);
});

document.addEventListener("DOMContentLoaded", function () {
  AFFILIATE_MAP.forEach(function (entry) {
    if (!entry.affiliate) return;
    document.querySelectorAll('a[href*="' + entry.match + '"]').forEach(function (el) {
      el.href = entry.affiliate;
      el.rel = "sponsored noopener";
      el.target = "_blank";
    });
  });
  if (!document.getElementById("aff-disclosure")) {
    var d = document.createElement("div");
    d.id = "aff-disclosure";
    d.textContent = "Informativa: questo sito contiene link di affiliazione. Se acquisti tramite questi link possiamo ricevere una commissione, senza costi aggiuntivi per te.";
    d.style.cssText = "max-width:1100px;margin:1rem auto;padding:.5rem 1.25rem;font-size:.78rem;line-height:1.5;color:#94a3b8;text-align:center;";
    (document.querySelector("footer") || document.body).appendChild(d);
  }
});
