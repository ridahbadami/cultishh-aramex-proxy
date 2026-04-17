// Cultishh Aramex Proxy
// Runs on Railway (AWS) to bypass Cloudflare-to-Cloudflare blocking.
// The Cloudflare Worker calls this proxy; this proxy calls Aramex.

import express from 'express';

const app  = express();
const PORT = process.env.PORT || 3000;

const ARAMEX_SHIP_URL = 'https://ws.aramex.net/ShippingAPI.V2/Shipments/Service_1_0.svc/json/CreateShipments';
const ARAMEX_PICK_URL = 'https://ws.aramex.net/ShippingAPI.V2/Pickup/Service_1_0.svc/json/CreatePickup';
const PROXY_SECRET    = process.env.PROXY_SECRET || '';

app.use(express.json({ limit: '1mb' }));

// Auth middleware
function checkSecret(req, res, next) {
  if (PROXY_SECRET && req.headers['x-proxy-secret'] !== PROXY_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
        }
          next();
          }

          // Health check
          app.get('/', (req, res) => res.json({ ok: true, service: 'cultishh-aramex-proxy' }));

          // Proxy: CreateShipments
          app.post('/aramex/ship', checkSecret, async (req, res) => {
            try {
                const r = await fetch(ARAMEX_SHIP_URL, {
                      method:  'POST',
                            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                                  body:    JSON.stringify(req.body),
                                      });
                                          const text = await r.text();
                                              let data;
                                                  try { data = JSON.parse(text); } catch { data = { raw: text }; }
                                                      res.status(r.status).json(data);
                                                        } catch (e) {
                                                            res.status(500).json({ error: 'Proxy fetch error: ' + e.message });
                                                              }
                                                              });

                                                              // Proxy: CreatePickup
                                                              app.post('/aramex/pickup', checkSecret, async (req, res) => {
                                                                try {
                                                                    const r = await fetch(ARAMEX_PICK_URL, {
                                                                          method:  'POST',
                                                                                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                                                                                      body:    JSON.stringify(req.body),
                                                                                          });
                                                                                              const text = await r.text();
                                                                                                  let data;
                                                                                                      try { data = JSON.parse(text); } catch { data = { raw: text }; }
                                                                                                          res.status(r.status).json(data);
                                                                                                            } catch (e) {
                                                                                                                res.status(500).json({ error: 'Proxy fetch error: ' + e.message });
                                                                                                                  }
                                                                                                                  });
                                                                                                                  
                                                                                                                  app.listen(PORT, () => console.log(`Aramex proxy running on port ${PORT}`));
