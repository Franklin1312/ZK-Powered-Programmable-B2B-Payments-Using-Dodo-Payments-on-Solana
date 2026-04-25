const axios = require("axios");
const path = require("path");
const Database = require("better-sqlite3");

// ── SQLite for payment / checkout persistence ──────────────
const db = new Database(path.join(__dirname, "../payments.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id              TEXT PRIMARY KEY,
    session_id      TEXT,
    checkout_url    TEXT,
    amount          REAL,
    currency        TEXT,
    status          TEXT,
    recipient_id    TEXT,
    metadata        TEXT,
    escrow_pda      TEXT,
    escrow_tx       TEXT,
    dodo_payment_id TEXT,
    created_at      TEXT,
    updated_at      TEXT
  )
`);

// ── Dodo Payments REST API ──────────────────────────────────
const DODO_BASE = process.env.DODO_MODE === "live" 
  ? "https://live.dodopayments.com" 
  : "https://test.dodopayments.com";

const headers = () => {
  const key = process.env.DODO_PAYMENTS_API_KEY || "";
  if (!key) console.warn("[Dodo] ⚠ DODO_PAYMENTS_API_KEY is missing!");
  
  // Debug (safe): log only the first 5 chars to verify prefix
  console.log(`[Dodo] Using API key starting with: ${key.slice(0, 5)}...`);
  
  return {
    Authorization: `Bearer ${key.trim()}`,
    "Content-Type": "application/json",
  };
};

function now() { return new Date().toISOString(); }
function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Create a Dodo checkout session ─────────────────────────
// Uses Pay-What-You-Want product; amount is in cents (USD).
async function createCheckoutSession({
  amount,
  recipientId,
  metadata,
  returnUrl,
  customerEmail,
}) {
  const localId = genId("pay");
  const amountCents = Math.round(amount * 100); // USD → cents

  const body = {
    product_cart: [
      {
        product_id: process.env.DODO_PRODUCT_ID,
        quantity: 1,
        amount: amountCents, // PWYW amount in cents
      },
    ],
    metadata: {
      localId,
      recipientId,
      ...metadata,
    },
    // Return user to the payer dashboard after payment completes.
    // localId is appended so the frontend can immediately start polling.
    return_url: returnUrl
      ? `${returnUrl}?payment=${localId}&status=success`
      : undefined,
  };

  // Attach customer email if provided
  if (customerEmail) {
    body.customer = { email: customerEmail, name: "Payer" };
  }

  console.log("[Dodo] Creating checkout session...", { localId, amountCents });

  const res = await axios.post(`${DODO_BASE}/checkouts`, body, {
    headers: headers(),
  });

  const sessionId = res.data.session_id;
  const checkoutUrl = res.data.checkout_url;

  // Persist locally
  db.prepare(`
    INSERT INTO payments
      (id, session_id, checkout_url, amount, currency, status,
       recipient_id, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    localId, sessionId, checkoutUrl, amount, "USD", "pending",
    recipientId, JSON.stringify(metadata), now(), now()
  );

  console.log(`[Dodo] Checkout session created: ${sessionId} → ${checkoutUrl}`);

  return {
    localId,
    sessionId,
    checkoutUrl,
    amount,
    currency: "USD",
    status: "pending",
  };
}

// ── Mark payment confirmed + store escrow details ──────────
function confirmPayment(localId, { escrowPDA, escrowTx, dodoPaymentId } = {}) {
  db.prepare(`
    UPDATE payments
    SET status = ?, escrow_pda = ?, escrow_tx = ?,
        dodo_payment_id = ?, updated_at = ?
    WHERE id = ?
  `).run("confirmed", escrowPDA || null, escrowTx || null,
    dodoPaymentId || null, now(), localId);
  console.log(`[Dodo] Payment confirmed: ${localId}`);
}

// ── Mark payment failed ────────────────────────────────────
function failPayment(localId) {
  db.prepare("UPDATE payments SET status = ?, updated_at = ? WHERE id = ?")
    .run("failed", now(), localId);
  console.log(`[Dodo] Payment failed: ${localId}`);
}

// ── Look up payment by localId ─────────────────────────────
function getPayment(id) {
  const row = db.prepare("SELECT * FROM payments WHERE id = ?").get(id);
  if (!row) return null;
  return { ...row, metadata: JSON.parse(row.metadata || "{}") };
}

// ── Look up payment by session_id ──────────────────────────
function getPaymentBySession(sessionId) {
  const row = db.prepare("SELECT * FROM payments WHERE session_id = ?").get(sessionId);
  if (!row) return null;
  return { ...row, metadata: JSON.parse(row.metadata || "{}") };
}

// ── Look up payment by localId stored in metadata ──────────
function getPaymentByLocalId(localId) {
  return getPayment(localId);
}

module.exports = {
  createCheckoutSession,
  confirmPayment,
  failPayment,
  getPayment,
  getPaymentBySession,
  getPaymentByLocalId,
};
