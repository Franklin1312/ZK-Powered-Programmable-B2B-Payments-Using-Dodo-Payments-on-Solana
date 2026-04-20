const path     = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "../../payments.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id              TEXT PRIMARY KEY,
    amount          REAL,
    currency        TEXT,
    status          TEXT,
    recipient_id    TEXT,
    metadata        TEXT,
    dodo_payment_id TEXT,
    checkout_url    TEXT,
    created_at      TEXT,
    updated_at      TEXT
  )
`);

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function now() { return new Date().toISOString(); }

async function createPaymentIntent({ amount, currency, recipientId, metadata }) {
  const localId       = genId("pay");
  const dodoPaymentId = genId("mock");

  db.prepare(`
    INSERT INTO payments
      (id, amount, currency, status, recipient_id, metadata,
       dodo_payment_id, checkout_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    localId, amount, currency, "pending",
    recipientId, JSON.stringify(metadata),
    dodoPaymentId, null, now(), now()
  );

  console.log(`[Dodo MOCK] Intent created: ${localId}`);
  return {
    id: localId, dodoPaymentId, checkoutUrl: null,
    amount, currency, status: "pending",
    recipientId, metadata, createdAt: now()
  };
}

async function confirmPayment(id) {
  const row = db.prepare("SELECT * FROM payments WHERE id = ?").get(id);
  if (!row) throw new Error(`Payment not found: ${id}`);
  db.prepare("UPDATE payments SET status = ?, updated_at = ? WHERE id = ?")
    .run("confirmed", now(), id);
  console.log(`[Dodo MOCK] Confirmed: ${id}`);
  return { ...row, status: "confirmed" };
}

async function getPaymentStatus(dodoPaymentId) {
  return { status: "succeeded", id: dodoPaymentId };
}

async function getPayment(id) {
  const row = db.prepare("SELECT * FROM payments WHERE id = ?").get(id);
  if (!row) return null;
  return { ...row, metadata: JSON.parse(row.metadata || "{}") };
}

module.exports = { createPaymentIntent, confirmPayment, getPaymentStatus, getPayment };
