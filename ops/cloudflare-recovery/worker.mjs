var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
__name(json, "json");
async function readBody(request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 1024 * 1024) throw new Error("Request too large");
  const text = await request.text();
  if (text.length > 1024 * 1024) throw new Error("Request too large");
  return JSON.parse(text || "{}");
}
__name(readBody, "readBody");
function mockCreative(input) {
  const product = String(input.product || "the featured product").trim() || "the featured product";
  return {
    title: `Test a stronger hook for ${product}`,
    concept: `Build a short demonstration around ${product}, preserving the strongest product pattern in the logged data while testing a different opening hook.`,
    hook: `Before you buy ${product}, watch this one quick test.`,
    script: `Before you buy ${product}, watch this one quick test. Show the product in use and demonstrate the main benefit. Point out the evidence the viewer can actually see. Finish by inviting the viewer to check the product.`,
    shot_list: ["Close-up product reveal", "Hook to camera", "Demonstrate the main use", "Show the visible result", "End on product and CTA"],
    on_screen_text: ["Watch this first", "Quick test", "Here is what I noticed", "Worth testing?", "Check the product"],
    caption: `A quick test of ${product}. I am testing a new hook while keeping the core product angle consistent.`,
    cta: "Check the product and decide if it fits your needs.",
    hashtags: ["#TikTokShop", "#ProductTest", "#CreatorTips"],
    test_note: "Change the first 2 seconds while keeping the product angle and core demonstration stable.",
    confidence: "low"
  };
}
__name(mockCreative, "mockCreative");
function mockRecommendation() {
  return {
    recommendation: "Test a new version of your strongest-performing logged video, preserving its core product angle while changing the opening hook.",
    why: "This is a development-mode response. The production endpoint will analyze the actual video metrics and return a data-grounded recommendation.",
    hook: "Stop scrolling \u2014 here is the one thing I would change before buying this.",
    format: "Hook \u2192 demonstrate product/problem \u2192 proof \u2192 CTA.",
    product_angle: "Reuse the strongest observed product angle from the account data.",
    cta: "Check the product and compare it with the version you saw before.",
    experiment: "Change the first 2 seconds while keeping the product and core message stable.",
    confidence: "low"
  };
}
__name(mockRecommendation, "mockRecommendation");
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health" && request.method === "GET") {
      const assetsConfigured = typeof env?.ASSETS?.fetch === "function";
      return json({
        ok: assetsConfigured, aiConfigured: false, model: "mock", mock: true,
        assetsConfigured, authenticationConfigured: false, persistenceConfigured: false
      }, assetsConfigured ? 200 : 503);
    }
    if (url.pathname === "/api/creative") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      try {
        const body = await readBody(request);
        const product = String(body.product || "").trim();
        if (!product) return json({ error: "Enter a product before generating a creative." }, 400);
        return json({ ok: true, result: mockCreative({ product }), model: "mock" });
      } catch (error) {
        return json({ error: error.message || "Server error" }, error.message === "Request too large" ? 413 : 400);
      }
    }
    if (url.pathname === "/api/next-recommendation") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      try {
        const body = await readBody(request);
        const videos = Array.isArray(body.videos) ? body.videos.slice(0, 100) : [];
        if (videos.length < 2) return json({ error: "Log at least two videos before requesting an AI recommendation." }, 400);
        return json({ ok: true, result: mockRecommendation(), model: "mock" });
      } catch (error) {
        return json({ error: error.message || "Server error" }, error.message === "Request too large" ? 413 : 400);
      }
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
    if (typeof env?.ASSETS?.fetch !== "function") {
      return json({ error: "Frontend assets are not configured", code: "ASSETS_NOT_CONFIGURED" }, 503);
    }
    return env.ASSETS.fetch(request);
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
