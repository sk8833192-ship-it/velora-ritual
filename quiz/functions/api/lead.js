/**
 * Cloudflare Pages Function: POST /api/lead
 * Optional Environment Variables (set in Cloudflare Pages Dashboard -> Settings -> Environment variables):
 * - KLAVIYO_PUBLIC_COMPANY_ID : Your 6-char Klaviyo Public API Key (pushes Quiz profile + matched stone straight into Klaviyo!)
 * - LEAD_WEBHOOK_URL          : Optional Feishu / Slack / Make / Zapier / Google Apps Script webhook URL
 */
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const env = context.env || {};

    // 1. Forward to generic Webhook (Feishu / Make / Zapier / Sheet) if configured
    if (env.LEAD_WEBHOOK_URL) {
      await fetch(env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }).catch(() => {});
    }

    // 2. Forward directly to Klaviyo Client Subscriptions / Events API if KLAVIYO_PUBLIC_COMPANY_ID is set
    if (env.KLAVIYO_PUBLIC_COMPANY_ID && body.email) {
      await fetch(`https://a.klaviyo.com/client/events/?company_id=${env.KLAVIYO_PUBLIC_COMPANY_ID}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "revision": "2024-07-15"
        },
        body: JSON.stringify({
          data: {
            type: "event",
            attributes: {
              properties: {
                matched_sku: body.matchedSku,
                matched_title: body.matchedTitle,
                sun_sign: body.sunSign,
                moon_sign: body.moonSign,
                missing_element: body.missingElement,
                birthday: body.birthday
              },
              metric: { data: { type: "metric", attributes: { name: "Completed Birth Chart Quiz" } } },
              profile: {
                data: {
                  type: "profile",
                  attributes: {
                    email: body.email,
                    first_name: body.name || "",
                    properties: {
                      sun_sign: body.sunSign,
                      moon_sign: body.moonSign,
                      matched_sku: body.matchedSku
                    }
                  }
                }
              }
            }
          }
        })
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}
