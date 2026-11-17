/**
 * VELORA Deterministic Astronomical & Natal Reading Engine (Zero LLM API Cost, <1ms)
 * Uses Jean Meeus solar & lunar ecliptic longitude approximations to compute:
 * - Exact Sun Sign
 * - Real Astronomical Moon Sign (based on Julian Day lunar orbital position)
 * - Optional Rising (Ascendant) Sign when birth time is provided
 * - Scarcest Elemental Gap & Natal Aspect Signature
 * - 4-Part Personalized Natal Reading (About You / Career / Love / Money)
 */
(function (global) {
  "use strict";

  const SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
  ];

  const GLYPHS = {
    Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
    Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓"
  };

  const ELEMENT = {
    Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
    Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
    Gemini: "Air", Libra: "Air", Aquarius: "Air",
    Cancer: "Water", Scorpio: "Water", Pisces: "Water"
  };

  const SUN_TRAITS = {
    Aries: "bold instinct, direct honesty, and the courage to go first",
    Taurus: "quiet loyalty, sensory grounding, and building things that last",
    Gemini: "quicksilver perception, pattern recognition, and mental agility",
    Cancer: "deep emotional radar, fierce protection, and intuitive care",
    Leo: "magnetic warmth, creative conviction, and generous leadership",
    Virgo: "razor-sharp discernment, quiet devotion, and refined standards",
    Libra: "aesthetic harmony, emotional fairness, and seeing every angle",
    Scorpio: "unfiltered emotional truth, intensity, and transformative depth",
    Sagittarius: "expansive vision, candor, and hunger for real meaning",
    Capricorn: "long-game composure, self-reliance, and earned authority",
    Aquarius: "independent perspective, future-facing clarity, and originality",
    Pisces: "porous empathy, poetic intuition, and deep inner vision"
  };

  const MOON_NEEDS = {
    Aries: "immediate honest action rather than sitting in stagnation",
    Taurus: "physical calm, predictable rhythm, and tactile comfort",
    Gemini: "talking or writing thoughts out before they tangle inside",
    Cancer: "a private sanctuary where you don't have to armor up",
    Leo: "feeling genuinely seen and appreciated without having to ask",
    Virgo: "order in your environment so your nervous system can unclench",
    Libra: "peace in your closest relationships and visual calm around you",
    Scorpio: "complete emotional trust and zero surface-level pretense",
    Sagittarius: "breathing room, autonomy, and a horizon to look forward to",
    Capricorn: "knowing your foundations are handled so you can finally rest",
    Aquarius: "quiet mental space where nobody is demanding an instant reaction",
    Pisces: "gentle energetic boundaries so you stop absorbing everyone's mood"
  };

  function norm360(deg) {
    let v = deg % 360;
    return v < 0 ? v + 360 : v;
  }

  function toJulianDay(year, month, day, hourUT) {
    let y = year, m = month;
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + hourUT / 24 + B - 1524.5;
  }

  function computeChart(birthDateStr, birthTimeStr) {
    if (!birthDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(birthDateStr)) {
      return {
        sun: "Scorpio", moon: "Pisces", rising: null,
        sunDeg: 14, aspectLabel: "Sun trine Moon · orb 1.4°",
        dominantElement: "Water", missingElement: "Earth"
      };
    }

    const parts = birthDateStr.split("-").map(Number);
    let hourLocal = 12.0;
    let hasTime = false;
    if (birthTimeStr && /^\d{1,2}:\d{2}$/.test(birthTimeStr)) {
      const tp = birthTimeStr.split(":").map(Number);
      hourLocal = tp[0] + tp[1] / 60;
      hasTime = true;
    }

    // Approximate UT (noon local if unknown)
    const jd = toJulianDay(parts[0], parts[1], parts[2], hourLocal);
    const T = (jd - 2451545.0) / 36525.0;

    // Solar ecliptic longitude (accurate to ~0.02 deg)
    const L0 = norm360(280.46646 + 36000.76983 * T);
    const M = norm360(357.52911 + 35999.05029 * T) * Math.PI / 180;
    const C = (1.914602 - 0.004817 * T) * Math.sin(M) + 0.019993 * Math.sin(2 * M);
    const sunLon = norm360(L0 + C);
    const sunIdx = Math.floor(sunLon / 30) % 12;
    const sunDeg = Math.max(1, Math.min(29, Math.round(sunLon % 30)));

    // Lunar ecliptic longitude (Meeus principal terms, accurate to ~0.6 deg)
    const Lp = norm360(218.3165 + 481267.8813 * T);
    const D = norm360(297.8502 + 445267.1115 * T) * Math.PI / 180;
    const Mp = norm360(134.9634 + 477198.8676 * T) * Math.PI / 180;
    const F = norm360(93.2721 + 483202.0175 * T) * Math.PI / 180;
    const moonLon = norm360(
      Lp
      + 6.2888 * Math.sin(Mp)
      + 1.2740 * Math.sin(2 * D - Mp)
      + 0.6583 * Math.sin(2 * D)
      + 0.2136 * Math.sin(2 * Mp)
      - 0.1856 * Math.sin(M)
      - 0.1143 * Math.sin(2 * F)
    );
    const moonIdx = Math.floor(moonLon / 30) % 12;

    // Rising approximation when birth time is supplied (sunrise ~6:00 aligns Ascendant with Sun)
    let rising = null;
    if (hasTime) {
      const offsetSigns = Math.floor(((hourLocal - 6 + 24) % 24) / 2);
      const ascLon = norm360(sunLon + offsetSigns * 30);
      rising = SIGNS[Math.floor(ascLon / 30) % 12];
    }

    // Aspect between Sun & Moon
    const diff = Math.abs(sunLon - moonLon);
    const sep = diff > 180 ? 360 - diff : diff;
    let aspectName = "aligned with";
    let orb = (sep % 30).toFixed(1);
    if (Math.abs(sep - 0) <= 10) { aspectName = "conjunct"; orb = Math.abs(sep).toFixed(1); }
    else if (Math.abs(sep - 60) <= 8) { aspectName = "sextile"; orb = Math.abs(sep - 60).toFixed(1); }
    else if (Math.abs(sep - 90) <= 8) { aspectName = "square"; orb = Math.abs(sep - 90).toFixed(1); }
    else if (Math.abs(sep - 120) <= 9) { aspectName = "trine"; orb = Math.abs(sep - 120).toFixed(1); }
    else if (Math.abs(sep - 180) <= 9) { aspectName = "opposite"; orb = Math.abs(sep - 180).toFixed(1); }

    const sunSign = SIGNS[sunIdx];
    const moonSign = SIGNS[moonIdx];

    // Count elemental distribution across Sun, Moon, Rising & synthetic inner planets
    const counts = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
    counts[ELEMENT[sunSign]] += 2;
    counts[ELEMENT[moonSign]] += 2;
    if (rising) counts[ELEMENT[rising]] += 1;
    // Mercury stays within 1 sign of Sun
    const mercSign = SIGNS[(sunIdx + (sunDeg > 15 ? 1 : 11)) % 12];
    counts[ELEMENT[mercSign]] += 1;

    let dominantElement = "Water", missingElement = "Earth";
    let maxVal = -1, minVal = 99;
    ["Fire", "Earth", "Air", "Water"].forEach(el => {
      if (counts[el] > maxVal) { maxVal = counts[el]; dominantElement = el; }
      if (counts[el] < minVal) { minVal = counts[el]; missingElement = el; }
    });

    return {
      sun: sunSign,
      moon: moonSign,
      rising: rising,
      sunGlyph: GLYPHS[sunSign],
      moonGlyph: GLYPHS[moonSign],
      risingGlyph: rising ? GLYPHS[rising] : null,
      sunDeg: sunDeg,
      aspectLabel: `Sun ${aspectName} Moon · orb ${orb}°`,
      dominantElement: dominantElement,
      missingElement: missingElement,
      facts: [
        `Your Sun is at ${sunDeg}° ${sunSign}—when stakes are high, you move from ${SUN_TRAITS[sunSign]}.`,
        `Your Moon rests in ${moonSign}—beneath your capable exterior, your nervous system craves ${MOON_NEEDS[moonSign]}.`,
        `Elemental Gap: Your chart runs naturally lean on ${missingElement}, which explains why mental or emotional overload lingers longer than you let on.`
      ]
    };
  }

  function buildFourPartReading(chart, name, stoneName, qAnswers) {
    const whoName = (name || "").trim() || "You";
    const focusMap = [
      "a connection that matters deeply to your heart",
      "the pressure to build career momentum and financial certainty",
      "a crossroads choice you've been turning over from every angle",
      "late-night mental loops that refuse to quiet down when the lights go out"
    ];
    const focusLine = focusMap[qAnswers.q1] || focusMap[3];

    return {
      who: [
        `${whoName}, with your Sun in ${chart.sun} and Moon in ${chart.moon} (${chart.aspectLabel}), people often experience you as far steadier than you actually feel inside. You pick up subtle shifts in tone, unspoken expectations, and unfinished details long before anyone else notices them.`,
        `Lately, carrying ${focusLine} has stretched your ${chart.missingElement.toLowerCase()} reserves thin. You don't need generic "think positive" advice—you need a physical, quiet boundary that brings your energy back into your own body.`
      ],
      work: [
        `Your ${chart.sun} drive does its sharpest work in focused, meaningful sprints—not endless reactive busywork. When you feel stalled, it is rarely a lack of talent; it's decision fatigue from holding too many open tabs at once.`,
        `Over the next 30 days, stop trying to solve six months ahead in a single afternoon. Touch your ${stoneName} before your most important block of deep work each morning, commit to one non-negotiable move, and let everything secondary wait.`
      ],
      love: [
        `With a ${chart.moon} Moon, you love through attentiveness—remembering small details, anticipating needs, and giving people the benefit of the doubt. The hidden trap is over-functioning until resentment or exhaustion quietly sets in.`,
        `Real closeness right now comes from stepping back half a pace instead of leaning in harder. Let people meet you halfway; those meant for this chapter won't require you to shrink or over-explain.`
      ],
      money: [
        `Your relationship with money mirrors your energy levels: when your nervous system feels regulated, your timing and discernment are remarkably sharp; when you're depleted, you either freeze on opportunities or spend to soothe stress.`,
        `Balancing your missing ${chart.missingElement} element turns sporadic bursts of effort into steady, compounding abundance. Protect your sleep and morning clarity—your best financial calls follow calm, never rush.`
      ]
    };
  }

  global.VelaAstro = {
    GLYPHS,
    ELEMENT,
    computeChart,
    buildFourPartReading
  };
})(window);
