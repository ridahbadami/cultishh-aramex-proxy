// Cultishh Aramex Proxy
// Runs on Railway (AWS) to bypass Cloudflare-to-Cloudflare blocking.
// The Cloudflare Worker calls this proxy; this proxy calls Aramex.

import express from 'express';

const app  = express();
const PORT = process.env.PORT || 3000;

const ARAMEX_SHIP_URL = 'https://ws.aramex.net/ShippingAPI.V2/Shipments/Service_1_0.svc/json/CreateShipments';
const ARAMEX_PICK_URL = 'https://ws.aramex.net/ShippingAPI.V2/Pickup/Service_1_0.svc/json/CreatePickup';
const PROXY_SECRET    = process.env.PROXY_SECRET || '';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

app.use(express.json({ limit: '1mb' }));

function checkSecret(req, res, next) {
    if (PROXY_SECRET && req.headers['x-proxy-secret'] !== PROXY_SECRET) {
          return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

app.get('/', (req, res) => res.json({ ok: true, service: 'cultishh-aramex-proxy' }));
app.get('/myip', async (req, res) => {
        try {
                    const r = await fetch('https://api.ipify.org?format=json');
                    const data = await r.json();
                    res.json({ outbound_ip: data.ip });
        } catch(e) {
                    res.status(500).json({ error: e.message });
        }
});

app.post('/aramex/ship', checkSecret, async (req, res) => {
    try {
          console.log('[ship] forwarding to Aramex, body keys:', Object.keys(req.body || {}));
          const r = await fetch(ARAMEX_SHIP_URL, {
                  method:  'POST',
                  headers: {
                            'Content-Type': 'application/json',
                            'Accept':       'application/json',
                            'User-Agent':   UA,
                            'Origin':       'https://www.aramex.com',
                            'Referer':      'https://www.aramex.com/',
                  },
                  body: JSON.stringify(req.body),
          });
          const text = await r.text();
          console.log('[ship] Aramex status:', r.status, '| body:', text.substring(0, 200));
          const respH = {};
          r.headers.forEach((v, k) => { respH[k] = v; });
          console.log('[ship] resp headers:', JSON.stringify(respH));
          let data;
          try { data = JSON.parse(text); } catch { data = { raw: text }; }
          res.status(r.status).json(data);
    } catch (e) {
          console.error('[ship] fetch error:', e.message);
          res.status(500).json({ error: 'Proxy fetch error: ' + e.message });
    }
});

app.post('/aramex/pickup', checkSecret, async (req, res) => {
    try {
          console.log('[pickup] forwarding to Aramex, body keys:', Object.keys(req.body || {}));
          const r = await fetch(ARAMEX_PICK_URL, {
                  method:  'POST',
                  headers: {
          'Content-Type': 'application/json',
                            'Accept':       'application/json',
                            'User-Agent':   UA,
                            'Origin':       'https://www.aramex.com',
                            'Referer':      'https://www.aramex.com/',
                  },
                  body: JSON.stringify(req.body),
          });
          const text = await r.text();
          console.log('[pickup] Aramex status:', r.status, '| body:', text.substring(0, 200));
          let data;
          try { data = JSON.parse(text); } catch { data = { raw: text }; }
          res.status(r.status).json(data);
    } catch (e) {
          console.error('[pickup] fetch error:', e.message);
          res.status(500).json({ error: 'Proxy fetch error: ' + e.message });
    }
});

app.listen(PORT, () => console.log(`Aramex proxy running on port ${PORT}`));
