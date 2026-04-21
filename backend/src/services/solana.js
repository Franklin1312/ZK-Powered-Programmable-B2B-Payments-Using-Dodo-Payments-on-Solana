const anchor = require("@coral-xyz/anchor");
const crypto = require("crypto");
const { Connection, Keypair, PublicKey, Transaction } = require("@solana/web3.js");
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

function commitmentToBytes(commitment) {
  const commitBuf = Buffer.alloc(32);
  const commitHex = BigInt(commitment).toString(16).padStart(64, "0");
  Buffer.from(commitHex, "hex").copy(commitBuf);
  return [...commitBuf];
}

function paymentRefToBytes(paymentRef) {
  if (!paymentRef || typeof paymentRef !== "string") {
    throw new Error("paymentRef is required to derive escrow PDA");
  }
  const digest = crypto.createHash("sha256").update(paymentRef).digest();
  return [...digest];
}

function deriveEscrowPDA(program, payerPubkey, paymentRefBytes) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), payerPubkey.toBuffer(), Buffer.from(paymentRefBytes)],
    program.programId
  );
}

async function readEscrowState(program, escrowPDA) {
  try {
    return await program.account.escrowState.fetch(escrowPDA);
  } catch (_) {
    return null;
  }
}

async function initializeEscrow({ recipientPubkey, amount, threshold, commitment, paymentRef }) {
  const payer = loadKeypair("PAYER_PRIVATE_KEY");
  const program = getProgram(payer);

  const paymentRefBytes = paymentRefToBytes(paymentRef);
  const [escrowPDA] = deriveEscrowPDA(program, payer.publicKey, paymentRefBytes);
  const commitmentBytes = commitmentToBytes(commitment);

  try {
    const tx = await program.methods
      .initializeEscrow(
        new anchor.BN(amount),
        new anchor.BN(threshold),
        commitmentBytes,
        paymentRefBytes,
        new PublicKey(recipientPubkey)
      )
      .accounts({
        escrowState: escrowPDA,
        payer: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    return {
      escrowPDA: escrowPDA.toBase58(),
      tx,
      reusedEscrow: false,
      isReleased: false,
    };
  } catch (err) {
    // If the escrow PDA already exists on-chain, reuse it
    const alreadyExists =
      err?.transactionLogs?.some?.((l) => l.includes("already in use")) ||
      err?.message?.includes("already in use");

    if (alreadyExists) {
      console.log("[Solana] Escrow PDA already exists — reusing:", escrowPDA.toBase58());
      let isReleased = null;
      try {
        const state = await program.account.escrowState.fetch(escrowPDA);
        isReleased = state.isReleased;
      } catch (_) {
        // Keep null when state fetch fails; callers can still handle reuse safely.
      }

      return {
        escrowPDA: escrowPDA.toBase58(),
        tx: null,
        reusedEscrow: true,
        isReleased,
      };
    }
    throw err;
  }
}

async function buildInitializeEscrowTx({ payerPubkey, recipientPubkey, amount, threshold, commitment, paymentRef }) {
  const backendSigner = loadKeypair("PAYER_PRIVATE_KEY");
  const program = getProgram(backendSigner);
  const payer = new PublicKey(payerPubkey);
  const recipient = new PublicKey(recipientPubkey);

  const paymentRefBytes = paymentRefToBytes(paymentRef);
  const [escrowPDA] = deriveEscrowPDA(program, payer, paymentRefBytes);
  const existing = await readEscrowState(program, escrowPDA);
  if (existing) {
    return {
      escrowPDA: escrowPDA.toBase58(),
      tx: null,
      serializedTx: null,
      requiresClientSignature: false,
      reusedEscrow: true,
      isReleased: existing.isReleased,
    };
  }

  const commitmentBytes = commitmentToBytes(commitment);
  const tx = await program.methods
    .initializeEscrow(
      new anchor.BN(amount),
      new anchor.BN(threshold),
      commitmentBytes,
      paymentRefBytes,
      recipient
    )
    .accounts({
      escrowState: escrowPDA,
      payer,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .transaction();

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;

  return {
    escrowPDA: escrowPDA.toBase58(),
    tx: null,
    serializedTx: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
    requiresClientSignature: true,
    reusedEscrow: false,
    isReleased: false,
  };
}

async function releasePayment({ payerPubkey, escrowPDA, recipientPubkey, proof, publicSignals }) {
  const payer = loadKeypair("PAYER_PRIVATE_KEY");
  const program = getProgram(payer);
  if (!escrowPDA) {
    throw new Error("escrowPDA is required for release in multi-escrow mode");
  }

  let explicitEscrowPDA;
  try {
    explicitEscrowPDA = new PublicKey(escrowPDA);
  } catch (_) {
    throw new Error(`Invalid escrow PDA: ${escrowPDA}`);
  }

  let escrowState;
  try {
    escrowState = await program.account.escrowState.fetch(explicitEscrowPDA);
    console.log("[Solana] Found escrow PDA:", explicitEscrowPDA.toBase58(), "(explicit request)");
  } catch (_) {
    throw new Error(`Escrow PDA not found on-chain: ${escrowPDA}`);
  }

  // If already released on-chain, return idempotent success — no need to re-submit
  if (escrowState.isReleased) {
    console.log("[Solana] Escrow already released on-chain — returning idempotent success");
    return { sig: null, alreadyReleased: true, requiresClientSignature: false, serializedTx: null };
  }

  const storedRecipient = escrowState.recipient.toBase58();
  const requestedRecipient = recipientPubkey || storedRecipient;

  if (requestedRecipient !== storedRecipient) {
    throw new Error(
      `Escrow recipient mismatch. On-chain recipient is ${storedRecipient}, requested recipient is ${requestedRecipient}.`
    );
  }

  console.log("[Solana] Stored recipient:", storedRecipient);
  console.log("[Solana] Requested recipient:", requestedRecipient);
  console.log("[Solana] Client wallet must sign release for:", storedRecipient);

  // Build the instruction and set fee payer = payer (has SOL)
  const ix = await program.methods
    .verifyAndRelease()
    .accounts({
      escrowState: explicitEscrowPDA,
      recipient: new PublicKey(storedRecipient),
    })
    .instruction();

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: payer.publicKey, recentBlockhash: blockhash });
  tx.add(ix);

  // Backend signs only as fee payer; the recipient wallet must add the final signature in the UI.
  tx.partialSign(payer);

  return {
    sig: null,
    alreadyReleased: false,
    requiresClientSignature: true,
    expectedRecipient: storedRecipient,
    serializedTx: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
  };
}

module.exports = { initializeEscrow, buildInitializeEscrowTx, releasePayment };
