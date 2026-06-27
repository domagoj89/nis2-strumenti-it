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
