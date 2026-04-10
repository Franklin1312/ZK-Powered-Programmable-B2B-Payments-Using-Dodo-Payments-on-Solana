require("dotenv").config();
const { computeCommitment } = require("./src/services/zk");
const { initializeEscrow }  = require("./src/services/solana");
const { Keypair }           = require("@solana/web3.js");
const fs                    = require("fs");

async function seed() {
  console.log("\n Seeding demo escrow on Solana devnet...\n");

  const privateValue = 9950;
  const salt         = 12345;
  const threshold    = 9900;

  const commitment = await computeCommitment(privateValue, salt);
  console.log("Commitment:", commitment);

  const recipientKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.RECIPIENT_PRIVATE_KEY))
  );

  const { escrowPDA, tx } = await initializeEscrow({
    recipientPubkey: recipientKeypair.publicKey.toBase58(),
    amount: 10 * 1_000_000,
    threshold,
    commitment,
  });

  const demoState = {
    escrowPDA,
    tx,
    commitment,
    threshold,
    privateValue,
    salt,
    recipientPubkey: recipientKeypair.publicKey.toBase58(),
  };

  fs.writeFileSync("demo-state.json", JSON.stringify(demoState, null, 2));

  console.log("\n Demo escrow seeded!");
  console.log(" Escrow PDA:", escrowPDA);
  console.log(" Tx:", tx);
  console.log(" Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
  console.log("\n Demo state saved to demo-state.json");
  console.log(" Share commitment with recipient:", commitment.slice(0,30) + "...");
}

seed().catch(console.error);

