import snarkjs from "snarkjs";

export async function generateEligibilityProof(input) {
  const wasm = "/zkp/LifeInsuranceEligibility_js/LifeInsuranceEligibility.wasm";
  const zkey = "/zkp/LifeInsuranceEligibility_final.zkey";
  return snarkjs.groth16.fullProve(input, wasm, zkey);
}
