const express = require("express");
const router  = express.Router();
const { Keypair } = require("@solana/web3.js");
const dodo    = require("../services/dodo");
const solana  = require("../services/solana");
const { computeCommitment } = require("../services/zk");

// POST /api/payment/create
// Creates a Dodo payment intent (mock), confirms it immediately, then
// initialises the Solana escrow. Shape of response is unchanged from
// the real implementation so the frontend needs no updates.
router.post("/create", async (req, res) => {
  try {
    const {
      amount,
      threshold,
      recipientPubkey,
      privateValue,
      salt,
      payerPubkey,
      useWalletSigner,
    } = req.body;

    const envRecipientPubkey = Keypair
      .fromSecretKey(Uint8Array.from(JSON.parse(process.env.RECIPIENT_PRIVATE_KEY)))
      .publicKey
      .toBase58();
    const recipientPubkeyUsed = recipientPubkey || envRecipientPubkey;

    // 1. Compute ZK commitment off-chain
    const commitment = await computeCommitment(privateValue, salt);
    console.log("[Payment] Commitment:", commitment.slice(0, 20) + "...");

    // 2. Create Dodo payment intent (mock — no HTTP call, immediate)
    const intent = await dodo.createPaymentIntent({
      amount,
      currency:    "USD",
      recipientId: recipientPubkeyUsed,
      metadata:    { threshold, commitment, recipientId: recipientPubkeyUsed, privateValue, salt },
    });

    // 3. Auto-confirm — in production this would be triggered by the Dodo webhook
    await dodo.confirmPayment(intent.id);

    // 4. Lock funds on Solana
    const amountMicros = amount * 1_000_000;
    const escrowInit = useWalletSigner && payerPubkey
      ? await solana.buildInitializeEscrowTx({
          payerPubkey,
          recipientPubkey: recipientPubkeyUsed,
          amount: amountMicros,
          threshold,
          commitment,
          paymentRef: intent.id,
        })
      : await solana.initializeEscrow({
          recipientPubkey: recipientPubkeyUsed,
          amount: amountMicros,
          threshold,
          commitment,
          paymentRef: intent.id,
        });

    const { escrowPDA, tx, reusedEscrow, isReleased, serializedTx, requiresClientSignature } = escrowInit;

    res.json({
      success:     true,
      paymentId:   intent.id,
      checkoutUrl: intent.checkoutUrl,  // null in mock
      isSimulated: true,                // always true in mock mode
      payerPubkeyUsed: payerPubkey || null,
      recipientPubkeyUsed,
      paymentRef: intent.id,
      escrowPDA,
      tx,
      serializedTx: serializedTx || null,
      requiresClientSignature: Boolean(requiresClientSignature),
      reusedEscrow,
      isReleased,
      commitment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payment/:id — check payment status
router.get("/:id", async (req, res) => {
  try {
    const payment = await dodo.getPayment(req.params.id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
