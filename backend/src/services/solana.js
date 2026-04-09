const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const { getAssociatedTokenAddress } = require("@solana/spl-token");

const connection = new Connection(process.env.SOLANA_RPC, "confirmed");

function getProvider(walletKeypair) {
  const wallet = new anchor.Wallet(walletKeypair);
  return new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
}

function getProgram(provider) {
  const idl = require("../../program/target/idl/escrow.json");
  return new anchor.Program(idl, new PublicKey(process.env.PROGRAM_ID), provider);
}

async function initializeAndDeposit({ payerKeypair, recipientPubkey, amount, threshold, commitment }) {
  const provider = getProvider(payerKeypair);
  const program = getProgram(provider);

  const [escrowPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), payerKeypair.publicKey.toBuffer()],
    program.programId
  );

  const usdcMint = new PublicKey(process.env.USDC_MINT);
  const payerATA = await getAssociatedTokenAddress(usdcMint, payerKeypair.publicKey);
  const vaultATA = await getAssociatedTokenAddress(usdcMint, escrowPDA, true);

  // Commitment as byte array
  const commitmentBytes = Buffer.from(commitment.padStart(64, "0"), "hex");

  const tx = await program.methods
    .initializeEscrow(
      new anchor.BN(amount),
      new anchor.BN(threshold),
      [...commitmentBytes],
      new PublicKey(recipientPubkey)
    )
    .accounts({
      escrowState: escrowPDA,
      payer: payerKeypair.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([payerKeypair])
    .rpc();

  console.log(`[Solana] Escrow initialized: ${tx}`);
  return { escrowPDA: escrowPDA.toBase58(), tx };
}

async function releasePayment({ recipientKeypair, payerPubkey, proof, publicSignals }) {
  const provider = getProvider(recipientKeypair);
  const program = getProgram(provider);

  const [escrowPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), new PublicKey(payerPubkey).toBuffer()],
    program.programId
  );

  const usdcMint = new PublicKey(process.env.USDC_MINT);
  const vaultATA = await getAssociatedTokenAddress(usdcMint, escrowPDA, true);
  const recipientATA = await getAssociatedTokenAddress(usdcMint, recipientKeypair.publicKey);

  // Simplified proof encoding for hackathon
  const proofA = proof.pi_a.slice(0, 2).map(BigInt);
  const proofB = proof.pi_b.slice(0, 2).map(row => row.map(BigInt));
  const proofC = proof.pi_c.slice(0, 2).map(BigInt);

  const tx = await program.methods
    .verifyAndRelease(proofA, proofB, proofC, publicSignals.map(BigInt))
    .accounts({
      escrowState: escrowPDA,
      vault: vaultATA,
      recipientTokenAccount: recipientATA,
      recipient: recipientKeypair.publicKey,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    })
    .signers([recipientKeypair])
    .rpc();

  console.log(`[Solana] Payment released: ${tx}`);
  return tx;
}

module.exports = { initializeAndDeposit, releasePayment };