/* =========================================================
   PayruExchange — Home page interactive widgets
   (hero rate carousel, live rate ticker, testimonial slider)
   ========================================================= */

const RATE_CHANGE = { BTC: 2.4, ETH: -1.1, USDT: 0.01, BNB: 1.6, USDC: -0.02 };
const SAMPLE_QTY = { BTC: 0.01, ETH: 0.25, USDT: 250, BNB: 1, USDC: 250 };

document.addEventListener("DOMContentLoaded", () => {
  if (!window.PayruDB) return;
  initRateCarousel();
  initTicker();
  initTestimonialSlider();
});

/* ---------- Hero "live rates" carousel ---------- */
function initRateCarousel() {
  const track = document.getElementById("rateTrack");
  const dotsWrap = document.getElementById("rateDots");
  if (!track || !dotsWrap) return;

  const assets = Object.values(PayruDB.ASSETS);
  const rate = PayruDB.getSellRate();

  track.innerHTML = assets
    .map((a) => {
      const change = RATE_CHANGE[a.symbol] || 0;
      const trendClass = change >= 0 ? "up" : "down";
      const trendIcon = change >= 0 ? "bx-trending-up" : "bx-trending-down";
      const qty = SAMPLE_QTY[a.symbol] || 1;
      const ngnValue = qty * a.price * rate;
      return `
      <div class="rate-slide">
        <div class="rate-slide-top">
          <div class="coin-icon" data-asset="${a.symbol}">${a.glyph}</div>
          <div>
            <strong>${a.name}</strong>
            <span>${a.symbol} · ${a.network.split(" (")[0]}</span>
          </div>
          <div class="rate-trend ${trendClass}"><i class='bx ${trendIcon}'></i> ${Math.abs(change).toFixed(2)}%</div>
        </div>
        <div class="rate-slide-price">
          <span class="rate-usd">${PayruDB.formatUSD(a.price)}</span>
          <span class="rate-ngn">1 ${a.symbol} ≈ ${PayruDB.formatNaira(a.price * rate)}</span>
        </div>
        <div class="rate-slide-convert">
          <span>${qty} ${a.symbol} ≈</span>
          <strong>${PayruDB.formatNaira(ngnValue)}</strong>
        </div>
        <div class="rate-slide-actions">
          <a href="register.html" class="btn btn-outline btn-sm">Buy ${a.symbol}</a>
          <a href="register.html" class="btn btn-primary btn-sm">Sell ${a.symbol}</a>
        </div>
      </div>`;
    })
    .join("");

  dotsWrap.innerHTML = assets
    .map((_, i) => `<button class="dot ${i === 0 ? "active" : ""}" data-index="${i}" aria-label="Show rate ${i + 1}"></button>`)
    .join("");

  const total = assets.length;
  let current = 0;
  let timer;

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dotsWrap.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("active", i === current));
  }

  function restartAutoplay() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 4500);
  }

  dotsWrap.querySelectorAll(".dot").forEach((dot) => {
    dot.addEventListener("click", () => {
      goTo(Number(dot.dataset.index));
      restartAutoplay();
    });
  });

  const carousel = document.getElementById("rateCarousel");
  if (carousel && window.matchMedia("(hover: hover)").matches) {
    carousel.addEventListener("mouseenter", () => clearInterval(timer));
    carousel.addEventListener("mouseleave", restartAutoplay);
  }

  restartAutoplay();
}

/* ---------- Live rate ticker (scrolling marquee) ---------- */
function initTicker() {
  const track = document.getElementById("tickerTrack");
  if (!track) return;

  const assets = Object.values(PayruDB.ASSETS);
  const rate = PayruDB.getSellRate();

  const items = assets
    .map((a) => {
      const change = RATE_CHANGE[a.symbol] || 0;
      const trendClass = change >= 0 ? "up" : "down";
      const sign = change >= 0 ? "+" : "";
      return `
      <div class="ticker-item">
        <div class="coin-icon" data-asset="${a.symbol}">${a.glyph}</div>
        <strong>${a.symbol}</strong>
        <span>${PayruDB.formatNaira(a.price * rate)}</span>
        <span class="ticker-change ${trendClass}">${sign}${change.toFixed(2)}%</span>
      </div>`;
    })
    .join("");

  // Duplicate the set so the marquee can loop seamlessly at -50%.
  track.innerHTML = items + items;
}

/* ---------- Testimonial slider ---------- */
function initTestimonialSlider() {
  const track = document.getElementById("testimonialTrack");
  const dotsWrap = document.getElementById("testimonialDots");
  const prevBtn = document.getElementById("testimonialPrev");
  const nextBtn = document.getElementById("testimonialNext");
  if (!track || !dotsWrap || !prevBtn || !nextBtn) return;

  const cards = track.querySelectorAll(".testimonial-card");
  const total = cards.length;
  if (!total) return;

  dotsWrap.innerHTML = Array.from(cards)
    .map((_, i) => `<button class="dot ${i === 0 ? "active" : ""}" data-index="${i}" aria-label="Show testimonial ${i + 1}"></button>`)
    .join("");

  let current = 0;
  let timer;

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dotsWrap.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("active", i === current));
  }

  function restartAutoplay() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 6000);
  }

  prevBtn.addEventListener("click", () => {
    goTo(current - 1);
    restartAutoplay();
  });
  nextBtn.addEventListener("click", () => {
    goTo(current + 1);
    restartAutoplay();
  });
  dotsWrap.querySelectorAll(".dot").forEach((dot) => {
    dot.addEventListener("click", () => {
      goTo(Number(dot.dataset.index));
      restartAutoplay();
    });
  });

  // Only pause-on-hover for devices with real mouse hover. On touch
  // devices "mouseenter" fires once on tap and "mouseleave" never
  // fires again, which would permanently freeze the autoplay after
  // a single slide.
  const slider = document.querySelector(".testimonial-slider");
  if (slider && window.matchMedia("(hover: hover)").matches) {
    slider.addEventListener("mouseenter", () => clearInterval(timer));
    slider.addEventListener("mouseleave", restartAutoplay);
  }

  restartAutoplay();
}
