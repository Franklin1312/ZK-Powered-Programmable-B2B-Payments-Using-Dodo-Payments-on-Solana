// MOCK: Simulates Dodo Payments API
// Real integration: https://docs.dodo.ac/

const payments = new Map(); // in-memory store

async function createPaymentIntent({ amount, currency, recipientId, metadata }) {
  const paymentId = `dodo_${Date.now()}`;
  const intent = {
    id: paymentId,
    amount,
    currency,
    status: "pending",
    recipientId,
    metadata,
    createdAt: new Date().toISOString(),
  };
  payments.set(paymentId, intent);
  console.log(`[Dodo Mock] Payment intent created: ${paymentId}`);
  return intent;
}

// Simulate payment confirmation (real: Dodo webhook)
async function confirmPayment(paymentId) {
  const payment = payments.get(paymentId);
  if (!payment) throw new Error("Payment not found");
  payment.status = "confirmed";
  payments.set(paymentId, payment);
  console.log(`[Dodo Mock] Payment confirmed: ${paymentId}`);
  return payment;
}

async function getPayment(paymentId) {
  return payments.get(paymentId);
}

module.exports = { createPaymentIntent, confirmPayment, getPayment };