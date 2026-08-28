const panel = document.getElementById("ad-platform-panel");
const ADS_ENDPOINT = "https://add-neon.vercel.app/api/ads";
const ROTATION_MS = 6000;

let ads = [];
let activeIndex = 0;
let rotationId;

function isSafeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function renderAd() {
  const ad = ads[activeIndex];
  if (!ad || !panel) return;

  panel.replaceChildren();
  const banner = document.createElement(isSafeUrl(ad.redirect_url) ? "a" : "div");
  banner.className = "ad-banner";
  if (banner instanceof HTMLAnchorElement) {
    banner.href = ad.redirect_url;
    banner.target = "_blank";
    banner.rel = "noopener sponsored";
  }

  const image = document.createElement("img");
  image.className = "ad-banner__image";
  image.alt = "";
  image.loading = "lazy";
  if (isSafeUrl(ad.logo_url)) image.src = ad.logo_url;

  const body = document.createElement("div");
  body.className = "ad-banner__body";
  const title = document.createElement("div");
  title.className = "ad-banner__title";
  title.textContent = String(ad.ad_text || "Discover something new");
  const meta = document.createElement("div");
  meta.className = "ad-banner__meta";
  meta.textContent = "Sponsored · Learn more";
  body.append(title, meta);

  const close = document.createElement("button");
  close.className = "ad-banner__close";
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Close sponsored banner");
  close.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearInterval(rotationId);
    panel.replaceChildren();
  });

  banner.append(image, body, close);
  panel.append(banner);
  if (ad._id) fetch(`${ADS_ENDPOINT}/${encodeURIComponent(ad._id)}/impression`, { method: "POST" }).catch(() => {});
}

async function loadAds() {
  if (!panel || matchMedia("(max-height: 560px)").matches) return;
  try {
    const response = await fetch(ADS_ENDPOINT, { signal: AbortSignal.timeout(5000) });
    const payload = await response.json();
    ads = Array.isArray(payload) ? payload.filter((ad) => ad && ad.ad_text) : [];
    if (!ads.length) return;
    renderAd();
    if (ads.length > 1) {
      rotationId = setInterval(() => {
        activeIndex = (activeIndex + 1) % ads.length;
        renderAd();
      }, ROTATION_MS);
    }
  } catch {
    // Ads are optional; gameplay continues unchanged when the service is unavailable.
  }
}

loadAds();
