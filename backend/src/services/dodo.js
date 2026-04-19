const axios  = require("axios");
const path   = require("path");
const Database = require("better-sqlite3");

// ── SQLite for payment persistence ─────────────────────────
const db = new Database(path.join(__dirname, "../../payments.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    amount REAL,
    currency TEXT,
    status TEXT,
    recipient_id TEXT,
    metadata TEXT,
    dodo_payment_id TEXT,
    checkout_url TEXT,
    created_at TEXT,
    updated_at TEXT
  )
`);

const DODO_BASE = "https://api.dodopayments.com/v1";
const HEADERS   = () => ({
  "Authorization": `Bearer ${process.env.DODO_API_KEY}`,
  "Content-Type":  "application/json",
});

// ── Create a Dodo payment intent ────────────────────────────
async function createPaymentIntent({ amount, currency, recipientId, metadata }) {
  const localId = `pay_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

  try {
    // Real Dodo API call
    const res = await axios.post(`${DODO_BASE}/payments`, {
      amount:   Math.round(amount * 100),  // cents
      currency: currency.toLowerCase(),
      metadata: {
        localId,
        recipientId,
        ...metadata,
      },
      success_url: `${process.env.APP_URL || "http://localhost:5000"}/payment-success`,
      cancel_url:  `${process.env.APP_URL || "http://localhost:5000"}/payment-cancel`,
    }, { headers: HEADERS() });

    const intent = {
      id:           localId,
      dodoPaymentId: res.data.id,
      checkoutUrl:  res.data.checkout_url || res.data.payment_url,
      amount,
      currency,
      status:       "pending",
      recipientId,
      metadata,
      createdAt:    new Date().toISOString(),
    };

    // Persist to SQLite
    db.prepare(`
      INSERT INTO payments (id, amount, currency, status, recipient_id, metadata, dodo_payment_id, checkout_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      intent.id, intent.amount, intent.currency, intent.status,
      intent.recipientId, JSON.stringify(intent.metadata),
      intent.dodoPaymentId, intent.checkoutUrl,
      intent.createdAt, intent.createdAt
    );

    console.log(`[Dodo] Payment intent created: ${localId} → Dodo ID: ${res.data.id}`);
    return intent;

  } catch (err) {
    // If Dodo API is unavailable or key not set, fall back to simulation
    if (!process.env.DODO_API_KEY || process.env.DODO_API_KEY.startsWith("sk_test_YOUR")) {
      console.warn("[Dodo] No real API key — using simulation mode");
      return simulatePayment({ localId, amount, currency, recipientId, metadata });
    }
    throw new Error(`Dodo API error: ${err.response?.data?.message || err.message}`);
  }
}

// ── Simulation fallback (no key set) ───────────────────────
function simulatePayment({ localId, amount, currency, recipientId, metadata }) {
  const intent = {
    id:           localId,
    dodoPaymentId: `sim_${localId}`,
    checkoutUrl:  null,
    amount, currency, status: "pending",
    recipientId, metadata,
    createdAt: new Date().toISOString(),
  };
  db.prepare(`
    INSERT INTO payments (id, amount, currency, status, recipient_id, metadata, dodo_payment_id, checkout_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    intent.id, intent.amount, intent.currency, intent.status,
    intent.recipientId, JSON.stringify(intent.metadata),
    intent.dodoPaymentId, null, intent.createdAt, intent.createdAt
  );
  return intent;
}

// ── Confirm payment (called by webhook or manual trigger) ───
async function confirmPayment(id) {
  const row = db.prepare("SELECT * FROM payments WHERE id = ?").get(id);
  if (!row) throw new Error(`Payment not found: ${id}`);

  db.prepare("UPDATE payments SET status = ?, updated_at = ? WHERE id = ?")
    .run("confirmed", new Date().toISOString(), id);

  console.log(`[Dodo] Payment confirmed: ${id}`);
  return { ...row, status: "confirmed" };
}

// ── Get payment status from Dodo (real API) ─────────────────
async function getPaymentStatus(dodoPaymentId) {
  if (!process.env.DODO_API_KEY || process.env.DODO_API_KEY.startsWith("sk_test_YOUR")) {
    return { status: "succeeded" };
  }
  const res = await axios.get(`${DODO_BASE}/payments/${dodoPaymentId}`, { headers: HEADERS() });
  return res.data;
}

async function getPayment(id) {
  const row = db.prepare("SELECT * FROM payments WHERE id = ?").get(id);
  if (!row) return null;
  return { ...row, metadata: JSON.parse(row.metadata || "{}") };
}

module.exports = { createPaymentIntent, confirmPayment, getPaymentStatus, getPayment };
