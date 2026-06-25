/* =========================================================
   PayRu — Home page interactive widgets
   (hero rate carousel, live rate ticker, testimonial slider)
   ========================================================= */

const RATE_CHANGE = { BTC: 2.4, ETH: -1.1, USDT: 0.01, BNB: 1.6, USDC: -0.02 };
const SAMPLE_QTY = { BTC: 0.01, ETH: 0.25, USDT: 250, BNB: 1, USDC: 250 };

document.addEventListener("DOMContentLoaded", () => {
  if (!window.PayruDB) return;
  initCryptoCardStack();
  initTicker();
  initLiveRates();
  initTestimonialSlider();
  initAnimations();
});

/* ---------- Live rates sliding cards ---------- */
function initLiveRates() {
  const track = document.getElementById("ratesTrack");
  if (!track) return;

  const assets = Object.values(PayruDB.ASSETS);
  const rate = PayruDB.getSellRate();

  track.innerHTML = assets
    .map((a) => {
      const change = RATE_CHANGE[a.symbol] || 0;
      const isUp = change >= 0;
      const sign = isUp ? "+" : "";
      return `
        <div class="rate-slide-card">
          <div class="rate-slide-header">
            <div class="coin-icon" data-asset="${a.symbol}">${a.glyph}</div>
            <div class="rate-slide-meta">
              <strong>${a.name}</strong>
              <span>${a.symbol} &middot; ${a.network.split(" (")[0]}</span>
            </div>
            <div class="rate-live-indicator">
              <span class="rate-blink-dot"></span> LIVE
            </div>
          </div>
          <span class="rate-slide-price">${PayruDB.formatUSD(a.price)}</span>
          <span class="rate-slide-ngn">≈ ${PayruDB.formatNaira(a.price * rate)} per ${a.symbol}</span>
          <div class="rate-slide-change">
            <span class="rate-trend ${isUp ? "up" : "down"}">
              <i class='bx ${isUp ? "bx-trending-up" : "bx-trending-down"}'></i>
              ${sign}${Math.abs(change).toFixed(2)}% 24h
            </span>
            <a href="register.html" class="btn btn-primary btn-sm">Convert</a>
          </div>
        </div>`;
    })
    .join("");

  initRatesSlider(assets.length);
}

function initRatesSlider(numCards) {
  const track = document.getElementById("ratesTrack");
  const prevBtn = document.getElementById("ratesPrev");
  const nextBtn = document.getElementById("ratesNext");
  const dotsWrap = document.getElementById("ratesDots");
  if (!track || !prevBtn || !nextBtn) return;

  const cardsPerView = () =>
    window.innerWidth >= 1100 ? 3 : window.innerWidth >= 640 ? 2 : 1;

  let current = 0;
  let timer;

  function maxSlide() {
    return numCards - cardsPerView();
  }

  function getStepPx() {
    const card = track.querySelector(".rate-slide-card");
    if (!card) return 0;
    const style = getComputedStyle(track);
    const gap = parseFloat(style.gap) || 20;
    return card.offsetWidth + gap;
  }

  function goTo(idx) {
    const max = maxSlide();
    current = Math.max(0, Math.min(max, idx));
    track.style.transform = `translateX(-${current * getStepPx()}px)`;
    if (dotsWrap) {
      dotsWrap.querySelectorAll(".dot").forEach((d, i) =>
        d.classList.toggle("active", i === current)
      );
    }
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current >= max;
  }

  function restartAutoplay() {
    clearInterval(timer);
    timer = setInterval(() => {
      goTo(current >= maxSlide() ? 0 : current + 1);
    }, 3500);
  }

  prevBtn.addEventListener("click", () => { goTo(current - 1); restartAutoplay(); });
  nextBtn.addEventListener("click", () => { goTo(current + 1); restartAutoplay(); });

  // Dots
  if (dotsWrap) {
    const total = numCards - cardsPerView() + 1;
    dotsWrap.innerHTML = Array.from({ length: total }, (_, i) =>
      `<button class="dot ${i === 0 ? "active" : ""}" data-index="${i}" aria-label="Rate slide ${i + 1}"></button>`
    ).join("");
    dotsWrap.querySelectorAll(".dot").forEach((dot) => {
      dot.addEventListener("click", () => { goTo(+dot.dataset.index); restartAutoplay(); });
    });
  }

  // Pause on hover
  const viewport = document.querySelector(".rates-slider-viewport");
  if (viewport) {
    viewport.addEventListener("mouseenter", () => clearInterval(timer));
    viewport.addEventListener("mouseleave", restartAutoplay);
  }

  goTo(0);
  restartAutoplay();
}

/* ---------- Hero crypto card stack ---------- */
function initCryptoCardStack() {
  const stack = document.getElementById("cryptoCardStack");
  if (!stack) return;

  const assets = Object.values(PayruDB.ASSETS);
  let isAnimating = false;
  let timer;

  // Inject cards (in reverse so first asset ends on top)
  const hint = stack.querySelector(".card-stack-hint");
  assets
    .slice()
    .reverse()
    .forEach((a, revIdx) => {
      const pos = assets.length - 1 - revIdx;
      const card = document.createElement("div");
      card.className = "crypto-card";
      card.dataset.asset = a.symbol;
      card.dataset.pos = String(pos);
      card.innerHTML = `
        <div class="crypto-card-top">
          <div class="crypto-card-brand">PayRu</div>
          <div class="crypto-card-chip"></div>
        </div>
        <div class="crypto-card-center">
          <div class="coin-icon" data-asset="${a.symbol}">${a.glyph}</div>
          <div class="crypto-card-coin-name">
            <strong>${a.name}</strong>
            <span>${a.symbol}</span>
          </div>
        </div>
        <div class="crypto-card-bottom">
          <div class="crypto-card-label">Supported on PayRu</div>
          <div class="crypto-card-network">${a.network.split(" (")[0]}</div>
        </div>`;
      stack.insertBefore(card, hint);
    });

  function advance() {
    if (isAnimating) return;
    isAnimating = true;

    const cards = [...stack.querySelectorAll(".crypto-card")];
    const front = cards.find((c) => c.dataset.pos === "0");
    if (!front) { isAnimating = false; return; }

    // Slide front card off
    front.classList.add("sliding-out");

    setTimeout(() => {
      front.classList.remove("sliding-out");
      // Rotate positions: 0 → (n-1), everyone else -1
      const n = cards.length;
      cards.forEach((c) => {
        const p = parseInt(c.dataset.pos, 10);
        c.dataset.pos = String(p === 0 ? n - 1 : p - 1);
      });
      isAnimating = false;
    }, 650);
  }

  function restartAutoplay() {
    clearInterval(timer);
    timer = setInterval(advance, 3200);
  }

  stack.addEventListener("click", () => {
    clearInterval(timer);
    advance();
    restartAutoplay();
  });

  restartAutoplay();
}

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

/* ---------- Scroll animations — AOS handles reveal, we just kick particles ---------- */
function initAnimations() {
  // Refresh AOS after any dynamic content is ready
  if (typeof AOS !== "undefined") {
    AOS.refresh();
  }
  initHeroParticles();
}

function initHeroParticles() {
  if (typeof tsParticles === "undefined") return;
  if (!document.getElementById("hero-particles")) return;

  tsParticles.load("hero-particles", {
    background: { color: { value: "transparent" } },
    fpsLimit: 60,
    interactivity: {
      events: {
        onHover: { enable: true, mode: "grab" },
        onClick: { enable: true, mode: "push" },
        resize: true,
      },
      modes: {
        grab: { distance: 160, links: { opacity: 0.6 } },
        push: { quantity: 3 },
      },
    },
    particles: {
      color: { value: ["#00E0A8", "#7C6CF6", "#4EA1FF"] },
      links: {
        color: "#00E0A8",
        distance: 150,
        enable: true,
        opacity: 0.12,
        width: 1,
      },
      move: {
        direction: "none",
        enable: true,
        outModes: { default: "bounce" },
        random: true,
        speed: 1.4,
        straight: false,
      },
      number: {
        density: { enable: true, area: 800 },
        value: 55,
      },
      opacity: { value: { min: 0.2, max: 0.55 } },
      shape: { type: "circle" },
      size: { value: { min: 1, max: 3.5 } },
    },
    detectRetina: true,
  });
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
