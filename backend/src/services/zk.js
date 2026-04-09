const snarkjs = require("snarkjs");
const { buildPoseidon } = require("circomlibjs");
const path = require("path");

const WASM_PATH = path.join(__dirname, "../../zk/build/threshold_js/threshold.wasm");
const ZKEY_PATH = path.join(__dirname, "../../zk/keys/threshold_final.zkey");
const VK_PATH   = path.join(__dirname, "../../zk/keys/verification_key.json");

// Compute poseidon(privateValue, salt)
async function computeCommitment(privateValue, salt) {
  const poseidon = await buildPoseidon();
  const hash = poseidon([BigInt(privateValue), BigInt(salt)]);
  return poseidon.F.toString(hash);
}

// Generate ZK proof
async function generateProof(privateValue, salt, threshold, commitment) {
  const input = {
    privateValue: String(privateValue),
    salt: String(salt),
    threshold: String(threshold),
    commitment: String(commitment),
  };

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input, WASM_PATH, ZKEY_PATH
  );
  return { proof, publicSignals };
}

// Verify proof
async function verifyProof(proof, publicSignals) {
  const vk = require(VK_PATH);
  return await snarkjs.groth16.verify(vk, publicSignals, proof);
}

module.exports = { computeCommitment, generateProof, verifyProof };