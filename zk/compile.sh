# File: zk/compile.sh
#!/bin/bash
set -e

cd zk

# 1. Compile circuit
circom circuits/threshold.circom --r1cs --wasm --sym -o build/

# 2. Powers of Tau (use existing ptau for hackathon)
snarkjs powersoftau new bn128 12 build/pot12_0000.ptau -v
snarkjs powersoftau contribute build/pot12_0000.ptau build/pot12_0001.ptau \
  --name="Hackathon" -v -e="random entropy"
snarkjs powersoftau prepare phase2 build/pot12_0001.ptau build/pot12_final.ptau -v

# 3. Setup zkey
snarkjs groth16 setup build/threshold.r1cs build/pot12_final.ptau \
  keys/threshold_0000.zkey
snarkjs zkey contribute keys/threshold_0000.zkey keys/threshold_final.zkey \
  --name="Contributor" -v -e="more random"

# 4. Export verification key
snarkjs zkey export verificationkey keys/threshold_final.zkey \
  keys/verification_key.json

echo "✅ Circuit compiled and keys generated"