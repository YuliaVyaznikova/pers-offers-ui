// Accept both v1 and v2 formats
export type OptimizeRequest = {
  budget?: number;
  model?: string; // "model1"|"model2" or "1"|"2" or "catboost"|"lightgbm"
  // v1 channels
  channels?: Array<{ type?: string; max?: number; cost?: number }> |
             Array<{ channel_id?: string; number?: number; cost_per_contact?: number }>;
  // v1 products
  products?: Array<{ product?: string; ltv?: number }> |
             Array<{ product_id?: string; ltv?: number }>;
};

// Response follows v2 used by frontend
export type OptimizeResponse = {
  summary: {
    budget_available: number;
    actual_spend: number;
    actual_spend_percent: number;
    expected_revenue: number;
    expected_roi_percent: number;
    reach_clients: number;
  };
  channels_usage: Array<{
    channel_id: string;
    offers_count: number;
    total_cost: number;
    total_revenue: number;
  }>;
  products_distribution: Array<{
    product_id: string;
    offers_count: number;
    avg_affinity_revenue: number;
  }>;
};

export async function POST(req: Request) {
  const body = (await req.json()) as OptimizeRequest;

  const base = process.env.PY_BACKEND_URL?.trim();
  if (base) {
    try {
      const resp = await fetch(base.replace(/\/$/, "") + "/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const txt = await resp.text();
      return new Response(txt, {
        status: resp.status,
        headers: { "Content-Type": resp.headers.get("content-type") || "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "proxy_failed", message: String(e) }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  const budget = Number(body?.budget ?? 0) || 0;
  const modelRaw = String(body?.model ?? "model1").toLowerCase();
  const model =
    modelRaw === "2" || modelRaw === "model2" || modelRaw === "lightgbm"
      ? "model2"
      : "model1"; // treat catboost as model1

  const channelsIn = Array.isArray(body?.channels) ? (body.channels as any[]) : [];
  const productsIn = Array.isArray(body?.products) ? (body.products as any[]) : [];

  // normalize channels (v1: type/max/cost) or (v2: channel_id/number/cost_per_contact)
  const normChannels = channelsIn.map((ch) => {
    const channel_id = (ch?.channel_id ?? ch?.type ?? "Unknown") as string;
    const number = Number(ch?.number ?? ch?.max ?? 0) || 0;
    const cost_per_contact = Number(ch?.cost_per_contact ?? ch?.cost ?? 0) || 0;
    return { channel_id, number, cost_per_contact };
  });

  // normalize products (v1: product, v2: product_id)
  const normProducts = productsIn.map((p, idx) => {
    const product_id = (p?.product_id ?? p?.product ?? `product_${idx}`) as string;
    const ltv = Number(p?.ltv ?? 0) || 0;
    return { product_id, ltv };
  });

  const avgLtv = (() => {
    const vals = normProducts.map(p => Number(p?.ltv ?? 0)).filter(v => Number.isFinite(v) && v > 0);
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  })();

  let remaining = budget;
  const rateBase = model === "model1" ? 0.02 : 0.018;

  const perChannel = normChannels.map(ch => {
    const type = ch?.channel_id || "Unknown";
    const cost = Number(ch?.cost_per_contact ?? 0);
    const max = Math.max(0, Math.floor(Number(ch?.number ?? 0)));
    let planned = 0;
    if (cost > 0 && remaining > 0) {
      const affordable = Math.floor(remaining / cost);
      planned = Math.max(0, Math.min(max || affordable, affordable));
      remaining -= planned * cost;
    }
    const spend = planned * (cost > 0 ? cost : 0);
    const expectedResponseRate = rateBase;
    const conversions = planned * expectedResponseRate;
    const revenue = conversions * avgLtv;
    const profit = revenue - spend;
    const cpt = conversions > 0 ? spend / conversions : 0;
    return { type, planned, spend, expectedResponseRate, cpt, profit };
  });

  const spend = perChannel.reduce((a, c) => a + c.spend, 0);
  const expectedConversions = perChannel.reduce((a, c) => a + c.planned * c.expectedResponseRate, 0);
  const revenue = expectedConversions * avgLtv;
  const expectedProfit = revenue - spend;
  const roi = spend > 0 ? expectedProfit / Math.max(spend, 1e-9) : 0;

  const summary = {
    budget_available: budget,
    actual_spend: spend,
    actual_spend_percent: budget > 0 ? (spend / budget) * 100 : 0,
    expected_revenue: revenue,
    expected_roi_percent: roi * 100,
    reach_clients: Math.round(expectedConversions),
  };

  const channels_usage = perChannel.map((c) => ({
    channel_id: c.type,
    offers_count: c.planned,
    total_cost: c.spend,
    total_revenue: c.planned * c.expectedResponseRate * avgLtv,
  }));

  const products_distribution = (normProducts || []).map((p, idx) => ({
    product_id: p?.product_id ?? `product_${idx}`,
    offers_count: Math.round((expectedConversions / Math.max(normProducts.length, 1)) || 0),
    avg_affinity_revenue: Number(p?.ltv ?? 0),
  }));

  return Response.json({ summary, channels_usage, products_distribution });
}
