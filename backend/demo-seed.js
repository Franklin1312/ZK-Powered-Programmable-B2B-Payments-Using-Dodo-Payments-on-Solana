require("dotenv").config();
const crypto = require("crypto");
const { computeCommitment } = require("./src/services/zk");
const { initializeEscrow }  = require("./src/services/solana");
const { Keypair, PublicKey } = require("@solana/web3.js");
const fs                    = require("fs");

const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID);

async function seed() {
  console.log("\n Seeding demo escrow on Solana devnet...\n");

  const privateValue = 9950;
  const salt         = 12345;
  const threshold    = 9900;
  const paymentRef   = `demo-seed-${Date.now()}`;

  const commitment = await computeCommitment(privateValue, salt);
  console.log("Commitment:", commitment);

  const payerKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.PAYER_PRIVATE_KEY))
  );

  const recipientKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.RECIPIENT_PRIVATE_KEY))
  );

  // Derive the PDA — same formula used in the on-chain program
  const paymentRefBytes = crypto.createHash("sha256").update(paymentRef).digest();
  const [escrowPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), payerKeypair.publicKey.toBuffer(), paymentRefBytes],
    PROGRAM_ID
  );

  let tx = null;

  try {
    const result = await initializeEscrow({
      recipientPubkey: recipientKeypair.publicKey.toBase58(),
      amount: 10 * 1_000_000,
      threshold,
      commitment,
      paymentRef,
    });
    tx = result.tx;
    console.log("\n Demo escrow created!");
  } catch (err) {
    const alreadyExists =
      err?.transactionLogs?.some((l) => l.includes("already in use")) ||
      err?.message?.includes("already in use");

    if (alreadyExists) {
      console.log("\n Escrow PDA already exists on-chain — reusing it.");
    } else {
      throw err;
    }
  }

  const demoState = {
    escrowPDA: escrowPDA.toBase58(),
    tx,
    commitment,
    paymentRef,
    threshold,
    privateValue,
    salt,
    recipientPubkey: recipientKeypair.publicKey.toBase58(),
  };

  fs.writeFileSync("demo-state.json", JSON.stringify(demoState, null, 2));

  console.log(" Escrow PDA:", escrowPDA.toBase58());
  if (tx) {
    console.log(" Tx:", tx);
    console.log(" Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=testnet`);
  }
  console.log("\n Demo state saved to demo-state.json");
  console.log(" Share commitment with recipient:", commitment.slice(0, 30) + "...");
}

seed().catch(console.error);
