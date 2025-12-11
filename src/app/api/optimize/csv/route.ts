export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const base = process.env.PY_BACKEND_URL?.trim();
  if (!base) {
    return new Response('PY_BACKEND_URL is not configured', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
  try {
    const resp = await fetch(base.replace(/\/$/, '') + '/optimize_csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const buf = await resp.arrayBuffer();
    return new Response(buf, {
      status: resp.status,
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="offers.csv"' },
    });
  } catch (e) {
    return new Response(String(e), { status: 502, headers: { 'Content-Type': 'text/plain' } });
  }
}
