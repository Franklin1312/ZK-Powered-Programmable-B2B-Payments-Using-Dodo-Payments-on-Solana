const snarkjs = require("snarkjs");
const { buildPoseidon } = require("circomlibjs");
const path = require("path");
const fs = require("fs");

const WASM = path.join(__dirname, "../../../zk/build/threshold_js/threshold.wasm");
const ZKEY = path.join(__dirname, "../../../zk/keys/threshold_final.zkey");
const VK = path.join(__dirname, "../../../zk/keys/verification_key.json");

async function computeCommitment(privateValue, salt) {
  const poseidon = await buildPoseidon();
  const hash = poseidon([BigInt(privateValue), BigInt(salt)]);
  return poseidon.F.toString(hash);
}

async function generateProof(privateValue, salt, threshold, commitment) {
  const input = {
    privateValue: String(privateValue),
    salt: String(salt),
    threshold: String(threshold),
    commitment: String(commitment),
  };
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY);
  return { proof, publicSignals };
}

async function verifyProof(proof, publicSignals) {
  const vk = JSON.parse(fs.readFileSync(VK, "utf-8"));
  return await snarkjs.groth16.verify(vk, publicSignals, proof);
}

module.exports = { computeCommitment, generateProof, verifyProof };
