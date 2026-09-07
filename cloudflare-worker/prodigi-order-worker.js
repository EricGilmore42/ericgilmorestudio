// Cloudflare Worker: handles print orders for ericgilmorestudio.com
//
// Flow:
//   1. Buyer submits shipping info on the product page -> POST /api/orders
//      -> order is stored in KV as "pending", you get an email with a confirm link
//   2. You check Venmo, confirm the payment actually landed
//   3. You click the confirm link -> GET /api/confirm -> this Worker calls
//      Prodigi's Create Order API, which charges YOUR Prodigi account and
//      starts printing/shipping to the buyer
//
// Nothing here creates a Prodigi order until you click the confirm link.
//
// Required bindings (set these in the Cloudflare dashboard, not in this file):
//   - KV namespace binding named ORDERS
//   - Secret: PRODIGI_API_KEY   (your Prodigi API key)
//   - Var:    WEB3FORMS_KEY     (the same public key already used by the site's contact form)
//   - Var:    NOTIFY_EMAIL      (where order notifications should be sent)
//   - Var:    ALLOWED_ORIGIN    (https://ericgilmorestudio.com)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://ericgilmorestudio.com',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'POST' && url.pathname === '/api/orders') {
      return handleCreateOrder(request, env, corsHeaders);
    }

    if (request.method === 'GET' && url.pathname === '/api/confirm') {
      return handleConfirm(url, env);
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  },
};

async function handleCreateOrder(request, env, corsHeaders) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, corsHeaders);
  }

  const required = ['title', 'price', 'sku', 'imageUrl', 'name', 'email', 'address1', 'city', 'state', 'postalCode', 'country'];
  for (const field of required) {
    if (!body[field] || String(body[field]).trim() === '') {
      return json({ error: `Missing field: ${field}` }, 400, corsHeaders);
    }
  }

  const orderId = crypto.randomUUID();
  const token = crypto.randomUUID();
  const order = {
    ...body,
    status: 'pending',
    createdAt: new Date().toISOString(),
    token,
  };

  await env.ORDERS.put(orderId, JSON.stringify(order));

  const confirmUrl = `${new URL(request.url).origin}/api/confirm?orderId=${orderId}&token=${token}`;
  const message = [
    `New print order: ${body.title} ($${body.price})`,
    ``,
    `Buyer: ${body.name} <${body.email}>`,
    `Ship to:`,
    body.address1,
    body.address2 || '',
    `${body.city}, ${body.state} ${body.postalCode}`,
    body.country,
    ``,
    `Once you've confirmed the Venmo payment landed, click below to send this order to Prodigi:`,
    confirmUrl,
  ].filter(Boolean).join('\n');

  await notifyByEmail(env, `New print order — ${body.title}`, message);

  return json({ orderId }, 200, corsHeaders);
}

async function handleConfirm(url, env) {
  const orderId = url.searchParams.get('orderId');
  const token = url.searchParams.get('token');

  if (!orderId || !token) {
    return html('Missing orderId or token.');
  }

  const raw = await env.ORDERS.get(orderId);
  if (!raw) {
    return html('Order not found. It may have expired or the link is wrong.');
  }

  const order = JSON.parse(raw);

  if (order.token !== token) {
    return html('Invalid confirmation link.');
  }

  if (order.status === 'fulfilled') {
    return html(`This order was already sent to Prodigi (Prodigi order ID: ${order.prodigiOrderId}).`);
  }

  const prodigiRes = await fetch('https://api.prodigi.com/v4.0/Orders', {
    method: 'POST',
    headers: {
      'X-API-Key': env.PRODIGI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      shippingMethod: 'Standard',
      recipient: {
        name: order.name,
        address: {
          line1: order.address1,
          line2: order.address2 || '',
          postalOrZipCode: order.postalCode,
          countryCode: order.country,
          townOrCity: order.city,
          stateOrCounty: order.state,
        },
      },
      items: [
        {
          sku: order.sku,
          copies: 1,
          sizing: 'fillPrintArea',
          assets: [{ printArea: 'default', url: order.imageUrl }],
        },
      ],
    }),
  });

  const result = await prodigiRes.json();

  if (!prodigiRes.ok) {
    order.status = 'error';
    order.error = JSON.stringify(result);
    await env.ORDERS.put(orderId, JSON.stringify(order));
    return html(`Prodigi order failed:<br><pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>`);
  }

  order.status = 'fulfilled';
  order.prodigiOrderId = result.order && result.order.id;
  await env.ORDERS.put(orderId, JSON.stringify(order));

  return html(`Order sent to Prodigi. Prodigi order ID: ${order.prodigiOrderId}`);
}

async function notifyByEmail(env, subject, message) {
  try {
    await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: env.WEB3FORMS_KEY,
        subject,
        email: env.NOTIFY_EMAIL,
        message,
      }),
    });
  } catch {
    // best effort — order is already saved in KV even if the email fails
  }
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function html(body) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;">${body}</body>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
