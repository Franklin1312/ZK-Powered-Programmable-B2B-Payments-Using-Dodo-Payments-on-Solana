const payments = new Map();

async function createPaymentIntent({ amount, currency, recipientId, metadata }) {
  const id = `dodo_${Date.now()}`;
  const intent = { id, amount, currency, status: "pending", recipientId, metadata };
  payments.set(id, intent);
  console.log(`[Dodo] Intent created: ${id}`);
  return intent;
}

async function confirmPayment(id) {
  const p = payments.get(id);
  if (!p) throw new Error("Payment not found");
  p.status = "confirmed";
  payments.set(id, p);
  console.log(`[Dodo] Confirmed: ${id}`);
  return p;
}

async function getPayment(id) {
  return payments.get(id);
}

module.exports = { createPaymentIntent, confirmPayment, getPayment };
