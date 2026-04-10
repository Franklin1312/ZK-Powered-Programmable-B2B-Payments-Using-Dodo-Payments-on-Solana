const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const { getOrCreateAssociatedTokenAccount, mintTo } = require("@solana/spl-token");

const connection = new Connection(process.env.SOLANA_RPC, "confirmed");

function loadKeypair(envVar) {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env[envVar])));
}

function getProgram(keypair) {
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const idl = require("../../../program/target/idl/escrow.json");
  return new anchor.Program(idl, provider);
}

async function initializeEscrow({ recipientPubkey, amount, threshold, commitment }) {
  const payer = loadKeypair("PAYER_PRIVATE_KEY");
  const program = getProgram(payer);

  const [escrowPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), payer.publicKey.toBuffer()],
    program.programId
  );

  // Commitment as 32-byte array
  const commitBuf = Buffer.alloc(32);
  const commitHex = BigInt(commitment).toString(16).padStart(64, "0");
  Buffer.from(commitHex, "hex").copy(commitBuf);

  try {
    const tx = await program.methods
      .initializeEscrow(
        new anchor.BN(amount),
        new anchor.BN(threshold),
        [...commitBuf],
        new PublicKey(recipientPubkey)
      )
      .accounts({
        escrowState: escrowPDA,
        payer: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    return { escrowPDA: escrowPDA.toBase58(), tx };
  } catch (err) {
    // If the escrow PDA already exists on-chain, reuse it
    const alreadyExists =
      err?.transactionLogs?.some?.((l) => l.includes("already in use")) ||
      err?.message?.includes("already in use");

    if (alreadyExists) {
      console.log("[Solana] Escrow PDA already exists — reusing:", escrowPDA.toBase58());
      return { escrowPDA: escrowPDA.toBase58(), tx: null };
    }
    throw err;
  }
}

async function releasePayment({ payerPubkey, proof, publicSignals }) {
  const recipient = loadKeypair("RECIPIENT_PRIVATE_KEY");
  const program = getProgram(recipient);

  const [escrowPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), new PublicKey(payerPubkey).toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .verifyAndRelease()
    .accounts({
      escrowState: escrowPDA,
      recipient: recipient.publicKey,
    })
    .signers([recipient])
    .rpc();

  return tx;
}

module.exports = { initializeEscrow, releasePayment };
