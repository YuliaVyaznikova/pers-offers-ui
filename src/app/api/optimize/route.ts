// Accept both verbose (v1/v2) and compact (v2.1) formats
export type OptimizeRequest = {
  budget?: number;
  model?: string; // "model1"|"model2" or "1"|"2" or "catboost"|"lightgbm"
  // v1/v2 channels (verbose arrays)
  channels?: Array<{ type?: string; max?: number; cost?: number }> |
             Array<{ channel_id?: string; number?: number; cost_per_contact?: number }>;
  // compact channels: map of channel_id -> [number, cost_per_contact]
  // eslint-disable-next-line @typescript-eslint/ban-types
  channels_map?: Record<string, [number, number]>;
  // v1 products (verbose) or v2 verbose
  products?: Array<{ product?: string; ltv?: number }> |
             Array<{ product_id?: string; ltv?: number }>;
  // compact products: map of product_id -> ltv
  products_map?: Record<string, number>;
};

// Compact response v2.1 used by frontend (maps + positional arrays)
export type OptimizeResponse = {
  // [budget_available, actual_spend, actual_spend_percent, expected_revenue, expected_roi_percent, reach_clients]
  summary: [number, number, number, number, number, number];
  // channel_id -> [offers_count, total_cost, total_revenue]
  channels_usage: Record<string, [number, number, number]>;
  // product_id -> [offers_count, avg_affinity_revenue]
  products_distribution: Record<string, [number, number]>;
};

export async function POST(req: Request) {
  const body = (await req.json()) as OptimizeRequest;

  // Normalize numbers coming from UI (e.g. "0,59" -> 0.59) and coerce types
  const toNum = (v: any): number => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const s = v.replace(/,/g, ".").trim();
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const normalizeBody = (raw: any) => {
    const out: any = { ...raw };
    if (raw && Object.prototype.hasOwnProperty.call(raw, "budget")) out.budget = toNum(raw.budget);
    if (typeof raw?.advanced === "string") out.advanced = raw.advanced === "true";
    if (typeof raw?.enable_rr === "string") out.enable_rr = raw.enable_rr === "true";
    const enableRR = Boolean(out.enable_rr ?? raw?.enable_rr);

    // channels as array of objects
    if (Array.isArray(raw?.channels)) {
      out.channels = raw.channels.map((c: any) => ({
        ...c,
        max: toNum(c?.max ?? c?.number),
        number: toNum(c?.number ?? c?.max),
        cost: toNum(c?.cost ?? c?.cost_per_contact),
        cost_per_contact: toNum(c?.cost_per_contact ?? c?.cost),
      }));
    }

    // channels as map -> arrays [max, cost] or [max, cost, rr]
    if (raw && typeof raw.channels === "object" && !Array.isArray(raw.channels)) {
      const m: Record<string, any> = {};
      for (const [k, v] of Object.entries(raw.channels as Record<string, any>)) {
        const arr = Array.isArray(v) ? v : [];
        if (arr.length >= 3) m[k] = [toNum(arr[0]), toNum(arr[1]), toNum(arr[2])];
        else if (arr.length >= 2) m[k] = enableRR ? [toNum(arr[0]), toNum(arr[1]), 0] : [toNum(arr[0]), toNum(arr[1])];
        else m[k] = [0, 0];
      }
      out.channels = m;
    }

    // channels_map fallback
    if (raw?.channels_map && typeof raw.channels_map === "object") {
      const m: Record<string, [number, number]> = {};
      for (const [k, v] of Object.entries(raw.channels_map as Record<string, any>)) {
        const arr = Array.isArray(v) ? v : [];
        m[k] = [toNum(arr[0]), toNum(arr[1])];
      }
      out.channels_map = m;
    }

    // products as array
    if (Array.isArray(raw?.products)) {
      out.products = raw.products.map((p: any, idx: number) => ({
        ...p,
        ltv: toNum(p?.ltv),
        product_id: p?.product_id ?? p?.product ?? `product_${idx}`,
      }));
    }

    // products as map
    if (raw && typeof raw.products === "object" && !Array.isArray(raw.products)) {
      const m: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw.products as Record<string, any>)) {
        m[k] = toNum(v);
      }
      out.products = m;
    }

    if (raw?.products_map && typeof raw.products_map === "object") {
      const m: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw.products_map as Record<string, any>)) {
        m[k] = toNum(v);
      }
      out.products_map = m;
    }

    // If enable_rr is true but some tuples still have length 2, append rr=0 defensively
    if (enableRR && out?.channels && typeof out.channels === "object" && !Array.isArray(out.channels)) {
      for (const [k, v] of Object.entries(out.channels as Record<string, any>)) {
        if (Array.isArray(v) && v.length === 2) {
          (out.channels as any)[k] = [toNum(v[0]), toNum(v[1]), 0];
        }
      }
    }

    return out;
  };

  const normalized = normalizeBody(body as any);

  const base = process.env.PY_BACKEND_URL?.trim();
  if (base) {
    try {
      const resp = await fetch(base.replace(/\/$/, "") + "/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
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
  // Mock mode: allow simulating latency via ?delay=<ms>
  try {
    const url = new URL(req.url);
    const delay = Number(url.searchParams.get("delay") ?? "0") || 0;
    if (delay > 0) {
      const capped = Math.min(delay, 15000);
      await new Promise((res) => setTimeout(res, capped));
    }
  } catch {}
  }
  const budget = Number(normalized?.budget ?? 0) || 0;
  const modelRaw = String(normalized?.model ?? "model1").toLowerCase();
  const model =
    modelRaw === "2" || modelRaw === "model2" || modelRaw === "lightgbm"
      ? "model2"
      : "model1"; // treat catboost as model1

  const isCompact = (!Array.isArray((body as any).channels) && !!(body as any).channels) ||
                    (!!(body as any).channels_map) ||
                    (!!(body as any).products_map);

  // Gather inputs in normalized verbose form first
  let normChannels: Array<{ channel_id: string; number: number; cost_per_contact: number }> = [];
  let normProducts: Array<{ product_id: string; ltv: number }> = [];

  if (isCompact) {
    // channels may be provided under channels (as map) or channels_map
    const chMap = ((body as any).channels || body.channels_map || {}) as Record<string, [number, number]>;
    normChannels = Object.entries(chMap).map(([channel_id, tuple]) => {
      const [number, cost_per_contact] = Array.isArray(tuple) ? tuple : [0, 0];
      return { channel_id, number: Number(number) || 0, cost_per_contact: Number(cost_per_contact) || 0 };
    });
    const prodMap = ((body as any).products || body.products_map || {}) as Record<string, number>;
    normProducts = Object.entries(prodMap).map(([product_id, ltv]) => ({
      product_id,
      ltv: Number(ltv) || 0,
    }));
  } else {
    const channelsIn = Array.isArray(body?.channels) ? (body.channels as any[]) : [];
    const productsIn = Array.isArray(body?.products) ? (body.products as any[]) : [];
    normChannels = channelsIn.map((ch) => {
      const channel_id = (ch?.channel_id ?? ch?.type ?? "Unknown") as string;
      const number = Number(ch?.number ?? ch?.max ?? 0) || 0;
      const cost_per_contact = Number(ch?.cost_per_contact ?? ch?.cost ?? 0) || 0;
      return { channel_id, number, cost_per_contact };
    });
    normProducts = productsIn.map((p, idx) => {
      const product_id = (p?.product_id ?? p?.product ?? `product_${idx}`) as string;
      const ltv = Number(p?.ltv ?? 0) || 0;
      return { product_id, ltv };
    });
  }

  // normChannels and normProducts are ready

  // Early validation to avoid heavy compute
  const messages: string[] = []
  if (!Number.isFinite(budget) || budget < 0) messages.push("Budget must be a non-negative number")
  if (!normChannels.length) messages.push("At least one channel must be provided")
  if (!normProducts.length) messages.push("At least one product with LTV must be provided")
  const anyInvalid = [
    ...normChannels.map(c => [c.number, c.cost_per_contact]).flat(),
    ...normProducts.map(p => [p.ltv]).flat(),
  ].some(v => !Number.isFinite(Number(v)) || Number(v) < 0)
  if (anyInvalid) messages.push("All numeric fields must be valid non-negative numbers")
  const minCost = (() => {
    const costs = normChannels.map(c => Number(c.cost_per_contact || 0)).filter(v => v > 0)
    return costs.length ? Math.min(...costs) : 0
  })()
  if (minCost > 0 && budget > 0 && budget < minCost) {
    messages.push(`Budget is too small. Minimum feasible is >= ${Math.round(minCost)}`)
  }
  const required = normChannels.reduce((sum, c) => sum + Math.max(0, Math.floor(Number(c.number || 0))) * Math.max(0, Number(c.cost_per_contact || 0)), 0)
  if (required > 0 && budget > 0 && budget < required) {
    messages.push(`Budget appears lower than required for the planned volume (≈ ${Math.round(required)}). Consider raising it or reducing volumes`)
  }
  if (messages.length) {
    return new Response(JSON.stringify({ error: "validation_failed", messages }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

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

  const summary: OptimizeResponse["summary"] = [
    budget,
    spend,
    budget > 0 ? (spend / budget) * 100 : 0,
    revenue,
    roi * 100,
    Math.round(expectedConversions),
  ];

  const channels_usage: OptimizeResponse["channels_usage"] = Object.fromEntries(
    perChannel.map((c) => [
      c.type,
      [
        c.planned,
        c.spend,
        c.planned * c.expectedResponseRate * avgLtv,
      ] as [number, number, number],
    ])
  );

  const offersPerProduct = Math.round((expectedConversions / Math.max(normProducts.length, 1)) || 0);
  const products_distribution: OptimizeResponse["products_distribution"] = Object.fromEntries(
    (normProducts || []).map((p, idx) => [
      p?.product_id ?? `product_${idx}`,
      [offersPerProduct, Number(p?.ltv ?? 0)] as [number, number],
    ])
  );

  return Response.json({ summary, channels_usage, products_distribution });
}
