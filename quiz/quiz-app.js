/**
 * VELORA · Ask Vela Production Quiz Application (9-Screen Conversion Engine)
 * Features:
 * - Zero external AI API required (uses VelaAstro deterministic ephemeris)
 * - Preserves UTM / fbclid / ttclid parameters straight into Shopify Product URL
 * - Fires Meta Pixel (ViewContent, Lead, InitiateCheckout), TikTok Pixel & GA4 events
 * - 7-Day localStorage state persistence (survives browser switches)
 * - Canvas-generated 9:16 Story Share Card
 */
(function () {
  "use strict";

  const CFG = window.VELORA_CONFIG;
  const CATALOG = CFG.CATALOG;
  const STORAGE_KEY = "velora_quiz_state_v1";
  const AVATAR = "./assets/vela_emblem.jpg";

  const QUESTIONS = [
    {
      title: "What's been taking up the most space in your mind lately?",
      opts: [
        "A relationship—or one specific person",
        "Career direction, work pressure, or money",
        "A crossroads decision I keep delaying",
        "Late-night overthinking that won't shut off"
      ]
    },
    {
      title: "And how does carrying that usually leave you feeling?",
      opts: [
        "Drained—I pour out too much for everyone else",
        "Stuck—I have ideas, but my momentum stalls",
        "Anxious in my body—restless hands & tight chest",
        "Wired at night—my body is tired, my mind races"
      ]
    },
    {
      title: "If one shift could happen for you this month, what would help most?",
      opts: [
        "A quieter mind & deeper, calmer sleep",
        "Deeper love, warmth & shared connection",
        "Clear confidence & momentum to make the move",
        "Stronger boundaries & tactile calm under pressure"
      ]
    }
  ];

  const STAT_NAMES = ["Mental Calm", "Boundaries", "Decision Clarity", "Daily Momentum"];

  const state = {
    screen: 0,
    chatStep: 0,
    loadingStep: 0,
    name: "",
    birthday: "",
    birthTime: "",
    gender: "f",
    wearPref: "bracelet", // bracelet | necklace | duo
    q1: null,
    q2: null,
    q3: null,
    activeStone: null,
    supportOn: true,
    tab: 0,
    unlocked: false,
    email: "",
    consent: true,
    emailError: "",
    emailModal: false,
    topicModal: null,
    seenTopics: [],
    runId: "vl_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8)
  };

  let timers = [];
  function clearTimers() {
    timers.forEach(t => clearTimeout(t));
    timers = [];
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---- Attribution & Pixel Tracking ---- */
  function captureAttribution() {
    const out = {};
    try {
      const sp = new URLSearchParams(location.search);
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "ttclid", "gclid"].forEach(k => {
        if (sp.get(k)) out[k] = sp.get(k);
      });
    } catch (_) {}
    return out;
  }
  const ATTRIBUTION = captureAttribution();

  function firePixel(eventName, payload) {
    try {
      if (typeof window.fbq === "function") window.fbq("track", eventName, payload || {});
      if (typeof window.ttq === "object" && window.ttq.track) window.ttq.track(eventName, payload || {});
      if (typeof window.gtag === "function") window.gtag("event", eventName, payload || {});
    } catch (_) {}
  }

  /* ---- State Persistence (7 Days) ---- */
  function saveState() {
    try {
      const snap = Object.assign({}, state, { savedAt: Date.now(), emailModal: false, topicModal: null });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch (_) {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed.savedAt || Date.now() - parsed.savedAt > 7 * 86400 * 1000) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
      Object.keys(state).forEach(k => {
        if (parsed[k] !== undefined) state[k] = parsed[k];
      });
      if (state.screen === 7) state.screen = 6;
      if (state.screen === 1) state.chatStep = 3;
      return true;
    } catch (_) { return false; }
  }

  /* ---- Recommendation Scoring Matrix ---- */
  function recommendSku() {
    const chart = window.VelaAstro.computeChart(state.birthday, state.birthTime);

    // 1. Men's architectural routing rule
    if (state.gender === "m") {
      if (state.wearPref === "duo") return "sku09";
      return (state.q3 === 3 || state.q3 === 0) ? "sku07" : "sku08";
    }

    // 2. Explicit form-factor preferences
    if (state.wearPref === "necklace") return "sku06";
    if (state.wearPref === "duo") return "sku09";

    // 3. Score women's & gender-neutral pieces
    const scores = { sku01: 0, sku02: 0, sku03: 0, sku04: 0, sku05: 0, sku06: 0, sku09: 0 };

    // Elemental bias (+1)
    if (chart.missingElement === "Earth") { scores.sku05 += 1; scores.sku01 += 1; }
    if (chart.missingElement === "Water") { scores.sku02 += 1; scores.sku01 += 1; }
    if (chart.missingElement === "Fire") { scores.sku03 += 1; }
    if (chart.missingElement === "Air") { scores.sku04 += 1; }

    // Q1 life context (+1.5)
    if (state.q1 === 0) { scores.sku02 += 2; scores.sku09 += 1.5; }
    if (state.q1 === 1) { scores.sku03 += 2; scores.sku06 += 1.5; }
    if (state.q1 === 2) { scores.sku04 += 2.5; }
    if (state.q1 === 3) { scores.sku01 += 2.5; }

    // Q2 emotional toll (+1.5)
    if (state.q2 === 2) { scores.sku05 += 2.5; } // restless hands / tight chest -> Kinetic Spinner!
    if (state.q2 === 3) { scores.sku01 += 1.5; }

    // Q3 primary desired shift (+3)
    if (state.q3 === 0) scores.sku01 += 3;
    if (state.q3 === 1) scores.sku02 += 3;
    if (state.q3 === 2) scores.sku03 += 3;
    if (state.q3 === 3) scores.sku05 += 3;

    let best = "sku01";
    Object.keys(scores).forEach(k => {
      if (scores[k] > scores[best]) best = k;
    });
    return best;
  }

  function alternativeChoices(recommended) {
    if (state.gender === "m") {
      return ["sku07", "sku08", "sku09"].sort((a, b) => (a === recommended ? -1 : b === recommended ? 1 : 0));
    }
    const pool = [recommended, "sku01", "sku02", "sku03", "sku05", "sku06", "sku09"];
    return Array.from(new Set(pool)).slice(0, 5);
  }

  /* ---- SVG Natal Wheel ---- */
  function renderWheelSVG(chart) {
    return `
      <svg width="152" height="152" viewBox="0 0 160 160" aria-label="Natal Chart Wheel" style="display:block;margin:6px auto;">
        <circle cx="80" cy="80" r="72" fill="none" stroke="#C9A46A" stroke-width="1" stroke-dasharray="3 3"/>
        <circle cx="80" cy="80" r="56" fill="#FAF7F2" stroke="#231C2E" stroke-width="1.2"/>
        <circle cx="80" cy="80" r="30" fill="none" stroke="#D9CEE8" stroke-width="1"/>
        <line x1="8" y1="80" x2="152" y2="80" stroke="rgba(35,28,46,0.12)" stroke-width="1"/>
        <line x1="80" y1="8" x2="80" y2="152" stroke="rgba(35,28,46,0.12)" stroke-width="1"/>
        <polygon points="80,22 93,67 138,80 93,93 80,138 67,93 22,80 67,67" fill="rgba(201,164,106,0.16)" stroke="#C9A46A" stroke-width="1.2"/>
        <circle cx="108" cy="44" r="5" fill="#231C2E"/>
        <circle cx="48" cy="104" r="4.5" fill="#6A4C8C"/>
        <circle cx="80" cy="80" r="4" fill="#C9A46A"/>
      </svg>
    `;
  }

  /* ---- Header & Footer ---- */
  function renderHeader() {
    const stepLabels = [
      "60s Birth-Chart Matcher",
      "Personal Companion",
      "Step 1 · Arrival Details",
      "Natal Snapshot",
      "Reflection 1 of 3",
      "Reflection 2 of 3",
      "Reflection 3 of 3",
      "Synthesizing Chart",
      "Your Matched Stone"
    ];
    document.getElementById("header").innerHTML = `
      <div class="app-header">
        <div class="header-left">
          ${state.screen > 0 ? `<button class="back-btn" onclick="VelaApp.back()" aria-label="Go back">‹</button>` : ""}
          <img src="${AVATAR}" alt="Vela" class="avatar-sm">
          <div>
            <div class="brand-title">${esc(CFG.BRAND_NAME)} · Ask ${esc(CFG.COMPANION_NAME)}</div>
            <div class="step-sub">${esc(stepLabels[state.screen] || "")}</div>
          </div>
        </div>
        ${state.screen > 0 ? `<button onclick="VelaApp.restart()" style="background:none;border:none;font-size:12px;color:var(--muted);cursor:pointer;text-decoration:underline;">Start over</button>` : ""}
      </div>
    `;
  }

  function renderFooter() {
    const f = document.getElementById("footer");
    if (state.screen === 8) {
      f.innerHTML = `
        <button onclick="VelaApp.downloadShareCard()" style="background:none;border:none;color:var(--ink);font-size:13px;font-weight:700;text-decoration:underline;cursor:pointer;padding:6px 12px;">
          ✦ Save 9:16 Birth-Chart Card for Instagram Stories
        </button>
      `;
    } else {
      f.innerHTML = "";
    }
  }

  function bubble(htmlText) {
    return `
      <div class="bubble-row">
        <img src="${AVATAR}" alt="" class="avatar-sm" style="margin-top:2px;flex:none;">
        <div class="bubble-box">${htmlText}</div>
      </div>
    `;
  }

  function typingBubble() {
    return `
      <div class="bubble-row">
        <img src="${AVATAR}" alt="" class="avatar-sm" style="margin-top:2px;flex:none;">
        <div class="bubble-box"><div class="typing-dots"><span></span><span></span><span></span></div></div>
      </div>
    `;
  }

  /* ---- Screen Renderers ---- */
  function renderScreen() {
    renderHeader();
    renderFooter();
    const box = document.getElementById("scroll");
    const s = state.screen;

    if (s === 0) {
      box.innerHTML = `
        <div class="anim-in" style="min-height:76dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px;">
          <img src="${AVATAR}" alt="Vela" style="width:136px;height:136px;border-radius:50%;object-fit:cover;box-shadow:0 16px 38px rgba(201,164,106,0.24);animation:floatSlow 3.8s ease-in-out infinite;">
          <h1 style="font-family:var(--font-serif);font-size:34px;font-weight:600;line-height:1.15;">Hi, I'm ${esc(CFG.COMPANION_NAME)}.</h1>
          <p style="font-family:var(--font-serif);font-size:20px;color:var(--ink-soft);max-width:310px;line-height:1.35;">
            Let's find the natural stone meant for this chapter of your life.
          </p>
          <p style="font-size:14px;color:var(--muted);max-width:300px;line-height:1.6;">
            I'll read your birth chart and three quick reflections to match the crystal &amp; passive NFC piece your energy needs right now.
          </p>
          <div style="font-size:12.5px;font-weight:600;color:var(--gold-deep);margin:2px 0;">
            ✦ Takes about 60 seconds · Free natal snapshot included
          </div>
          <div style="width:100%;max-width:330px;margin-top:4px;">
            <button class="cta-btn" onclick="VelaApp.start()">Find My Crystal →</button>
          </div>
          <p style="font-size:11.5px;color:var(--muted);max-width:280px;line-height:1.5;margin-top:4px;">
            Private &amp; confidential. Your birth details are used solely to personalize your reading.
          </p>
        </div>
      `;
      return;
    }

    if (s === 1) {
      const cs = state.chatStep;
      let html = `<div onclick="VelaApp.skipChat()" style="padding-top:12px;cursor:pointer;">`;
      html += cs >= 1 ? bubble(`Hey, I'm <b>${esc(CFG.COMPANION_NAME)}</b>.`) : typingBubble();
      if (cs >= 1) html += cs >= 2 ? bubble(`Most horoscope apps throw generic daily blurbs at you—and forget what you're actually carrying in real life.`) : typingBubble();
      if (cs >= 2) html += cs >= 3 ? bubble(`Tell me when you arrived, and I'll map your Sun &amp; Moon placements before asking 3 quick questions.`) : typingBubble();
      html += `</div>`;
      if (cs >= 3) {
        html += `<div class="anim-in" style="margin-top:16px;"><button class="cta-btn" onclick="VelaApp.go(2)">Let's Begin →</button><div style="text-align:center;font-size:11.5px;color:var(--muted);margin-top:8px;">Tap anywhere above to skip animations anytime</div></div>`;
      }
      box.innerHTML = html;
      return;
    }

    if (s === 2) {
      const ready = (state.name || "").trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(state.birthday);
      box.innerHTML = `
        <div class="anim-in">
          <h2 style="font-family:var(--font-serif);font-size:26px;font-weight:600;margin-bottom:6px;">Start with your arrival.</h2>
          <p style="font-size:13.5px;color:var(--muted);line-height:1.55;margin-bottom:18px;">
            Your birthday unlocks both your Sun and real astronomical Moon sign. Add birth time if you know it for your Rising sign.
          </p>

          <div class="field-group">
            <label class="field-label" for="inpName">First Name *</label>
            <input id="inpName" class="field-inp" placeholder="Your first name" value="${esc(state.name)}" oninput="VelaApp.setField('name', this.value)">
          </div>

          <div class="form-row-2">
            <div class="field-group">
              <label class="field-label" for="inpBday">Birthday *</label>
              <input id="inpBday" type="date" class="field-inp" value="${esc(state.birthday)}" oninput="VelaApp.setField('birthday', this.value)">
            </div>
            <div class="field-group">
              <label class="field-label" for="inpTime">Birth Time (Optional)</label>
              <input id="inpTime" type="time" class="field-inp" value="${esc(state.birthTime)}" oninput="VelaApp.setField('birthTime', this.value)">
            </div>
          </div>

          <div class="form-row-2">
            <div class="field-group">
              <label class="field-label" for="inpGender">Style Palette</label>
              <select id="inpGender" class="field-inp" onchange="VelaApp.setField('gender', this.value)">
                <option value="f" ${state.gender === "f" ? "selected" : ""}>Feminine · 18K Gold</option>
                <option value="m" ${state.gender === "m" ? "selected" : ""}>Masculine · Brushed Steel</option>
                <option value="nb" ${state.gender === "nb" ? "selected" : ""}>Gender-Neutral</option>
              </select>
            </div>
            <div class="field-group">
              <label class="field-label" for="inpWear">Preferred Piece</label>
              <select id="inpWear" class="field-inp" onchange="VelaApp.setField('wearPref', this.value)">
                <option value="bracelet" ${state.wearPref === "bracelet" ? "selected" : ""}>Wrist Bracelet</option>
                <option value="necklace" ${state.wearPref === "necklace" ? "selected" : ""}>Pendant Necklace (Laptop-Friendly)</option>
                <option value="duo" ${state.wearPref === "duo" ? "selected" : ""}>Couples / Bestie Bond Duo</option>
              </select>
            </div>
          </div>

          <div style="margin-top:10px;">
            <button id="btnFormNext" class="cta-btn" ${ready ? "" : "disabled"} onclick="VelaApp.go(3)">
              ${esc(CFG.COMPANION_NAME)}, Read My Birth Chart →
            </button>
            <p style="text-align:center;font-size:12px;color:var(--muted);margin-top:9px;">
              First name &amp; birthday are plenty—no need to guess your birth minute.
            </p>
          </div>
        </div>
      `;
      return;
    }

    if (s === 3) {
      const chart = window.VelaAstro.computeChart(state.birthday, state.birthTime);
      box.innerHTML = `
        <div class="anim-in" style="display:flex;flex-direction:column;gap:14px;">
          ${bubble(`First, let me show you what stood out the moment I opened your chart, <b>${esc(state.name)}</b>:`)}

          <div class="qcard" style="text-align:center;border-color:var(--lavender-border);">
            <div style="font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.16em;color:var(--gold-deep);text-transform:uppercase;">
              YOUR NATAL SNAPSHOT · ${esc(chart.aspectLabel)}
            </div>
            <div style="font-family:var(--font-serif);font-size:22px;font-weight:600;margin-top:4px;">
              ${esc(state.name)} · ${esc( state.birthday )}
            </div>
            ${renderWheelSVG(chart)}
            <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:12px;font-size:13px;font-weight:600;margin-top:4px;">
              <span>☉ Sun in ${esc(chart.sun)}</span>
              <span>☽ Moon in ${esc(chart.moon)}</span>
              ${chart.rising ? `<span>↑ Rising in ${esc(chart.rising)}</span>` : ""}
            </div>
          </div>

          <div class="qcard" style="padding:16px;">
            <div style="font-family:var(--font-serif);font-size:19px;font-weight:600;margin-bottom:10px;">Here is what I noticed</div>
            <div style="display:flex;flex-direction:column;gap:10px;font-size:13px;color:var(--ink-soft);line-height:1.55;">
              ${chart.facts.map((f, i) => `
                <div style="display:flex;gap:10px;align-items:flex-start;">
                  <span style="width:22px;height:22px;border-radius:50%;background:var(--lavender);color:var(--ink);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none;margin-top:1px;">${i + 1}</span>
                  <span>${esc(f)}</span>
                </div>
              `).join("")}
            </div>
          </div>

          ${bubble(`Your chart shows how you're wired. Now tell me about right now—what has been taking up the most space in your head lately?`)}

          <button class="cta-btn" onclick="VelaApp.go(4)">Continue →</button>
        </div>
      `;
      return;
    }

    if (s >= 4 && s <= 6) {
      const idx = s - 4;
      const q = QUESTIONS[idx];
      const chosen = state["q" + (idx + 1)];
      box.innerHTML = `
        <div class="anim-in">
          <div class="progress-bar-row">
            <div class="progress-segs">
              ${[0, 1, 2].map(i => `<div class="progress-seg ${i < idx ? "done" : i === idx ? "active" : ""}"></div>`).join("")}
            </div>
            <span style="font-size:12px;color:var(--muted);font-weight:600;">Question ${idx + 1} of 3</span>
          </div>

          ${bubble(`<span style="font-family:var(--font-serif);font-size:19px;font-weight:600;">${esc(q.title)}</span>`)}

          <div style="margin-top:14px;">
            ${q.opts.map((opt, oIdx) => `
              <button class="opt-btn ${chosen === oIdx ? "selected" : ""}" onclick="VelaApp.answer(${idx + 1}, ${oIdx})">
                ${esc(opt)}
              </button>
            `).join("")}
          </div>
        </div>
      `;
      return;
    }

    if (s === 7) {
      const chart = window.VelaAstro.computeChart(state.birthday, state.birthTime);
      const step = state.loadingStep;
      const done = step >= 4;
      const rows = [
        `Mapping ☉ ${chart.sun} & ☽ ${chart.moon} placements`,
        `Analyzing missing ${chart.missingElement} element balance`,
        `Matching natural stone & waterproof NFC piece`,
        `Preparing your 4-part personal reading`
      ];
      box.innerHTML = `
        <div class="anim-in" style="min-height:72dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:16px;">
          <img src="${AVATAR}" alt="" style="width:120px;height:120px;border-radius:50%;object-fit:cover;box-shadow:0 12px 32px rgba(201,164,106,0.28);animation:floatSlow 2.6s ease-in-out infinite;">
          <h2 style="font-family:var(--font-serif);font-size:26px;font-weight:600;">Reading this for you, ${esc(state.name || "Friend")}…</h2>
          <div style="background:#fff;border:1px solid var(--border);border-radius:18px;padding:16px 18px;width:100%;text-align:left;display:flex;flex-direction:column;gap:10px;">
            ${rows.map((txt, i) => `
              <div style="display:flex;align-items:center;gap:10px;font-size:13.5px;color:${i <= step ? "var(--ink)" : "var(--muted)"};font-weight:${i === step ? "700" : "500"};">
                <span style="width:18px;text-align:center;color:${i < step ? "var(--sage)" : "var(--ink)"};">
                  ${i < step ? "✓" : i === step ? "✦" : "·"}
                </span>
                <span>${esc(txt)}</span>
              </div>
            `).join("")}
          </div>
          ${done ? `<button class="cta-btn anim-in" onclick="VelaApp.revealResult()">See My Matched Stone →</button>` : ""}
        </div>
      `;
      return;
    }

    if (s === 8) {
      const chart = window.VelaAstro.computeChart(state.birthday, state.birthTime);
      const recommendedId = recommendSku();
      if (!state.activeStone || !CATALOG[state.activeStone]) state.activeStone = recommendedId;
      const sku = CATALOG[state.activeStone];
      const choices = alternativeChoices(recommendedId);
      const reading = window.VelaAstro.buildFourPartReading(chart, state.name, sku.shortName, state);

      // Compute dynamic stat bars
      const lowIdx = state.q3 === 0 ? 0 : state.q3 === 3 ? 1 : state.q1 === 2 ? 2 : 3;
      const statsHtml = STAT_NAMES.map((label, i) => {
        const base = i === lowIdx ? 36 : 54;
        const add = state.supportOn ? sku.weights[i] : 0;
        return `
          <div class="stat-row">
            <div class="stat-labels">
              <span>${esc(label)}</span>
              <span>${base} → <b>${base + add}</b> ${add ? `<small style="color:var(--sage);font-weight:700;">+${add}</small>` : ""}</span>
            </div>
            <div class="stat-track">
              <div class="stat-base" style="width:${base}%;"></div>
              <div class="stat-add" style="width:${add}%;"></div>
            </div>
          </div>
        `;
      }).join("");

      box.innerHTML = `
        <div class="anim-in">
          ${bubble(`I read your <b>☉ ${esc(chart.sun)} / ☽ ${esc(chart.moon)}</b> chart and what you're carrying right now. That is why I chose <b>${esc(sku.shortName)}</b> for you.`)}

          <div class="result-tabs">
            <button class="result-tab ${state.tab === 0 ? "on" : ""}" onclick="VelaApp.setTab(0)">1 · My Matched Piece</button>
            <button class="result-tab ${state.tab === 1 ? "on" : ""}" onclick="VelaApp.setTab(1)">2 · Full Reading ${state.unlocked ? "✓" : "🔒"}</button>
          </div>

          ${state.tab === 0 ? `
            <div class="qcard" style="text-align:center;">
              <div style="font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.15em;color:var(--gold-deep);text-transform:uppercase;">
                ${state.activeStone === recommendedId ? "✦ 97% NATAL & INTENTION MATCH" : "✦ EXPLORING ALTERNATIVE PIECE"}
              </div>
              <div style="font-size:12px;color:var(--muted);margin-top:3px;">
                ${esc(state.name || "You")} · ☉ ${esc(chart.sun)} · ☽ ${esc(chart.moon)}
              </div>

              <img src="${sku.img}" alt="${esc(sku.name)}" class="product-hero-img">

              <h3 style="font-family:var(--font-serif);font-size:24px;font-weight:700;line-height:1.2;">${esc(sku.name)}</h3>
              <div style="font-size:13px;font-weight:600;color:var(--gold-deep);margin:4px 0 8px;">${esc(sku.keyword)}</div>
              <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">${esc(sku.why)}</p>

              <!-- Interactive Support Stat Booster -->
              <div class="support-box">
                <div class="support-head">
                  <b style="font-size:13px;">What supports your chart</b>
                  <button class="support-toggle ${state.supportOn ? "on" : "off"}" onclick="VelaApp.toggleSupport()">
                    ${state.supportOn ? "✓ With Piece" : "Without Piece"}
                  </button>
                </div>
                ${statsHtml}
                <div style="font-size:11.5px;color:var(--muted);margin-top:8px;">Compare another piece:</div>
                <div class="compare-pills">
                  ${choices.map(cid => `
                    <button class="compare-pill ${state.activeStone === cid ? "active" : ""}" onclick="VelaApp.selectStone('${cid}')">
                      ${esc(CATALOG[cid].shortName)}${cid === recommendedId ? " ★" : ""}
                    </button>
                  `).join("")}
                </div>
              </div>

              <button class="cta-btn" onclick="VelaApp.openShopifyProduct()">
                Claim My Piece — $${sku.price} <span style="opacity:.68;text-decoration:line-through;font-weight:400;margin-left:4px;">$${sku.compareAt}</span>
              </button>
              <div style="font-size:12px;color:var(--sage);font-weight:600;margin-top:9px;line-height:1.5;">
                ✓ $0/mo Lifetime AI Access · Waterproof 18K PVD · Gift Box Included<br>
                <span style="color:var(--muted);font-weight:500;">Tip: Use code <b>${esc(CFG.PROMO_CODE)}</b> on next page for 50% OFF a 2nd piece</span>
              </div>
            </div>
          ` : `
            <div class="qcard">
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;font-family:var(--font-mono);color:var(--gold-deep);">
                <span>4-PART NATAL READING</span>
                <span>${esc(chart.aspectLabel)}</span>
              </div>
              <h3 style="font-family:var(--font-serif);font-size:23px;font-weight:600;margin:6px 0 4px;text-align:center;">
                Tap a chapter to read
              </h3>
              <p style="font-size:12.5px;color:var(--muted);text-align:center;">
                ${state.unlocked ? "All 4 chapters are unlocked below." : "About You is open now. Enter your email to unlock Career, Love & Money instantly."}
              </p>

              <div class="topic-grid">
                <div class="topic-card unlocked" onclick="VelaApp.openTopic('who')">
                  <span class="topic-badge" style="background:var(--sage-bg);color:var(--sage);">✓ OPEN FREE</span>
                  <div style="font-family:var(--font-serif);font-size:18px;font-weight:700;">About You</div>
                  <div style="font-size:11.5px;color:var(--muted);margin-top:3px;">Core ${esc(chart.sun)}/${esc(chart.moon)} pattern</div>
                </div>

                <div class="topic-card ${state.unlocked ? "unlocked" : ""}" onclick="VelaApp.openTopic('work')">
                  <span class="topic-badge" style="background:${state.unlocked ? "var(--sage-bg)" : "#EDE7F5"};color:${state.unlocked ? "var(--sage)" : "var(--ink)"};">${state.unlocked ? "✓ UNLOCKED" : "🔒 LOCKED"}</span>
                  <div style="font-family:var(--font-serif);font-size:18px;font-weight:700;">Career &amp; Timing</div>
                  <div style="font-size:11.5px;color:var(--muted);margin-top:3px;">How you do your sharpest work</div>
                </div>

                <div class="topic-card ${state.unlocked ? "unlocked" : ""}" onclick="VelaApp.openTopic('love')">
                  <span class="topic-badge" style="background:${state.unlocked ? "var(--sage-bg)" : "#EDE7F5"};color:${state.unlocked ? "var(--sage)" : "var(--ink)"};">${state.unlocked ? "✓ UNLOCKED" : "🔒 LOCKED"}</span>
                  <div style="font-family:var(--font-serif);font-size:18px;font-weight:700;">Love &amp; Bonds</div>
                  <div style="font-size:11.5px;color:var(--muted);margin-top:3px;">How you let someone close</div>
                </div>

                <div class="topic-card ${state.unlocked ? "unlocked" : ""}" onclick="VelaApp.openTopic('money')">
                  <span class="topic-badge" style="background:${state.unlocked ? "var(--sage-bg)" : "#EDE7F5"};color:${state.unlocked ? "var(--sage)" : "var(--ink)"};">${state.unlocked ? "✓ UNLOCKED" : "🔒 LOCKED"}</span>
                  <div style="font-family:var(--font-serif);font-size:18px;font-weight:700;">Money &amp; Flow</div>
                  <div style="font-size:11.5px;color:var(--muted);margin-top:3px;">What shapes how you earn</div>
                </div>
              </div>

              <button class="cta-btn" onclick="VelaApp.openShopifyProduct()">
                Shop My ${esc(sku.shortName)} — $${sku.price} →
              </button>
            </div>
          `}
        </div>
        ${renderModals(chart, sku, reading)}
      `;
    }
  }

  function renderModals(chart, sku, reading) {
    if (state.emailModal && !state.unlocked) {
      return `
        <div class="modal-backdrop" onclick="if(event.target===this)VelaApp.closeModals()">
          <div class="modal-sheet">
            <button class="modal-close" onclick="VelaApp.closeModals()">×</button>
            <h3 style="font-family:var(--font-serif);font-size:24px;font-weight:600;margin-bottom:6px;padding-right:36px;">
              Where should I send your full reading?
            </h3>
            <p style="font-size:13.5px;color:var(--muted);line-height:1.55;margin-bottom:14px;">
              Leave your email below. Career, Love &amp; Money open right here immediately—and we'll save a permanent copy to your inbox.
            </p>
            <input id="modalEmailInp" type="email" class="field-inp" placeholder="your@email.com" value="${esc(state.email)}" oninput="VelaApp.setEmail(this.value)">
            ${state.emailError ? `<div style="color:#B3261E;font-size:12px;margin-top:6px;">${esc(state.emailError)}</div>` : ""}
            <div style="font-size:12px;color:var(--muted);margin:8px 0 12px;">No verification code required. Zero spam, ever.</div>
            <label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;color:var(--muted);margin-bottom:16px;">
              <input type="checkbox" ${state.consent ? "checked" : ""} onchange="VelaApp.setConsent(this.checked)" style="margin-top:2px;accent-color:var(--ink);">
              <span>Send me my saved birth-chart reading and occasional cosmic transit updates.</span>
            </label>
            <button class="cta-btn" onclick="VelaApp.submitEmailUnlock()">Unlock All 3 Chapters Now →</button>
          </div>
        </div>
      `;
    }

    if (state.topicModal && reading[state.topicModal]) {
      const titles = { who: "About You", work: "Career & Timing", love: "Love & Bonds", money: "Money & Flow" };
      const paras = reading[state.topicModal];
      return `
        <div class="modal-backdrop" onclick="if(event.target===this)VelaApp.closeModals()">
          <div class="modal-sheet">
            <button class="modal-close" onclick="VelaApp.closeModals()">×</button>
            <div style="font-family:var(--font-mono);font-size:11px;color:var(--gold-deep);letter-spacing:0.12em;">
              ☉ ${esc(chart.sun)} · ☽ ${esc(chart.moon)}
            </div>
            <h3 style="font-family:var(--font-serif);font-size:26px;font-weight:600;margin:4px 0 14px;">
              ${esc(titles[state.topicModal])}
            </h3>
            <div style="display:flex;flex-direction:column;gap:12px;font-size:14.5px;color:var(--ink-soft);line-height:1.7;">
              ${paras.map(p => `<p>${esc(p)}</p>`).join("")}
            </div>
            <div style="margin-top:18px;padding:13px 15px;border-radius:16px;background:var(--lavender);font-size:13px;color:var(--ink);">
              ✦ <b>${esc(sku.shortName)}</b> was matched to anchor this exact side of your chart.
            </div>
            <div style="margin-top:14px;">
              <button class="cta-btn" onclick="VelaApp.openShopifyProduct()">Take Me to My ${esc(sku.shortName)} →</button>
            </div>
          </div>
        </div>
      `;
    }
    return "";
  }

  /* ---- Public Controller ---- */
  window.VelaApp = {
    start() {
      firePixel("ViewContent", { content_name: "AskVela_Quiz_Start" });
      state.screen = 1;
      state.chatStep = 0;
      saveState();
      renderScreen();
      clearTimers();
      [1, 2, 3].forEach(step => {
        timers.push(setTimeout(() => {
          state.chatStep = step;
          renderScreen();
        }, step * 600));
      });
    },
    skipChat() {
      if (state.chatStep < 3) {
        clearTimers();
        state.chatStep = 3;
        renderScreen();
      }
    },
    go(n) {
      clearTimers();
      state.screen = n;
      saveState();
      renderScreen();
      document.getElementById("scroll").scrollTop = 0;
      if (n === 7) {
        state.loadingStep = 0;
        renderScreen();
        [1, 2, 3, 4].forEach(st => {
          timers.push(setTimeout(() => {
            state.loadingStep = st;
            renderScreen();
          }, st * 850));
        });
      }
    },
    back() {
      clearTimers();
      if (state.screen === 8) state.screen = 6;
      else if (state.screen > 0) state.screen -= 1;
      if (state.screen === 1) state.chatStep = 3;
      saveState();
      renderScreen();
    },
    restart() {
      clearTimers();
      localStorage.removeItem(STORAGE_KEY);
      Object.assign(state, {
        screen: 0, chatStep: 0, loadingStep: 0,
        q1: null, q2: null, q3: null, activeStone: null,
        tab: 0, unlocked: false, emailModal: false, topicModal: null
      });
      renderScreen();
    },
    setField(k, v) {
      state[k] = v;
      state.activeStone = null;
      saveState();
      const btn = document.getElementById("btnFormNext");
      if (btn) {
        btn.disabled = !((state.name || "").trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(state.birthday));
      }
    },
    answer(qNum, optIdx) {
      state["q" + qNum] = optIdx;
      state.activeStone = null;
      saveState();
      renderScreen();
      setTimeout(() => {
        if (qNum < 3) this.go(3 + qNum + 1);
        else this.go(7);
      }, 240);
    },
    revealResult() {
      state.activeStone = recommendSku();
      state.screen = 8;
      state.tab = 0;
      saveState();
      firePixel("CompleteRegistration", { content_name: state.activeStone });
      renderScreen();
    },
    setTab(t) {
      state.tab = t;
      saveState();
      renderScreen();
    },
    toggleSupport() {
      state.supportOn = !state.supportOn;
      renderScreen();
    },
    selectStone(skuId) {
      if (CATALOG[skuId]) {
        state.activeStone = skuId;
        saveState();
        renderScreen();
      }
    },
    openTopic(topic) {
      if (topic !== "who" && !state.unlocked) {
        state.pendingTopic = topic;
        state.emailModal = true;
        state.emailError = "";
        renderScreen();
        return;
      }
      state.topicModal = topic;
      renderScreen();
    },
    closeModals() {
      state.emailModal = false;
      state.topicModal = null;
      renderScreen();
    },
    setEmail(v) { state.email = v; },
    setConsent(v) { state.consent = v; },
    async submitEmailUnlock() {
      const em = (state.email || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) {
        state.emailError = "Please enter a valid email address.";
        renderScreen();
        return;
      }
      const chart = window.VelaAstro.computeChart(state.birthday, state.birthTime);
      const sku = CATALOG[state.activeStone || recommendSku()];
      state.unlocked = true;
      state.emailModal = false;
      state.topicModal = state.pendingTopic || "work";
      saveState();
      renderScreen();

      firePixel("Lead", { content_name: sku.handle, currency: "USD", value: sku.price });

      // Non-blocking background lead dispatch
      if (CFG.LEAD_API_ENDPOINT) {
        fetch(CFG.LEAD_API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            runId: state.runId,
            email: em,
            consent: state.consent,
            name: state.name,
            birthday: state.birthday,
            birthTime: state.birthTime,
            gender: state.gender,
            sunSign: chart.sun,
            moonSign: chart.moon,
            missingElement: chart.missingElement,
            matchedSku: sku.handle,
            matchedTitle: sku.name,
            attribution: ATTRIBUTION,
            submittedAt: new Date().toISOString()
          })
        }).catch(() => {});
      }
    },
    openShopifyProduct() {
      const chart = window.VelaAstro.computeChart(state.birthday, state.birthTime);
      const sku = CATALOG[state.activeStone || recommendSku()];
      firePixel("InitiateCheckout", {
        content_ids: [sku.handle],
        content_name: sku.name,
        currency: "USD",
        value: sku.price
      });

      const isLocal = location.protocol === "file:" || location.hostname === "localhost" || location.hostname === "127.0.0.1" || (location.hostname.endsWith("github.io") && CFG.SHOPIFY_DOMAIN === "https://veloraritual.com");
      if (isLocal) {
        const sp = new URLSearchParams();
        sp.set("product", sku.handle);
        sp.set("from", "quiz");
        if (state.name) sp.set("name", state.name.trim());
        sp.set("sign", chart.sun);
        sp.set("moon", chart.moon);
        sp.set("need", sku.keyword);
        const curParams = new URLSearchParams(location.search);
        const isLiveGhPages = location.hostname.endsWith("github.io") && CFG.SHOPIFY_DOMAIN === "https://veloraritual.com";
        const isFlagshipMode = curParams.get("mode") === "flagship" || (document.referrer && document.referrer.indexOf("/flagship/") !== -1);
        let pageName;
        if (isLiveGhPages) {
          const fileSlug = sku.handle === "twilight-amethyst-bracelet" ? "index.html" : (sku.handle + ".html");
          pageName = "../" + fileSlug + "?";
        } else if (isFlagshipMode) {
          const fileSlug = sku.handle === "twilight-amethyst-bracelet" ? "index.html" : (sku.handle + ".html");
          pageName = "../flagship/" + fileSlug + "?";
        } else {
          pageName = window.VELORA_SACRED_V2
            ? "../storefront-sacred-v2.html?"
            : "../storefront-preview.html?";
        }
        const target = pageName + sp.toString();
        if (window.top && window.top !== window) window.top.location.href = target;
        else window.location.href = target;
        return;
      }

      const base = (CFG.SHOPIFY_DOMAIN || "https://veloraritual.com").replace(/\/$/, "");
      const url = new URL(`${base}/products/${sku.handle}`);
      url.searchParams.set("from", "quiz");
      if (state.name) url.searchParams.set("name", state.name.trim());
      url.searchParams.set("sign", chart.sun);
      url.searchParams.set("moon", chart.moon);
      url.searchParams.set("need", sku.keyword);
      if (CFG.PROMO_CODE) url.searchParams.set("discount", CFG.PROMO_CODE);
      Object.keys(ATTRIBUTION).forEach(k => url.searchParams.set(k, ATTRIBUTION[k]));
      if (window.top && window.top !== window) window.top.location.href = url.toString();
      else window.location.href = url.toString();
    },
    downloadShareCard() {
      const chart = window.VelaAstro.computeChart(state.birthday, state.birthTime);
      const sku = CATALOG[state.activeStone || recommendSku()];
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 1920);
      grad.addColorStop(0, "#FAF7F2");
      grad.addColorStop(1, "#EDE6F5");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Border frame
      ctx.strokeStyle = "#C9A46A";
      ctx.lineWidth = 3;
      ctx.strokeRect(56, 56, 968, 1808);

      ctx.fillStyle = "#9B7438";
      ctx.font = "600 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VELORA · NATAL STONE MATCH", 540, 170);

      ctx.fillStyle = "#231C2E";
      ctx.font = "600 68px Georgia, serif";
      ctx.fillText((state.name || "My") + "'s Alignment", 540, 275);

      ctx.fillStyle = "#433757";
      ctx.font = "500 36px sans-serif";
      ctx.fillText(`☉ Sun in ${chart.sun}   ·   ☽ Moon in ${chart.moon}`, 540, 350);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(190, 420, 700, 700, 42);
        ctx.clip();
        ctx.drawImage(img, 190, 420, 700, 700);
        ctx.restore();

        ctx.fillStyle = "#231C2E";
        ctx.font = "700 54px Georgia, serif";
        ctx.fillText(sku.shortName, 540, 1225);

        ctx.fillStyle = "#9B7438";
        ctx.font = "600 32px sans-serif";
        ctx.fillText("✦ " + sku.keyword, 540, 1290);

        ctx.fillStyle = "#433757";
        ctx.font = "italic 34px Georgia, serif";
        const words = sku.tagline.split(" ");
        let line = "", y = 1390;
        words.forEach(w => {
          const test = line + w + " ";
          if (ctx.measureText(test).width > 820) {
            ctx.fillText(line.trim(), 540, y);
            line = w + " ";
            y += 50;
          } else line = test;
        });
        if (line) ctx.fillText(line.trim(), 540, y);

        ctx.fillStyle = "#231C2E";
        ctx.font = "600 30px sans-serif";
        ctx.fillText("Find your birth-chart crystal in 60s → " + (CFG.SHOPIFY_DOMAIN || "").replace(/^https?:\/\//, ""), 540, 1775);

        const a = document.createElement("a");
        a.download = `velora-${chart.sun.toLowerCase()}-match.jpg`;
        a.href = canvas.toDataURL("image/jpeg", 0.92);
        a.click();
      };
      img.src = sku.img;
    }
  };

  // Init
  loadState();
  renderScreen();
})();
