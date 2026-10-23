import { buildEddsa, buildPoseidon } from "circomlibjs";

export const TREE_DEPTH = 4;
export const TREE_CAPACITY = 2 ** TREE_DEPTH;
export const CREDENTIAL_DOMAIN = 0x494e53555245434841494e01n;

export async function createCredentialCrypto() {
  const eddsa = await buildEddsa();
  const poseidon = await buildPoseidon();
  const toFieldString = (value) => poseidon.F.toObject(value).toString();
  const hash = (values) => toFieldString(poseidon(values.map(BigInt)));
  return { eddsa, poseidon, toFieldString, hash };
}

export function credentialMessageFields(claims) {
  return [
    CREDENTIAL_DOMAIN,
    BigInt(claims.income),
    BigInt(claims.creditScore),
    BigInt(claims.medicalRisk),
    BigInt(claims.holderAddress),
    BigInt(claims.credentialExpiry),
    BigInt(claims.credentialId),
  ];
}

export function buildCredentialTree(activeIds, hash) {
  if (activeIds.length > TREE_CAPACITY) {
    throw new Error(`The demo registry supports at most ${TREE_CAPACITY} active credentials.`);
  }
  let nodes = Array(TREE_CAPACITY).fill(0n);
  activeIds.forEach((id, index) => { nodes[index] = BigInt(id); });
  const paths = new Map(activeIds.map((id, index) => [String(id), { index, siblings: [] }]));
  let levelIndexes = new Map(activeIds.map((id, index) => [String(id), index]));

  for (let level = 0; level < TREE_DEPTH; level += 1) {
    for (const [id, path] of paths) {
      const nodeIndex = levelIndexes.get(id);
      path.siblings.push(nodes[nodeIndex ^ 1].toString());
      levelIndexes.set(id, Math.floor(nodeIndex / 2));
    }
    const next = [];
    for (let i = 0; i < nodes.length; i += 2) {
      next.push(BigInt(hash([nodes[i], nodes[i + 1]])));
    }
    nodes = next;
  }
  return { root: nodes[0].toString(), paths };
}
