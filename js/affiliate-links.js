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
  { match: "acronis.com",  affiliate: "" },  // 
];

document.addEventListener("DOMContentLoaded", function () {
  AFFILIATE_MAP.forEach(function (entry) {
    if (!entry.affiliate) return; // skip until affiliate URL is set
    document.querySelectorAll('a[href*="' + entry.match + '"]').forEach(function (el) {
      el.href = entry.affiliate;
    });
  });
});
