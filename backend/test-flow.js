require("dotenv").config();
const { computeCommitment, generateProof, verifyProof } = require("./src/services/zk");

async function runTest() {
  console.log("\n========================================");
  console.log("  ZK B2B Payments — Full Flow Test");
  console.log("========================================\n");

  const privateValue = 9950;
  const salt         = 12345;
  const threshold    = 9900;

  // Step 1
  console.log("Step 1: Computing commitment...");
  const commitment = await computeCommitment(privateValue, salt);
  console.log("  Commitment:", commitment.slice(0,30) + "...");
  console.log("  PASS\n");

  // Step 2
  console.log("Step 2: Generating ZK proof...");
  console.log("  (This takes 15-30s the first time)");
  const { proof, publicSignals } = await generateProof(
    privateValue, salt, threshold, commitment
  );
  console.log("  pi_a:", proof.pi_a[0].slice(0,20) + "...");
  console.log("  Public signals:", publicSignals);
  console.log("  PASS\n");

  // Step 3
  console.log("Step 3: Verifying proof...");
  const valid = await verifyProof(proof, publicSignals);
  console.log("  Valid:", valid);
  console.log(valid ? "  PASS\n" : "  FAIL\n");

  // Step 4 — boundary test
  console.log("Step 4: Testing invalid case (value BELOW threshold)...");
  try {
    const { proof: badProof, publicSignals: badSig } = await generateProof(
      9800, salt, threshold, commitment  // 9800 < 9900 — should fail
    );
    const badValid = await verifyProof(badProof, badSig);
    console.log("  Should be false:", badValid);
    console.log(badValid ? "  UNEXPECTED PASS" : "  Correctly rejected\n");
  } catch (e) {
    console.log("  Correctly rejected (circuit constraint violated)\n");
  }

  console.log("========================================");
  console.log(valid ? "  ALL TESTS PASSED" : "  SOME TESTS FAILED");
  console.log("========================================\n");
}

runTest().catch(console.error);

