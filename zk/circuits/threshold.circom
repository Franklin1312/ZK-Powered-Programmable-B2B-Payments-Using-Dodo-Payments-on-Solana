pragma circom 2.0.0;

include "../../backend/node_modules/circomlib/circuits/bitify.circom";
include "../../backend/node_modules/circomlib/circuits/poseidon.circom";

// Proves: private_value > public_threshold
// WITHOUT revealing private_value
template ThresholdCheck() {
    // Private inputs (known only to recipient)
    signal input privateValue;   // e.g., actual SLA uptime = 9950 (= 99.50%)
    signal input salt;           // random salt for commitment

    // Public inputs (known to everyone, stored on-chain)
    signal input threshold;      // e.g., 9900 (= 99.00%)
    signal input commitment;     // hash(privateValue, salt) — stored in escrow

    // Output
    signal output valid;

    // === CONSTRAINT 1: privateValue > threshold ===
    // Circom doesn't have > directly, use subtraction + range check
    signal diff;
    diff <== privateValue - threshold;
    // diff must be positive (i.e., privateValue > threshold)
    // Range check: diff is in [1, 2^32]
    component rangeCheck = Num2Bits(32);
    rangeCheck.in <== diff - 1;  // will fail if diff <= 0

    // === CONSTRAINT 2: commitment matches privateValue + salt ===
    // Use Poseidon hash (ZK-friendly)
    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== privateValue;
    poseidon.inputs[1] <== salt;
    poseidon.out === commitment;

    // === OUTPUT ===
    valid <== 1;
}

component main {public [threshold, commitment]} = ThresholdCheck();
