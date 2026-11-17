/**
 * VELORA · Ask Vela 60-Second Quiz Configuration
 * 上线前仅需修改下方 SHOPIFY_DOMAIN（以及可选的广告像素 ID）即可直接投产使用！
 */
window.VELORA_CONFIG = {
  BRAND_NAME: "VELORA",
  COMPANION_NAME: "Vela",

  // 你的 Shopify 主站域名（不带末尾斜杠）。未绑定正式域名前也可填 https://你的店铺名.myshopify.com
  SHOPIFY_DOMAIN: "https://veloraritual.com",

  // 双条半价优惠码（将自动随 URL 传给 Shopify 并在商详页提示）
  PROMO_CODE: "DUO50",

  // 广告像素 ID（留空则不加载；填入后自动回传 ViewContent / Lead / InitiateCheckout 标准事件）
  META_PIXEL_ID: "",
  TIKTOK_PIXEL_ID: "",
  GA4_MEASUREMENT_ID: "",

  // 测验留资接收接口（部署在 Cloudflare Pages 或 Vercel 时默认走内置 /api/lead 转发至 Klaviyo/飞书/Webhook）
  LEAD_API_ENDPOINT: "/api/lead",

  // 与 shopify-kit/velora_shopify_products_10skus.csv 100% 一一对应的商品 Handle 与展示配置
  CATALOG: {
    sku01: {
      handle: "twilight-amethyst-bracelet",
      name: "Twilight Amethyst Half-Chain Bracelet",
      shortName: "Twilight Amethyst",
      keyword: "Mental Calm & Deep Sleep",
      price: 68,
      compareAt: 128,
      img: "./assets/sku01_amethyst_halfchain.jpg",
      weights: [28, 14, 20, 10], // [Calm, Boundaries, Clarity, Momentum]
      tagline: "For the mind that thinks three steps ahead—and forgets how to clock out at night.",
      why: "Half 18K PVD paperclip gold chain meets micro-faceted Uruguayan amethyst to quiet 2 AM mental static without sacrificing everyday luxury."
    },
    sku02: {
      handle: "blush-moonstone-rose-quartz-bracelet",
      name: "Blush Moonstone & Rose Quartz Bracelet",
      shortName: "Moonstone & Rose Quartz",
      keyword: "Love, Warmth & Emotional Repair",
      price: 72,
      compareAt: 135,
      img: "./assets/sku02_rosequartz_moonstone.jpg",
      weights: [16, 20, 12, 14],
      tagline: "For the heart that pours into everyone else before anyone even asks.",
      why: "Star rose quartz, blue-flash rainbow moonstone, and an organic baroque pearl soften emotional armor while keeping your self-worth intact."
    },
    sku03: {
      handle: "solar-citrine-pyrite-bracelet",
      name: "Solar Citrine & Pyrite Abundance Bracelet",
      shortName: "Citrine & Pyrite",
      keyword: "Abundance & Career Momentum",
      price: 72,
      compareAt: 135,
      img: "./assets/sku03_citrine_pyrite.jpg",
      weights: [10, 12, 18, 29],
      tagline: "For the spark you've been dimming just to keep everyone else comfortable.",
      why: "Honey-golden faceted citrine paired with architectural golden pyrite cubes anchors decisive confidence before high-stakes career and money moves."
    },
    sku04: {
      handle: "luminous-clear-quartz-bracelet",
      name: "Luminous Clear Quartz Reset Bracelet",
      shortName: "Clear Quartz Reset",
      keyword: "Decision Clarity & Fresh Chapter",
      price: 68,
      compareAt: 128,
      img: "./assets/sku04_clearquartz_reset.jpg",
      weights: [18, 10, 29, 16],
      tagline: "For the moment ten tabs are open in your head and you just need one true answer.",
      why: "Ice-clear faceted rock crystal centered around an integrated 18K gold compass NFC disc clears emotional fog when you're standing at a crossroads."
    },
    sku05: {
      handle: "orbit-calm-spinner-labradorite-bracelet",
      name: "Orbit Calm Kinetic Spinner & Labradorite Bracelet",
      shortName: "Orbit Spinner Labradorite",
      keyword: "Tactile Grounding & Energy Shield",
      price: 78,
      compareAt: 148,
      img: "./assets/sku05_labradorite_spinner.jpg",
      weights: [24, 28, 16, 12],
      tagline: "For the one who looks composed on the outside while her nervous system runs a marathon.",
      why: "Iridescent labradorite paired with a silent 360° rotating knurled 18K gold outer ring gives anxious hands an instant physical anchor—plus one-tap breath resets."
    },
    sku06: {
      handle: "celestial-compass-malachite-necklace",
      name: "Celestial Compass Malachite Reversible NFC Necklace",
      shortName: "Malachite Compass Necklace",
      keyword: "Heart-Level Direction & Protection",
      price: 84,
      compareAt: 158,
      img: "./assets/sku06_malachite_pendant.jpg",
      weights: [14, 22, 24, 24],
      tagline: "Worn right over your heart—zero wrist clutter while you build your next chapter.",
      why: "Natural banded emerald malachite on the front, brushed 18K gold NFC tap seal on the reverse. Designed for creators and executives who type all day."
    },
    sku07: {
      handle: "shadow-shield-mens-obsidian-bracelet",
      name: "Shadow Shield Matte Obsidian Signet Bracelet",
      shortName: "Shadow Matte Obsidian",
      keyword: "Stoic Calm & Firm Boundaries",
      price: 74,
      compareAt: 138,
      img: "./assets/sku07_mens_obsidian_signet.jpg",
      weights: [20, 29, 18, 15],
      tagline: "For the one quietly holding everything together—built like armor, zero cables.",
      why: "Architectural 8mm matte faceted black obsidian meets a brushed 316L steel signet bar with a concealed anti-metal NFC core."
    },
    sku08: {
      handle: "apex-focus-mens-tigers-eye-bracelet",
      name: "Apex Focus Golden Tiger's Eye Signet Bracelet",
      shortName: "Apex Tiger's Eye",
      keyword: "Relentless Focus & Follow-Through",
      price: 74,
      compareAt: 138,
      img: "./assets/sku08_tigereye_signet.jpg",
      weights: [12, 16, 22, 30],
      tagline: "For the builder who doesn't need another idea—just the discipline to finish.",
      why: "Chatoyant golden tiger's eye cylinders and matte onyx paired with a dual-tone brushed steel NFC signet bar keep your eye locked on execution."
    },
    sku09: {
      handle: "twin-orbit-connected-duo-set",
      name: "Twin Orbit Connected Bond NFC Duo Set (Sun & Moon)",
      shortName: "Twin Orbit Bond Duo",
      keyword: "Shared Connection & Private Notes",
      price: 118,
      compareAt: 196,
      img: "./assets/sku09_twin_orbit_duo.jpg",
      weights: [22, 24, 16, 18],
      tagline: "Two stones linked in the cloud—leave a private note they unlock with a tap.",
      why: "One Sun-engraved 18K gold blush moonstone piece and one Moon-engraved steel obsidian piece. Zero charging, zero Bluetooth drops across any distance."
    }
  }
};
