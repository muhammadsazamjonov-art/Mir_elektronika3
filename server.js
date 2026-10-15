const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'store.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Data helpers ----------
function defaultData() {
  return {
    storeName: 'Bozor Store',
    storeTagline: 'Sifatli elektronika — eng arzon narxlarda',
    phone: '+998 90 123 45 67',
    tg: 'bozorstore',
    card: '',
    holder: '',
    logo: '',
    rate: 12500,
    currency: 'UZS',
    currencySymbol: "so'm",
    promo: [
      { c: 'SALE10', pct: 10 }
    ],
    products: [
      { id: 'p1', n: 'Arduino Uno R3', code: 'ARD-UNO', pr: 180000, c: 'Mikrokontroller', d: 'Original Arduino Uno R3 (CH340), USB kabel bilan.', img: '' },
      { id: 'p2', n: 'ESP32-WROOM-32', code: 'ESP32-W', pr: 220000, c: 'WiFi mikrokontroller', d: 'WiFi + Bluetooth, 38 pin, dual-core.', img: '' },
      { id: 'p3', n: 'Raspberry Pi Pico W', code: 'PICO-W', pr: 165000, c: 'Mikrokontroller', d: 'RP2040 chip, WiFi, MicroPython qo\'llab-quvvatlaydi.', img: '' },
      { id: 'p4', n: 'Servo motor SG90', code: 'SRV-SG90', pr: 45000, c: 'Motorlar', d: '9g mikro servo, 180°, plastik shesternya.', img: '' },
      { id: 'p5', n: 'Breadboard 830 nuqta', code: 'BB-830', pr: 35000, c: 'Aksessuar', d: '830 nuqtali non taxtasi, o\'z-o\'zidan yopishqoq.', img: '' },
      { id: 'p6', n: 'LED chiziq WS2812B (1m)', code: 'LED-WS1', pr: 95000, c: 'LED yoritish', d: 'RGB adreslanadigan LED chiziq, 60 LED, 5V.', img: '' }
    ],
    categories: ['Hammasi', 'Mikrokontroller', 'WiFi mikrokontroller', 'Motorlar', 'Aksessuar', 'LED yoritish'],
    admins: [
      { username: 'ibrohim', password: '2013', createdAt: Date.now() }
    ],
    orders: []
  };
}

function loadData() {
  try {
    if (!fs.existsSync(path.dirname(DATA_FILE))) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const d = defaultData();
      fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
      return d;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const d = JSON.parse(raw);
    // Migration / defaults
    const def = defaultData();
    for (const k of Object.keys(def)) {
      if (d[k] === undefined) d[k] = def[k];
    }
    if (!Array.isArray(d.admins) || d.admins.length === 0) {
      d.admins = def.admins;
    }
    if (!Array.isArray(d.promo)) d.promo = [];
    if (!Array.isArray(d.products)) d.products = [];
    if (!Array.isArray(d.orders)) d.orders = [];
    return d;
  } catch (e) {
    console.error('loadData error:', e);
    return defaultData();
  }
}

let DATA = loadData();

// Atomic save (write temp + rename) for better reliability
function atomicSave(data) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function saveData() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    atomicSave(DATA);
  } catch (err) {
    console.error('saveData error:', err);
  }
  broadcast({ type: 'update', ts: Date.now() });
}

// Save on shutdown/restart too
process.on('SIGTERM', () => { try { atomicSave(DATA); } catch(e){} process.exit(0); });
process.on('SIGINT', () => { try { atomicSave(DATA); } catch(e){} process.exit(0); });

// ---------- Sessions ----------
const sessions = new Map(); // token -> { username, createdAt }
function createSession(username) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { username, createdAt: Date.now() });
  return token;
}
function auth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.token;
  const s = token ? sessions.get(token) : null;
  if (!s) return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi' });
  req.admin = s;
  next();
}

// ---------- SSE (real-time) ----------
const sseClients = new Set();
function broadcast(msg) {
  const data = `data: ${JSON.stringify(msg)}\n\n`;
  for (const res of sseClients) {
    try { res.write(data); } catch (e) { /* ignore */ }
  }
}
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  res.write(`data: ${JSON.stringify({ type: 'hello', ts: Date.now() })}\n\n`);
  sseClients.add(res);
  const ping = setInterval(() => {
    try { res.write(': ping\n\n'); } catch (e) {}
  }, 25000);
  req.on('close', () => {
    clearInterval(ping);
    sseClients.delete(res);
  });
});

// ---------- Public API ----------
app.get('/api/store', (req, res) => {
  // Public: don't expose admin passwords/names
  const { admins, ...publicData } = DATA;
  res.json(publicData);
});

// Orders
app.post('/api/orders', (req, res) => {
  const { items, subtotal, discount, total, pay, name, phone, address, note, promoCode } = req.body || {};
  if (!name || !phone || !address || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Ism, telefon, manzil va kamida bitta mahsulot kerak" });
  }
  const id = Math.floor(10000 + Math.random() * 90000);
  const order = {
    id, ts: Date.now(), items, subtotal, discount, total, pay, name, phone, address, note: note || '', promoCode: promoCode || '', status: 'new'
  };
  DATA.orders.unshift(order);
  saveData();
  res.json({ ok: true, order });
});

// ---------- Admin API ----------
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const u = DATA.admins.find(a => a.username === username && String(a.password) === String(password));
  if (!u) return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });
  const token = createSession(u.username);
  res.json({ ok: true, token, username: u.username });
});

app.post('/api/admin/logout', auth, (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  sessions.delete(token);
  res.json({ ok: true });
});

app.get('/api/admin/me', auth, (req, res) => {
  res.json({ ok: true, username: req.admin.username });
});

// Full admin data (includes admins list, orders)
app.get('/api/admin/data', auth, (req, res) => {
  res.json({ ok: true, data: DATA, username: req.admin.username });
});

// Update settings
app.post('/api/admin/settings', auth, (req, res) => {
  const s = req.body || {};
  const allow = ['storeName', 'storeTagline', 'phone', 'tg', 'card', 'holder', 'logo', 'rate', 'currency', 'currencySymbol'];
  for (const k of allow) {
    if (s[k] !== undefined) DATA[k] = s[k];
  }
  if (typeof DATA.rate !== 'number') DATA.rate = Number(DATA.rate) || 0;
  saveData();
  res.json({ ok: true });
});

// Products CRUD
app.post('/api/admin/products', auth, (req, res) => {
  const p = req.body || {};
  if (!p.n || !p.code) return res.status(400).json({ error: 'Nomi va kodi kerak' });
  const id = 'p' + Date.now() + Math.floor(Math.random() * 1000);
  const product = {
    id,
    n: String(p.n).slice(0, 200),
    code: String(p.code).slice(0, 50),
    pr: Number(p.pr) || 0,
    c: String(p.c || '').slice(0, 100),
    d: String(p.d || '').slice(0, 1000),
    img: String(p.img || '')
  };
  DATA.products.push(product);
  const cat = product.c;
  if (cat && !DATA.categories.includes(cat)) DATA.categories.push(cat);
  saveData();
  res.json({ ok: true, product });
});

app.put('/api/admin/products/:id', auth, (req, res) => {
  const id = req.params.id;
  const idx = DATA.products.findIndex(p => p.id === id);
  if (idx < 0) return res.status(404).json({ error: 'Mahsulot topilmadi' });
  const u = req.body || {};
  const allow = ['n', 'code', 'pr', 'c', 'd', 'img'];
  for (const k of allow) {
    if (u[k] !== undefined) DATA.products[idx][k] = u[k];
  }
  DATA.products[idx].pr = Number(DATA.products[idx].pr) || 0;
  if (DATA.products[idx].c && !DATA.categories.includes(DATA.products[idx].c)) {
    DATA.categories.push(DATA.products[idx].c);
  }
  saveData();
  res.json({ ok: true, product: DATA.products[idx] });
});

app.delete('/api/admin/products/:id', auth, (req, res) => {
  const id = req.params.id;
  const before = DATA.products.length;
  DATA.products = DATA.products.filter(p => p.id !== id);
  if (DATA.products.length === before) return res.status(404).json({ error: 'Topilmadi' });
  saveData();
  res.json({ ok: true });
});

// Categories
app.post('/api/admin/categories', auth, (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Kategoriya nomi kerak' });
  const n = name.trim();
  if (DATA.categories.includes(n)) return res.status(400).json({ error: 'Bunday kategoriya bor' });
  DATA.categories.push(n);
  saveData();
  res.json({ ok: true, categories: DATA.categories });
});
app.delete('/api/admin/categories/:name', auth, (req, res) => {
  const n = decodeURIComponent(req.params.name);
  if (n === 'Hammasi') return res.status(400).json({ error: '"Hammasi" o\'chirilmaydi' });
  DATA.categories = DATA.categories.filter(c => c !== n);
  saveData();
  res.json({ ok: true, categories: DATA.categories });
});

// Promo codes
app.post('/api/admin/promo', auth, (req, res) => {
  const { c, pct } = req.body || {};
  const code = String(c || '').trim().toUpperCase();
  const p = Math.round(Number(pct) || 0);
  if (!code || p < 1 || p > 90) return res.status(400).json({ error: 'Kod va chegirma 1–90% bo\'lsin' });
  DATA.promo = DATA.promo.filter(x => x.c !== code);
  DATA.promo.push({ c: code, pct: p });
  saveData();
  res.json({ ok: true, promo: DATA.promo });
});
app.delete('/api/admin/promo/:code', auth, (req, res) => {
  const c = decodeURIComponent(req.params.code).toUpperCase();
  DATA.promo = DATA.promo.filter(x => x.c !== c);
  saveData();
  res.json({ ok: true, promo: DATA.promo });
});

// Admins management
app.get('/api/admin/admins', auth, (req, res) => {
  const list = DATA.admins.map(a => ({ username: a.username, createdAt: a.createdAt }));
  res.json({ ok: true, admins: list, current: req.admin.username });
});
app.post('/api/admin/admins', auth, (req, res) => {
  const { username, password } = req.body || {};
  const u = String(username || '').trim();
  const p = String(password || '');
  if (!u || !p) return res.status(400).json({ error: 'Login va parol kerak' });
  if (u.length < 3) return res.status(400).json({ error: 'Login kamida 3 belgi' });
  if (p.length < 3) return res.status(400).json({ error: 'Parol kamida 3 belgi' });
  if (DATA.admins.some(a => a.username === u)) return res.status(400).json({ error: 'Bunday admin allaqachon bor' });
  DATA.admins.push({ username: u, password: p, createdAt: Date.now() });
  saveData();
  res.json({ ok: true, admins: DATA.admins.map(a => ({ username: a.username, createdAt: a.createdAt })) });
});
app.delete('/api/admin/admins/:username', auth, (req, res) => {
  const u = decodeURIComponent(req.params.username);
  if (u === req.admin.username) return res.status(400).json({ error: 'O\'zingizni o\'chira olmaysiz' });
  if (DATA.admins.length <= 1) return res.status(400).json({ error: 'Kamida bitta admin qolishi kerak' });
  const before = DATA.admins.length;
  DATA.admins = DATA.admins.filter(a => a.username !== u);
  if (DATA.admins.length === before) return res.status(404).json({ error: 'Admin topilmadi' });
  saveData();
  res.json({ ok: true, admins: DATA.admins.map(a => ({ username: a.username, createdAt: a.createdAt })) });
});
app.post('/api/admin/change-password', auth, (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  const me = DATA.admins.find(a => a.username === req.admin.username);
  if (!me) return res.status(401).json({ error: 'Sessiya topilmadi' });
  if (String(me.password) !== String(oldPassword)) return res.status(400).json({ error: 'Eski parol noto\'g\'ri' });
  const np = String(newPassword || '');
  if (np.length < 3) return res.status(400).json({ error: 'Yangi parol kamida 3 belgi' });
  me.password = np;
  saveData();
  res.json({ ok: true });
});

// Orders
app.get('/api/admin/orders', auth, (req, res) => {
  res.json({ ok: true, orders: DATA.orders });
});
app.post('/api/admin/orders/:id/status', auth, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const allowed = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Noto\'g\'ri status' });
  const o = DATA.orders.find(x => x.id === id);
  if (!o) return res.status(404).json({ error: 'Buyurtma topilmadi' });
  o.status = status;
  saveData();
  res.json({ ok: true, order: o });
});
app.delete('/api/admin/orders/:id', auth, (req, res) => {
  const id = Number(req.params.id);
  const before = DATA.orders.length;
  DATA.orders = DATA.orders.filter(x => x.id !== id);
  if (DATA.orders.length === before) return res.status(404).json({ error: 'Topilmadi' });
  saveData();
  res.json({ ok: true });
});

// Backup & Restore (Render disk yo'q paytda ma'lumotlarni saqlash uchun)
app.get('/api/admin/backup', auth, (req, res) => {
  const copy = JSON.parse(JSON.stringify(DATA));
  const fileName = `bozor-store-backup-${new Date().toISOString().slice(0,10)}.json`;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(JSON.stringify(copy, null, 2));
});

app.post('/api/admin/restore', auth, (req, res) => {
  const data = req.body || {};
  if (typeof data !== 'object' || !Array.isArray(data.products)) {
    return res.status(400).json({ error: 'Noto\'g\'ri backup fayl formati' });
  }
  // Validate structure
  const restored = { ...defaultData(), ...data };
  // Sanitize
  restored.products = Array.isArray(data.products) ? data.products.map(p => ({
    id: p.id || ('p'+Date.now()+Math.floor(Math.random()*1000)),
    n: String(p.n||'').slice(0,200),
    code: String(p.code||''),
    pr: Number(p.pr)||0,
    c: String(p.c||'').slice(0,100),
    d: String(p.d||'').slice(0,1000),
    img: String(p.img||'')
  })) : [];
  restored.promo = Array.isArray(data.promo) ? data.promo.filter(p=>p.c&&p.pct).map(p=>({c:String(p.c).toUpperCase(),pct:Math.max(1,Math.min(90,Number(p.pct)||0))})) : [];
  restored.categories = Array.isArray(data.categories) ? data.categories.filter(c=>typeof c==='string'&&c.trim()) : ['Hammasi'];
  if (!restored.categories.includes('Hammasi')) restored.categories.unshift('Hammasi');
  restored.orders = Array.isArray(data.orders) ? data.orders : [];
  // Keep current session's admin from existing if restoring; merge admins
  if (Array.isArray(data.admins) && data.admins.length > 0) {
    restored.admins = data.admins.map(a => ({
      username: String(a.username||''),
      password: String(a.password||''),
      createdAt: Number(a.createdAt)||Date.now()
    })).filter(a=>a.username && a.password);
    // Ensure current admin exists in restored data
    if (!restored.admins.find(a => a.username === req.admin.username)) {
      restored.admins.push({ username: req.admin.username, password: '2013', createdAt: Date.now() });
    }
  } else {
    restored.admins = DATA.admins;
  }
  restored.storeName = String(data.storeName||'Bozor Store').slice(0,100);
  restored.storeTagline = String(data.storeTagline||'').slice(0,300);
  restored.phone = String(data.phone||'');
  restored.tg = String(data.tg||'bozorstore').replace(/^@/,'');
  restored.card = String(data.card||'');
  restored.holder = String(data.holder||'');
  restored.logo = String(data.logo||'');
  restored.rate = Number(data.rate)||0;
  restored.currency = String(data.currency||'UZS');
  restored.currencySymbol = String(data.currencySymbol||"so'm");
  DATA = restored;
  saveData();
  res.json({ ok: true });
});

// Reset (emergency)
app.post('/api/admin/reset', auth, (req, res) => {
  const def = defaultData();
  // Keep admins
  def.admins = DATA.admins;
  DATA = def;
  saveData();
  res.json({ ok: true });
});

app.get('/deploy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'deploy.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Bozor Store server running on port ${PORT}`);
});
