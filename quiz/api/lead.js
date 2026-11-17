/**
 * Vercel Serverless Function: POST /api/lead
 * Compatible with KLAVIYO_PUBLIC_COMPANY_ID and LEAD_WEBHOOK_URL env vars in Vercel Project Settings.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ ok: true });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    if (process.env.LEAD_WEBHOOK_URL) {
      await fetch(process.env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }).catch(() => {});
    }
    if (process.env.KLAVIYO_PUBLIC_COMPANY_ID && body.email) {
      await fetch(`https://a.klaviyo.com/client/events/?company_id=${process.env.KLAVIYO_PUBLIC_COMPANY_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "revision": "2024-07-15" },
        body: JSON.stringify({
          data: {
            type: "event",
            attributes: {
              properties: {
                matched_sku: body.matchedSku,
                matched_title: body.matchedTitle,
                sun_sign: body.sunSign,
                moon_sign: body.moonSign,
                missing_element: body.missingElement
              },
              metric: { data: { type: "metric", attributes: { name: "Completed Birth Chart Quiz" } } },
              profile: {
                data: {
                  type: "profile",
                  attributes: { email: body.email, first_name: body.name || "" }
                }
              }
            }
          }
        })
      }).catch(() => {});
    }
    return res.status(200).json({ ok: true });
  } catch (_) {
    return res.status(200).json({ ok: true });
  }
}
