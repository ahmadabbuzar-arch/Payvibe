/* ==========================================================================
   PayVibe — app.js
   Vanilla JS, WebView-friendly. Modules: Storage, Copy, Sound, UPI, QR,
   History, Demo, Navigation, App bootstrap.
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------
     STORAGE MODULE
     Wraps localStorage. Never stores PIN/OTP/passwords/credentials.
     ------------------------------------------------------------------ */
  const Storage = {
    KEYS: {
      SETTINGS: "payvibe.settings",
      HISTORY: "payvibe.history",
      FAVORITES: "payvibe.favorites",
      DEFAULT_SOUND: "payvibe.defaultSound",
      PERSONALITY: "payvibe.personality",
      SOUND_MODE: "payvibe.soundMode"
    },
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        console.warn("Storage.get failed", key, e);
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.warn("Storage.set failed", key, e);
        return false;
      }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (e) { /* noop */ }
    }
  };

  const DEFAULT_SETTINGS = {
    soundEnabled: true,
    funMode: true,
    haptic: true,
    demoMode: true,
    theme: "dark"
  };

  let settings = Object.assign({}, DEFAULT_SETTINGS, Storage.get(Storage.KEYS.SETTINGS, {}));
  function saveSettings() { Storage.set(Storage.KEYS.SETTINGS, settings); }

  let personality = Storage.get(Storage.KEYS.PERSONALITY, "funny");
  let soundMode = Storage.get(Storage.KEYS.SOUND_MODE, "random"); // random | favorite | silent
  let favorites = new Set(Storage.get(Storage.KEYS.FAVORITES, []));
  let defaultSoundId = Storage.get(Storage.KEYS.DEFAULT_SOUND, null);
  let history_ = Storage.get(Storage.KEYS.HISTORY, []);

  function saveFavorites() { Storage.set(Storage.KEYS.FAVORITES, Array.from(favorites)); }
  function saveHistory() { Storage.set(Storage.KEYS.HISTORY, history_); }

  /* ------------------------------------------------------------------
     FUNNY COPY ENGINE — personality-driven Roman Hinglish micro-copy
     ------------------------------------------------------------------ */
  const Copy = {
    personalities: {
      funny: {
        label: "Funny",
        desc: "Light jokes, good vibes.",
        home: { title: "Aaj kitna paisa udaana hai?", subtitle: "Chalo vibe karte hain." },
        send: "Kisko ameer banana hai?",
        request: "Kisse paise lene hain?",
        amount: "Kitne rupaye sacrifice karne hain?",
        scan: "QR pakdo, payment karo.",
        processing: [
          "Paisa pack ho raha hai...",
          "UPI wale uncle se baat ho rahi hai...",
          "Paisa safar par hai...",
          "Bas pahunchne wala hai..."
        ],
        success: "Ho gaya bhai!",
        failure: "Arre yaar, payment nahi hui.",
        noUpiApp: "Bhai, koi UPI app to chahiye.",
        noInternet: "Internet so raha hai. Thodi der baad aana.",
        emptyHistory: "Abhi tak ek rupaya bhi nahi udaaya?"
      },
      savage: {
        label: "Savage",
        desc: "No filter, straight talk.",
        home: { title: "Paisa udaane ka mood hai?", subtitle: "Der mat kar, seedha bol." },
        send: "Bata, kisko nipta na hai paise se?",
        request: "Kisse vasooli karni hai?",
        amount: "Kitna nikal raha hai jeb se?",
        scan: "QR scan kar, bahane band kar.",
        processing: [
          "Paisa nikal raha hai, sabar rakh...",
          "Bank thoda slow hai, tera nahi...",
          "Transaction chal raha hai, chill kar...",
          "Ek second, ho hi raha hai..."
        ],
        success: "Ho gaya, khatam kissa.",
        failure: "Nahi hua bhai. Bank ne mana kar diya.",
        noUpiApp: "UPI app daal pehle, phir aana.",
        noInternet: "Net nahi hai. Router ko jaga.",
        emptyHistory: "Ek transaction bhi nahi? Seriously?"
      },
      deadpan: {
        label: "Deadpan",
        desc: "Flat tone, dry humor.",
        home: { title: "Payment karna hai?", subtitle: "Theek hai." },
        send: "Paise bhejne hain.",
        request: "Paise mangwane hain.",
        amount: "Amount daalo.",
        scan: "QR scan karo.",
        processing: ["Processing.", "Ho raha hai.", "Ruko.", "Almost done."],
        success: "Ho gaya.",
        failure: "Nahi hua.",
        noUpiApp: "UPI app nahi mila.",
        noInternet: "Internet nahi hai.",
        emptyHistory: "Koi transaction nahi hai."
      },
      gamer: {
        label: "Gamer",
        desc: "Level up your payments.",
        home: { title: "Aaj ka mission: paisa transfer.", subtitle: "Loadout ready?" },
        send: "Target select karo.",
        request: "Resource request bhejo.",
        amount: "Amount load karo.",
        scan: "QR scan karo, XP milega... shayad.",
        processing: [
          "Loading transaction...",
          "Server se connect ho raha hai...",
          "Lag thoda zyada hai...",
          "Almost respawn ho raha hai..."
        ],
        success: "LEVEL COMPLETE!",
        failure: "GAME OVER. Retry karo.",
        noUpiApp: "UPI app install karo, warna game start nahi hoga.",
        noInternet: "Connection lost. Wifi check karo.",
        emptyHistory: "Koi match khela hi nahi ab tak?"
      },
      attitude: {
        label: "Attitude",
        desc: "Bold, confident tone.",
        home: { title: "Boss mode ON.", subtitle: "Paisa bhejna hai toh style se." },
        send: "Kisko bhejna hai, seedha bata.",
        request: "Vasooli ka time hai.",
        amount: "Amount bata, waqt kam hai.",
        scan: "QR scan kar, dikhaa de speed.",
        processing: [
          "Paisa move ho raha hai...",
          "Boss, thoda sabar...",
          "System kaam kar raha hai...",
          "Bas ho hi gaya samajh..."
        ],
        success: "Payment ho gaya boss!",
        failure: "Nahi hua boss, dobara try kar.",
        noUpiApp: "Boss, UPI app to hona chahiye.",
        noInternet: "Internet down hai, boss.",
        emptyHistory: "Ek bhi transaction nahi, boss?"
      }
    },
    current() {
      return this.personalities[personality] || this.personalities.funny;
    },
    // Returns copy in fun mode, or a plain professional fallback when fun mode is off.
    plain: {
      home: { title: "Send and request money", subtitle: "Pick an action to continue." },
      send: "Send money",
      request: "Request money",
      amount: "Enter amount",
      scan: "Scan a UPI QR code",
      processing: ["Processing your payment..."],
      success: "Payment sent",
      failure: "Payment failed",
      noUpiApp: "No UPI app was found on this device.",
      noInternet: "You're offline. Check your connection and try again.",
      emptyHistory: "No transactions yet."
    },
    get(key) {
      if (!settings.funMode) {
        return this.plain[key];
      }
      return this.current()[key];
    },
    randomProcessingMessage() {
      const list = this.get("processing");
      return list[Math.floor(Math.random() * list.length)];
    }
  };

  /* ------------------------------------------------------------------
     SOUND MANAGER
     50 local mp3 files. Only one plays at a time, ever.
     ------------------------------------------------------------------ */
  const SoundManager = (function () {
    const TOTAL = 50;
    const CATEGORIES = ["funny", "savage", "desi", "attitude"];
    const NAME_WORDS = [
      "Boss Alert", "Cha-Ching", "Money Dance", "Vibe Check", "Paisa Party",
      "Uda Diya", "Jackpot", "Deal Done", "Full Paisa Vasool", "Style Statement"
    ];

    const sounds = [];
    for (let i = 1; i <= TOTAL; i++) {
      const idx = String(i).padStart(2, "0");
      sounds.push({
        id: "funny_payment_" + idx,
        file: "assets/sounds/funny_payment_" + idx + ".mp3",
        name: NAME_WORDS[i % NAME_WORDS.length] + " " + idx,
        category: CATEGORIES[i % CATEGORIES.length],
        duration: null // populated lazily once metadata loads
      });
    }

    let currentAudio = null;
    let currentPlayingId = null;
    const listeners = new Set();

    function notify() { listeners.forEach(fn => { try { fn(currentPlayingId); } catch (e) {} }); }

    function stopSound() {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      currentPlayingId = null;
      notify();
    }

    function playSound(id) {
      const s = sounds.find(s => s.id === id);
      if (!s || !settings.soundEnabled) return;
      // Enforce single concurrent playback across the whole app.
      stopSound();
      currentAudio = new Audio(s.file);
      currentAudio.addEventListener("ended", () => { currentPlayingId = null; notify(); });
      currentAudio.play().catch(() => { /* autoplay restrictions; ignore silently */ });
      currentPlayingId = id;
      notify();
    }

    function previewSound(id) {
      if (currentPlayingId === id) {
        stopSound();
      } else {
        playSound(id);
      }
    }

    function playRandomSound() {
      const pick = sounds[Math.floor(Math.random() * sounds.length)];
      playSound(pick.id);
      return pick;
    }

    function setDefaultSound(id) {
      defaultSoundId = id;
      Storage.set(Storage.KEYS.DEFAULT_SOUND, id);
    }

    function setSoundEnabled(enabled) {
      settings.soundEnabled = !!enabled;
      saveSettings();
      if (!enabled) stopSound();
    }

    // Resolves which sound to use for a payment success event,
    // based on the current Sound screen mode (random / favorite / silent).
    function resolveSoundForEvent() {
      if (soundMode === "silent" || !settings.soundEnabled) return null;
      if (soundMode === "favorite") {
        const favId = defaultSoundId || Array.from(favorites)[0];
        return sounds.find(s => s.id === favId) || sounds[0];
      }
      // random
      return sounds[Math.floor(Math.random() * sounds.length)];
    }

    function toggleFavorite(id) {
      if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
      saveFavorites();
    }

    return {
      list: () => sounds,
      byCategory: (cat) => cat === "all" ? sounds : sounds.filter(s => s.category === cat),
      playSound, playRandomSound, stopSound, previewSound,
      setDefaultSound, setSoundEnabled, resolveSoundForEvent,
      toggleFavorite,
      isFavorite: (id) => favorites.has(id),
      isPlaying: (id) => currentPlayingId === id,
      getCurrentPlayingId: () => currentPlayingId,
      onChange: (fn) => listeners.add(fn)
    };
  })();

  /* ------------------------------------------------------------------
     UPI SERVICE
     Builds standard UPI deep links. Never fakes confirmation.
     ------------------------------------------------------------------ */
  const UpiService = {
    UPI_ID_RE: /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/,

    validateUpiId(id) {
      if (!id || typeof id !== "string") return false;
      return this.UPI_ID_RE.test(id.trim());
    },

    validateAmount(amount) {
      const n = Number(amount);
      return Number.isFinite(n) && n > 0 && n <= 200000;
    },

    buildUri({ pa, pn, am, tn }) {
      const params = new URLSearchParams();
      params.set("pa", pa.trim());
      if (pn) params.set("pn", pn);
      if (am) params.set("am", Number(am).toFixed(2));
      params.set("cu", "INR");
      if (tn) params.set("tn", tn);
      return "upi://pay?" + params.toString();
    },

    // Attempts to hand off to an installed UPI app.
    // A web app cannot verify the outcome of this handoff reliably —
    // returning to the page, closing the app, or a timeout are NOT proof
    // of success or failure. We only know the link was launched.
    attemptPayment(uri) {
      return new Promise((resolve) => {
        if (!navigator.onLine) {
          resolve({ launched: false, reason: "offline" });
          return;
        }
        try {
          window.location.href = uri;
          // We cannot know if an app actually opened. Resolve optimistically
          // that the handoff was attempted; UI must not claim success.
          setTimeout(() => resolve({ launched: true }), 600);
        } catch (e) {
          resolve({ launched: false, reason: "error" });
        }
      });
    }
  };

  /* ------------------------------------------------------------------
     TRANSACTION HISTORY
     ------------------------------------------------------------------ */
  const History = {
    add(tx) {
      const record = Object.assign({
        id: "tx_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        timestamp: Date.now()
      }, tx);
      history_.unshift(record);
      saveHistory();
      return record;
    },
    all() { return history_; },
    byId(id) { return history_.find(t => t.id === id); },
    clear() { history_ = []; saveHistory(); },
    filtered({ status, query }) {
      return history_.filter(t => {
        if (status && status !== "all" && t.status !== status) return false;
        if (query) {
          const q = query.toLowerCase();
          if (!(t.recipient || "").toLowerCase().includes(q) &&
              !(t.upiId || "").toLowerCase().includes(q)) return false;
        }
        return true;
      });
    }
  };

  const DEMO_RECENT = [
    { recipient: "Rahul Bhai", upiId: "rahul@okhdfc", amount: 500, status: "success", timestamp: Date.now() - 3600e3, demo: true },
    { recipient: "Chai Shop", upiId: "chaishop@okaxis", amount: 120, status: "success", timestamp: Date.now() - 7200e3, demo: true },
    { recipient: "Friend", upiId: "friend@okicici", amount: 1000, status: "success", timestamp: Date.now() - 86400e3, demo: true }
  ];

  /* ------------------------------------------------------------------
     QR SCANNER
     Uses the native BarcodeDetector API where available (no external
     library needed). Falls back gracefully when camera/detector is
     unavailable, e.g. inside a restricted WebView.
     ------------------------------------------------------------------ */
  const QrScanner = (function () {
    let stream = null;
    let detector = null;
    let rafId = null;
    let videoEl = null;
    let onResult = null;

    async function start(video, resultCallback) {
      videoEl = video;
      onResult = resultCallback;
      const fallback = document.getElementById("scan-fallback");

      if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getUserMedia) {
        showFallback();
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        video.srcObject = stream;
        await video.play();
        fallback.hidden = true;

        if ("BarcodeDetector" in window) {
          detector = new window.BarcodeDetector({ formats: ["qr_code"] });
          scanLoop();
        }
        // If BarcodeDetector isn't supported, camera preview still shows;
        // user can use the demo QR button to proceed.
      } catch (e) {
        showFallback();
      }
    }

    function showFallback() {
      const fallback = document.getElementById("scan-fallback");
      if (fallback) fallback.hidden = false;
    }

    async function scanLoop() {
      if (!detector || !videoEl) return;
      try {
        const codes = await detector.detect(videoEl);
        if (codes && codes.length && onResult) {
          onResult(codes[0].rawValue);
          stop();
          return;
        }
      } catch (e) { /* detection frame failed, keep trying */ }
      rafId = requestAnimationFrame(scanLoop);
    }

    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
      }
      detector = null;
    }

    // Parses a scanned UPI QR string (upi://pay?...) into fields.
    function parseUpiQr(text) {
      try {
        const url = new URL(text);
        return {
          pa: url.searchParams.get("pa") || "",
          pn: url.searchParams.get("pn") || "",
          am: url.searchParams.get("am") || "",
          tn: url.searchParams.get("tn") || ""
        };
      } catch (e) {
        return null;
      }
    }

    return { start, stop, parseUpiQr };
  })();

  /* ------------------------------------------------------------------
     UI HELPERS
     ------------------------------------------------------------------ */
  function fmtRupee(n) {
    const num = Number(n) || 0;
    return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  function fmtDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " · " +
      d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  function initials(name) {
    if (!name) return "?";
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  }

  function toast(msg, ms) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), ms || 2600);
  }

  function haptic(pattern) {
    if (!settings.haptic) return;
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern || 12); } catch (e) { /* noop */ }
    }
  }

  function spawnParticles(container) {
    if (!container) return;
    for (let i = 0; i < 10; i++) {
      const p = document.createElement("span");
      p.className = "particle";
      p.style.left = (45 + Math.random() * 10) + "%";
      p.style.top = "50%";
      p.style.animationDelay = (Math.random() * 0.3) + "s";
      container.appendChild(p);
      setTimeout(() => p.remove(), 1500);
    }
  }

  /* ------------------------------------------------------------------
     NAVIGATION
     ------------------------------------------------------------------ */
  const Nav = (function () {
    const stack = ["home"];
    const screensEl = document.getElementById("screens");

    function show(name, opts) {
      opts = opts || {};
      document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
      const target = document.getElementById("screen-" + name);
      if (!target) { console.warn("Unknown screen", name); return; }
      target.classList.add("active");
      screensEl.scrollTop = 0;

      document.querySelectorAll(".nav-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.nav === name);
      });

      if (!opts.replace) {
        if (stack[stack.length - 1] !== name) stack.push(name);
      } else {
        stack[stack.length - 1] = name;
      }

      onScreenEnter(name);
    }

    function back() {
      if (stack.length > 1) {
        stack.pop();
        show(stack[stack.length - 1], { replace: true });
      } else {
        show("home", { replace: true });
      }
    }

    return { show, back };
  })();

  function onScreenEnter(name) {
    if (name === "home") renderHome();
    if (name === "sounds") renderSounds();
    if (name === "history") renderHistory();
    if (name === "personality") renderPersonality();
    if (name === "profile") renderProfileMeta();
    if (name === "settings") syncSettingsUI();
    if (name === "scan") startScanFlow();
    else QrScanner.stop();
  }

  /* ------------------------------------------------------------------
     RENDER: HOME
     ------------------------------------------------------------------ */
  function renderHome() {
    const c = Copy.get("home");
    document.getElementById("home-title").textContent = c.title;
    document.getElementById("home-subtitle").textContent = c.subtitle;

    const list = document.getElementById("recent-list");
    const real = History.all().filter(t => !t.demo).slice(0, 3);
    const items = real.length ? real : DEMO_RECENT;
    const demoTagEl = document.querySelector(".section-head .demo-tag");
    demoTagEl.style.display = real.length ? "none" : "inline-block";

    list.innerHTML = "";
    items.forEach(t => list.appendChild(txRowEl(t, { navigable: !t.demo })));
  }

  function txRowEl(t, opts) {
    opts = opts || {};
    const row = document.createElement(opts.navigable ? "button" : "div");
    row.className = "tx-row";
    row.innerHTML = `
      <span class="tx-avatar">${initials(t.recipient)}</span>
      <span class="tx-info">
        <span class="tx-name">${escapeHtml(t.recipient || "Unknown")}</span>
        <span class="tx-meta">${t.demo ? "Demo · " : ""}${fmtDate(t.timestamp)}</span>
      </span>
      <span class="tx-amount">${fmtRupee(t.amount)}
        <span class="tx-status ${t.status}">${(t.status || "").toUpperCase()}</span>
      </span>`;
    if (opts.navigable) {
      row.addEventListener("click", () => openTxDetail(t.id));
    }
    return row;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ------------------------------------------------------------------
     RENDER: SOUNDS
     ------------------------------------------------------------------ */
  let currentSoundCat = "all";

  function renderSounds() {
    const list = document.getElementById("sound-list");
    list.innerHTML = "";
    SoundManager.byCategory(currentSoundCat).forEach(s => {
      list.appendChild(soundCardEl(s));
    });

    document.querySelectorAll("[data-sound-mode]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.soundMode === soundMode);
    });

    document.getElementById("pv-my-sound").textContent =
      soundMode === "random" ? "Random" : soundMode === "favorite" ? "Favorite" : "Silent";
  }

  function soundCardEl(s) {
    const card = document.createElement("div");
    card.className = "sound-card";
    card.dataset.id = s.id;
    const isFav = SoundManager.isFavorite(s.id);
    const isDefault = defaultSoundId === s.id;
    card.innerHTML = `
      <button class="sound-play-btn" aria-label="Preview ${escapeHtml(s.name)}">
        <svg class="icon"><use href="#icon-play"/></svg>
      </button>
      <span class="sound-info">
        <span class="sound-name">${escapeHtml(s.name)}</span>
        <span class="sound-meta">${s.category.charAt(0).toUpperCase() + s.category.slice(1)}</span>
      </span>
      <span class="waveform">${Array.from({length:5}).map((_,i)=>`<span style="height:${6+ (i%3)*4}px"></span>`).join("")}</span>
      <button class="sound-fav-btn ${isFav ? "active" : ""}" aria-label="Favorite">
        <svg class="icon"><use href="#icon-favorite"/></svg>
      </button>
      <button class="sound-use-btn ${isDefault ? "active" : ""}">${isDefault ? "In use" : "Use"}</button>
    `;

    const playBtn = card.querySelector(".sound-play-btn");
    playBtn.addEventListener("click", () => SoundManager.previewSound(s.id));

    card.querySelector(".sound-fav-btn").addEventListener("click", (e) => {
      SoundManager.toggleFavorite(s.id);
      e.currentTarget.classList.toggle("active");
    });

    card.querySelector(".sound-use-btn").addEventListener("click", (e) => {
      SoundManager.setDefaultSound(s.id);
      renderSounds();
      toast(s.name + " set as your sound.");
    });

    return card;
  }

  SoundManager.onChange((playingId) => {
    document.querySelectorAll(".sound-card").forEach(card => {
      const isPlaying = card.dataset.id === playingId;
      card.classList.toggle("playing", isPlaying);
      const btn = card.querySelector(".sound-play-btn use");
      if (btn) btn.setAttribute("href", isPlaying ? "#icon-pause" : "#icon-play");
      card.querySelector(".sound-play-btn").classList.toggle("playing", isPlaying);
      const bars = card.querySelectorAll(".waveform span");
      bars.forEach((b, i) => {
        b.style.height = isPlaying ? (6 + Math.random() * 14) + "px" : (6 + (i % 3) * 4) + "px";
      });
    });
  });

  // Animate waveform bars while any sound is playing.
  setInterval(() => {
    const playingCard = document.querySelector(".sound-card.playing");
    if (!playingCard) return;
    playingCard.querySelectorAll(".waveform span").forEach(b => {
      b.style.height = (5 + Math.random() * 15) + "px";
    });
  }, 160);

  document.getElementById("sound-cats").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    currentSoundCat = btn.dataset.cat;
    document.querySelectorAll("#sound-cats .tab").forEach(t => t.classList.toggle("active", t === btn));
    renderSounds();
  });

  document.querySelectorAll("[data-sound-mode]").forEach(btn => {
    btn.addEventListener("click", () => {
      soundMode = btn.dataset.soundMode;
      Storage.set(Storage.KEYS.SOUND_MODE, soundMode);
      renderSounds();
    });
  });

  /* ------------------------------------------------------------------
     RENDER: PERSONALITY
     ------------------------------------------------------------------ */
  function renderPersonality() {
    const grid = document.getElementById("personality-grid");
    grid.innerHTML = "";
    Object.entries(Copy.personalities).forEach(([key, p]) => {
      const card = document.createElement("button");
      card.className = "personality-card" + (key === personality ? " active" : "");
      card.innerHTML = `<span class="p-name">${p.label}</span><span class="p-desc">${p.desc}</span>`;
      card.addEventListener("click", () => {
        personality = key;
        Storage.set(Storage.KEYS.PERSONALITY, key);
        renderPersonality();
        document.getElementById("pv-personality").textContent = p.label;
        toast(p.label + " personality selected.");
      });
      grid.appendChild(card);
    });
  }

  function renderProfileMeta() {
    document.getElementById("pv-personality").textContent = Copy.current().label;
    document.getElementById("pv-my-sound").textContent =
      soundMode === "random" ? "Random" : soundMode === "favorite" ? "Favorite" : "Silent";
    document.getElementById("fun-mode-toggle").checked = settings.funMode;
  }

  /* ------------------------------------------------------------------
     RENDER: HISTORY
     ------------------------------------------------------------------ */
  let historyFilter = "all";
  let historyQuery = "";

  function renderHistory() {
    const list = document.getElementById("history-list");
    const empty = document.getElementById("history-empty");
    const items = History.filtered({ status: historyFilter, query: historyQuery });
    list.innerHTML = "";
    if (!items.length) {
      empty.hidden = false;
      empty.querySelector("p").textContent = Copy.get("emptyHistory");
    } else {
      empty.hidden = true;
      items.forEach(t => list.appendChild(txRowEl(t, { navigable: true })));
    }
  }

  document.getElementById("history-search").addEventListener("input", (e) => {
    historyQuery = e.target.value;
    renderHistory();
  });

  document.getElementById("history-filters").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    historyFilter = btn.dataset.filter;
    document.querySelectorAll("#history-filters .tab").forEach(t => t.classList.toggle("active", t === btn));
    renderHistory();
  });

  function openTxDetail(id) {
    const t = History.byId(id);
    if (!t) return;
    const card = document.getElementById("tx-detail-card");
    card.innerHTML = `
      <div class="confirm-row"><span>Amount</span><strong>${fmtRupee(t.amount)}</strong></div>
      <div class="confirm-row"><span>Recipient</span><strong>${escapeHtml(t.recipient || "—")}</strong></div>
      <div class="confirm-row"><span>UPI ID</span><strong>${escapeHtml(t.upiId || "—")}</strong></div>
      <div class="confirm-row"><span>Status</span><strong>${(t.status || "—").toUpperCase()}</strong></div>
      <div class="confirm-row"><span>Date/time</span><strong>${fmtDate(t.timestamp)}</strong></div>
      <div class="confirm-row"><span>Sound used</span><strong>${escapeHtml(t.soundName || "—")}</strong></div>
      <div class="confirm-row"><span>Message shown</span><strong>${escapeHtml(t.message || "—")}</strong></div>
    `;
    Nav.show("tx-detail");
  }

  /* ------------------------------------------------------------------
     RENDER: SETTINGS
     ------------------------------------------------------------------ */
  function syncSettingsUI() {
    document.getElementById("setting-sound").checked = settings.soundEnabled;
    document.getElementById("setting-fun").checked = settings.funMode;
    document.getElementById("setting-haptic").checked = settings.haptic;
    document.getElementById("setting-demo").checked = settings.demoMode;
    updateDemoBadge();
  }

  function updateDemoBadge() {
    document.getElementById("demo-badge").style.display = settings.demoMode ? "block" : "none";
  }

  document.getElementById("setting-sound").addEventListener("change", (e) => {
    SoundManager.setSoundEnabled(e.target.checked);
  });
  document.getElementById("setting-fun").addEventListener("change", (e) => {
    settings.funMode = e.target.checked;
    saveSettings();
    document.getElementById("fun-mode-toggle").checked = settings.funMode;
    renderHome();
  });
  document.getElementById("fun-mode-toggle").addEventListener("change", (e) => {
    settings.funMode = e.target.checked;
    saveSettings();
    document.getElementById("setting-fun").checked = settings.funMode;
    renderHome();
  });
  document.getElementById("setting-haptic").addEventListener("change", (e) => {
    settings.haptic = e.target.checked;
    saveSettings();
  });
  document.getElementById("setting-demo").addEventListener("change", (e) => {
    settings.demoMode = e.target.checked;
    saveSettings();
    updateDemoBadge();
  });

  document.getElementById("clear-history-btn").addEventListener("click", () => {
    History.clear();
    toast("Local history cleared.");
    renderHistory();
    renderHome();
  });

  /* ------------------------------------------------------------------
     SEND FLOW
     ------------------------------------------------------------------ */
  document.querySelectorAll(".quick-amounts .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.getElementById("amount").value = chip.dataset.amt;
      document.querySelectorAll(".quick-amounts .chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
    });
  });

  document.getElementById("send-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const upiId = document.getElementById("upi-id").value.trim();
    const amount = document.getElementById("amount").value;
    const note = document.getElementById("note").value.trim();

    const upiErr = document.getElementById("upi-id-error");
    const amtErr = document.getElementById("amount-error");
    upiErr.textContent = ""; amtErr.textContent = "";

    let valid = true;
    if (!UpiService.validateUpiId(upiId)) {
      upiErr.textContent = "Enter a valid UPI ID, e.g. name@bank.";
      valid = false;
    }
    if (!UpiService.validateAmount(amount)) {
      amtErr.textContent = "Enter an amount between ₹1 and ₹2,00,000.";
      valid = false;
    }
    if (!valid) { haptic(30); return; }

    startPaymentFlow({ pa: upiId, pn: upiId.split("@")[0], am: amount, tn: note, recipient: upiId.split("@")[0] });
  });

  document.getElementById("request-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const upiId = document.getElementById("req-upi-id").value.trim();
    const amount = document.getElementById("req-amount").value;
    if (!UpiService.validateUpiId(upiId) || !UpiService.validateAmount(amount)) {
      toast("Please check the UPI ID and amount.");
      return;
    }
    toast("Request link ready — share it with " + upiId.split("@")[0] + ".");
    Nav.show("home", { replace: true });
  });

  /* ------------------------------------------------------------------
     PAYMENT FLOW (processing -> success/failure)
     ------------------------------------------------------------------ */
  async function startPaymentFlow(payload) {
    Nav.show("processing", { replace: false });
    const msgEl = document.getElementById("processing-msg");
    let i = 0;
    const msgs = Copy.get("processing");
    msgEl.textContent = msgs[0];
    const interval = setInterval(() => {
      i = (i + 1) % msgs.length;
      msgEl.textContent = msgs[i];
    }, 900);

    if (!navigator.onLine) {
      clearInterval(interval);
      showFailure(Copy.get("noInternet"), payload);
      return;
    }

    const uri = UpiService.buildUri(payload);
    const result = await UpiService.attemptPayment(uri);

    clearInterval(interval);

    if (result.launched) {
      showSuccess(payload);
    } else {
      const reason = result.reason === "offline" ? Copy.get("noInternet") : Copy.get("noUpiApp");
      showFailure(reason, payload);
    }
  }

  function showSuccess(payload) {
    haptic([10, 30, 10]);
    const chosenSound = SoundManager.resolveSoundForEvent();
    const message = Copy.get("success");

    document.getElementById("success-title").textContent = message;
    document.getElementById("success-amount").textContent = fmtRupee(payload.am);
    document.getElementById("success-recipient").textContent = payload.recipient || payload.pa;
    document.getElementById("success-status-note").textContent =
      "Payment initiated. Please verify the transaction in your UPI app.";

    const record = History.add({
      recipient: payload.recipient || payload.pa,
      upiId: payload.pa,
      amount: Number(payload.am),
      note: payload.tn || "",
      status: "initiated",
      demo: settings.demoMode,
      soundName: chosenSound ? chosenSound.name : "Silent",
      message
    });

    const playBtn = document.getElementById("play-sound-btn");
    playBtn.onclick = () => {
      if (chosenSound) SoundManager.playSound(chosenSound.id);
    };
    if (chosenSound && settings.soundEnabled) {
      SoundManager.playSound(chosenSound.id);
    }

    Nav.show("success", { replace: true });
    spawnParticles(document.getElementById("screen-success"));
    renderHome();
  }

  function showFailure(detail, payload) {
    haptic([20, 40, 20, 40]);
    document.getElementById("failure-detail").textContent = detail;
    History.add({
      recipient: (payload && (payload.recipient || payload.pa)) || "Unknown",
      upiId: payload ? payload.pa : "",
      amount: payload ? Number(payload.am) : 0,
      status: "failed",
      demo: settings.demoMode,
      message: Copy.get("failure")
    });
    Nav.show("failure", { replace: true });
    renderHome();
  }

  /* ------------------------------------------------------------------
     SCAN FLOW
     ------------------------------------------------------------------ */
  function startScanFlow() {
    const video = document.getElementById("scan-video");
    document.getElementById("scan-fallback").hidden = true;
    QrScanner.start(video, (rawValue) => {
      const parsed = QrScanner.parseUpiQr(rawValue);
      if (!parsed || !parsed.pa) {
        toast("That doesn't look like a UPI QR code.");
        return;
      }
      openScanConfirm(parsed);
    });
  }

  function openScanConfirm(parsed) {
    document.getElementById("qr-merchant").textContent = parsed.pn || "Merchant";
    document.getElementById("qr-upi").textContent = parsed.pa;
    document.getElementById("qr-amount").textContent = parsed.am ? fmtRupee(parsed.am) : "Enter in app";
    document.getElementById("qr-note").textContent = parsed.tn || "—";

    const payBtn = document.getElementById("qr-pay-btn");
    payBtn.textContent = "PAY" + (parsed.am ? " " + fmtRupee(parsed.am) : "");
    payBtn.onclick = () => {
      startPaymentFlow({
        pa: parsed.pa, pn: parsed.pn, am: parsed.am || "0", tn: parsed.tn,
        recipient: parsed.pn || parsed.pa.split("@")[0]
      });
    };
    Nav.show("scan-confirm");
  }

  document.getElementById("scan-demo-btn").addEventListener("click", () => {
    openScanConfirm({ pa: "chaishop@okaxis", pn: "Chai Shop", am: "120", tn: "Demo QR" });
  });

  /* ------------------------------------------------------------------
     GLOBAL NAVIGATION WIRING
     ------------------------------------------------------------------ */
  document.querySelectorAll("[data-nav]").forEach(el => {
    el.addEventListener("click", () => {
      haptic(8);
      Nav.show(el.dataset.nav);
    });
  });
  document.querySelectorAll("[data-back]").forEach(el => {
    el.addEventListener("click", () => Nav.back());
  });

  document.getElementById("pay-dial-btn").addEventListener("click", () => {
    haptic(10);
    Nav.show("send");
  });

  document.getElementById("play-sound-btn").addEventListener("click", () => {
    // handled per-flow in showSuccess, this is a safe no-op fallback
  });

  // Intercept Android hardware/WebView back button when exposed via popstate.
  window.addEventListener("popstate", () => { Nav.back(); });
  history.pushState({ screen: "home" }, "");
  document.addEventListener("click", () => {
    // Keep a history entry so WebView back-button gestures map to in-app nav.
  });

  /* ------------------------------------------------------------------
     BOOTSTRAP
     ------------------------------------------------------------------ */
  function boot() {
    updateDemoBadge();
    renderHome();
    document.getElementById("pv-personality").textContent = Copy.current().label;

    // Optional PWA behavior — safe no-op in WebView/APK builds that
    // don't support service workers or are served via file://.
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
  if (document.readyState !== "loading") boot();

})();
