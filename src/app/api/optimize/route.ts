export type OptimizeRequest = {
  budget: number;
  model: "model1" | "model2";
  channels: Array<{ type?: string; max?: number; cost?: number }>;
  products: Array<{ product?: string; ltv?: number }>;
};

export type OptimizeResponse = {
  kpi: {
    expectedProfit: number;
    spend: number;
    roi: number;
    expectedConversions: number;
  };
  channels: Array<{
    type: string;
    planned: number;
    spend: number;
    expectedResponseRate: number;
    cpt: number;
    profit: number;
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
  const model = (body?.model === "model1" || body?.model === "model2") ? body.model : "model1";
  const channels = Array.isArray(body?.channels) ? body.channels : [];
  const products = Array.isArray(body?.products) ? body.products : [];

  const avgLtv = (() => {
    const vals = products.map(p => Number(p?.ltv ?? 0)).filter(v => Number.isFinite(v) && v > 0);
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  })();

  let remaining = budget;
  const rateBase = model === "model1" ? 0.02 : 0.018;

  const perChannel = channels.map(ch => {
    const type = ch?.type || "Unknown";
    const cost = Number(ch?.cost ?? 0);
    const max = Math.max(0, Math.floor(Number(ch?.max ?? 0)));
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
    canal_id: c.type,
    offers_count: c.planned,
    total_cost: c.spend,
    total_revenue: c.planned * c.expectedResponseRate * avgLtv,
  }));

  const products_distribution = (products || []).map((p, idx) => ({
    product_id: p?.product ?? `product_${idx}`,
    offers_count: Math.round((expectedConversions / Math.max(products.length, 1)) || 0),
    avg_affinity_revenue: Number(p?.ltv ?? 0),
  }));

  return Response.json({ summary, channels_usage, products_distribution });
}
