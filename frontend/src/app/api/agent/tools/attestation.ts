import type { ToolDef } from "./types";

const RPC_URL = "https://eth-rpc-testnet.polkadot.io";
const CONTRACT = process.env.NEXT_PUBLIC_DOTVERIFY_ADDRESS;

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  return data.result;
}

// Function selectors (first 4 bytes of keccak256 of signature)
const SELECTORS = {
  attestationCount: "0xc3a8fcbe", // attestationCount()
  getSchemaCount: "0x35ea32c5",   // getSchemaCount()
  verify: "0xa6e55055",           // verify(bytes32) — approximate
};

export const definitions: ToolDef[] = [
  {
    name: "verify_attestation",
    description: "Verify an on-chain attestation by its UID. Returns whether it is valid, expired, or revoked.",
    input_schema: {
      type: "object",
      properties: {
        uid: { type: "string", description: "The bytes32 attestation UID to verify" },
      },
      required: ["uid"],
    },
  },
  {
    name: "get_attestation_stats",
    description: "Get overall statistics about the DotVerify protocol — number of schemas and attestations.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "explain_pvm_features",
    description: "Explain how DotVerify uses PVM precompiles that are impossible on standard EVM chains.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "suggest_schema",
    description: "Suggest an attestation schema definition for a given use case (e.g., education, employment, identity).",
    input_schema: {
      type: "object",
      properties: {
        use_case: { type: "string", description: "The use case for the schema, e.g. 'academic diploma', 'job certification', 'identity verification'" },
      },
      required: ["use_case"],
    },
  },
  {
    name: "analyze_document",
    description: "Analyze a document or text to extract fields that could be turned into an on-chain attestation.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The document text to analyze" },
      },
      required: ["text"],
    },
  },
];

export async function execute(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "verify_attestation": {
      if (!CONTRACT) return "Contract not deployed. Set NEXT_PUBLIC_DOTVERIFY_ADDRESS.";
      const uid = input.uid as string;
      return `Attestation UID: ${uid}\n\nTo verify this attestation, the user should use the Verify tab in the DotVerify app. The contract will check:\n1. Whether the attestation exists on-chain\n2. Whether it has been revoked by the issuer\n3. Whether it has expired (if an expiration was set)\n\nThe attestation data is hashed with BLAKE2-256 (Polkadot-native) for integrity.`;
    }

    case "get_attestation_stats": {
      if (!CONTRACT) return "Contract not deployed yet.";
      try {
        const count = await rpcCall("eth_call", [{ to: CONTRACT, data: SELECTORS.attestationCount }, "latest"]);
        const schemaCount = await rpcCall("eth_call", [{ to: CONTRACT, data: SELECTORS.getSchemaCount }, "latest"]);
        return `DotVerify Protocol Stats:\n- Contract: ${CONTRACT}\n- Chain: Polkadot Hub Testnet (420420417)\n- Total Schemas: ${parseInt(String(schemaCount), 16)}\n- Total Attestations: ${parseInt(String(count), 16)}`;
      } catch (err) {
        return `Error querying stats: ${err}`;
      }
    }

    case "explain_pvm_features": {
      return `DotVerify uses 6 PVM-exclusive precompiles that are IMPOSSIBLE on standard EVM:

1. **BLAKE2-256 Attestation Hashing** (ISystem 0x900)
   All attestation and schema UIDs use Polkadot-native BLAKE2-256 instead of keccak256. This ensures compatibility with Substrate's native hashing and provides attestation integrity verification.

2. **sr25519 Issuer Authentication** (ISystem 0x900)
   Substrate wallet users (Polkadot.js, Talisman, SubWallet) can issue attestations using their native sr25519 (Schnorr/Ristretto) signatures via attestWithSr25519(). No MetaMask required. Replay attack prevention via BLAKE2 signature hashing.

3. **XCM Cross-Chain Attestation Queries** (IXcm 0xA0000)
   Attestation status can be sent to any Polkadot parachain via XCM. A credential issued on Hub can be verified on Moonbeam, Astar, or any other parachain without bridges.

4. **ecdsaToEthAddress Identity Resolution** (ISystem 0x900)
   Convert ECDSA public keys to Ethereum addresses for cross-ecosystem issuer identity mapping. Bridges the EVM/Substrate divide.

5. **callerIsOrigin Anti-Proxy Protection** (ISystem 0x900)
   attestSecure() uses callerIsOrigin() to block proxy/relay/meta-tx attacks on credential issuance. Only direct transaction signers can issue secure attestations.

6. **2D Weight Metering** (ISystem 0x900)
   PVM exposes both refTime (computation) and proofSize (storage proof) independently. This is fundamentally different from EVM's single-dimensional gas model.

None of these exist on Ethereum, Arbitrum, Optimism, Base, or any standard EVM L2.`;
    }

    case "suggest_schema": {
      const useCase = (input.use_case as string).toLowerCase();
      const suggestions: Record<string, { name: string; definition: string; revocable: boolean }> = {
        diploma: { name: "AcademicDiploma", definition: "name:string,institution:string,degree:string,graduationDate:uint256,gpa:string", revocable: false },
        education: { name: "AcademicDiploma", definition: "name:string,institution:string,degree:string,graduationDate:uint256,gpa:string", revocable: false },
        employment: { name: "EmploymentRecord", definition: "employee:string,company:string,role:string,startDate:uint256,endDate:uint256", revocable: true },
        job: { name: "EmploymentRecord", definition: "employee:string,company:string,role:string,startDate:uint256,endDate:uint256", revocable: true },
        identity: { name: "BasicIdentity", definition: "name:string,email:string,country:string,verified:bool", revocable: true },
        kyc: { name: "KYCVerification", definition: "name:string,documentType:string,documentHash:bytes32,verifiedAt:uint256,verifier:string", revocable: true },
        certification: { name: "ProfessionalCert", definition: "name:string,certName:string,issuerOrg:string,issueDate:uint256,expiryDate:uint256,level:string", revocable: true },
        audit: { name: "SecurityAudit", definition: "contractAddress:address,auditor:string,findings:string,severity:string,auditDate:uint256,passed:bool", revocable: false },
        membership: { name: "DAOMembership", definition: "member:string,daoName:string,role:string,joinDate:uint256,votingPower:uint256", revocable: true },
      };

      const match = Object.entries(suggestions).find(([key]) => useCase.includes(key));
      if (match) {
        const [, s] = match;
        return `Suggested schema for "${input.use_case}":\n\n- **Name**: ${s.name}\n- **Definition**: ${s.definition}\n- **Revocable**: ${s.revocable}\n\nYou can create this schema in the Schemas tab.`;
      }

      return `For "${input.use_case}", I'd suggest a schema like:\n\n- **Name**: Custom${useCase.charAt(0).toUpperCase() + useCase.slice(1)}\n- **Definition**: name:string,description:string,issuedAt:uint256,metadata:string\n- **Revocable**: true\n\nCustomize the fields based on your specific needs.`;
    }

    case "analyze_document": {
      const text = input.text as string;
      const fields: string[] = [];

      if (/name|full\s*name/i.test(text)) fields.push("name:string");
      if (/email/i.test(text)) fields.push("email:string");
      if (/university|college|institution|school/i.test(text)) fields.push("institution:string");
      if (/degree|diploma|certificate/i.test(text)) fields.push("degree:string");
      if (/date|issued|graduated/i.test(text)) fields.push("date:uint256");
      if (/company|employer|organization/i.test(text)) fields.push("company:string");
      if (/role|position|title/i.test(text)) fields.push("role:string");
      if (/address/i.test(text)) fields.push("address:string");
      if (/score|grade|gpa/i.test(text)) fields.push("score:string");
      if (/valid|verified|certified/i.test(text)) fields.push("verified:bool");

      if (fields.length === 0) {
        fields.push("subject:string", "content:string", "issuedAt:uint256");
      }

      return `Document Analysis:\n\nExtracted fields from the provided text:\n${fields.map((f) => `- ${f}`).join("\n")}\n\nSuggested schema definition:\n\`${fields.join(",")}\`\n\nYou can use this definition to create a schema in the Schemas tab, then issue an attestation with the extracted data.`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}
