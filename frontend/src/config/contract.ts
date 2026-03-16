export const DOTVERIFY_ADDRESS = process.env.NEXT_PUBLIC_DOTVERIFY_ADDRESS as `0x${string}` | undefined;

export const DOTVERIFY_ABI = [
  // Schema Registry
  {
    name: "registerSchema",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "definition", type: "string" },
      { name: "revocable", type: "bool" },
    ],
    outputs: [{ name: "uid", type: "bytes32" }],
  },
  {
    name: "getSchema",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "uid", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "uid", type: "bytes32" },
          { name: "creator", type: "address" },
          { name: "name", type: "string" },
          { name: "definition", type: "string" },
          { name: "revocable", type: "bool" },
          { name: "createdAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getSchemaCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getAllSchemaUids",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  // Attestations
  {
    name: "attest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "schemaUid", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "data", type: "bytes" },
      { name: "expiresAt", type: "uint256" },
      { name: "refUid", type: "bytes32" },
    ],
    outputs: [{ name: "uid", type: "bytes32" }],
  },
  {
    name: "attestSecure",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "schemaUid", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "data", type: "bytes" },
      { name: "expiresAt", type: "uint256" },
      { name: "refUid", type: "bytes32" },
    ],
    outputs: [{ name: "uid", type: "bytes32" }],
  },
  {
    name: "revoke",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "attestationUid", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "verify",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "attestationUid", type: "bytes32" }],
    outputs: [
      { name: "valid", type: "bool" },
      {
        name: "a",
        type: "tuple",
        components: [
          { name: "uid", type: "bytes32" },
          { name: "schemaUid", type: "bytes32" },
          { name: "issuer", type: "address" },
          { name: "recipient", type: "address" },
          { name: "data", type: "bytes" },
          { name: "issuedAt", type: "uint256" },
          { name: "expiresAt", type: "uint256" },
          { name: "revoked", type: "bool" },
          { name: "refUid", type: "bytes32" },
        ],
      },
    ],
  },
  {
    name: "verifyData",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "attestationUid", type: "bytes32" },
      { name: "originalData", type: "bytes" },
    ],
    outputs: [{ name: "valid", type: "bool" }],
  },
  {
    name: "getReceivedAttestations",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    name: "getIssuedAttestations",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "issuer", type: "address" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    name: "getSchemaAttestations",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "schemaUid", type: "bytes32" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    name: "attestationCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // XCM
  {
    name: "sendAttestationXcm",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "attestationUid", type: "bytes32" },
      { name: "destination", type: "bytes" },
      { name: "message", type: "bytes" },
    ],
    outputs: [],
  },
  // System
  {
    name: "getRemainingWeight",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "refTime", type: "uint64" },
      { name: "proofSize", type: "uint64" },
    ],
  },
  {
    name: "isDirectCaller",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getMinimumBalance",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "blake2Hash",
    type: "function",
    stateMutability: "pure",
    inputs: [{ name: "data", type: "bytes" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  // Events
  {
    name: "SchemaRegistered",
    type: "event",
    inputs: [
      { name: "uid", type: "bytes32", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
    ],
  },
  {
    name: "AttestationCreated",
    type: "event",
    inputs: [
      { name: "uid", type: "bytes32", indexed: true },
      { name: "schemaUid", type: "bytes32", indexed: true },
      { name: "issuer", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: false },
    ],
  },
  {
    name: "AttestationRevoked",
    type: "event",
    inputs: [
      { name: "uid", type: "bytes32", indexed: true },
      { name: "revoker", type: "address", indexed: true },
    ],
  },
] as const;
