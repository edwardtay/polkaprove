"use client";

import { useState } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { encodePacked, toHex } from "viem";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

export function IssueAttestation({ address }: { address?: `0x${string}` }) {
  const [schemaUid, setSchemaUid] = useState("");
  const [recipient, setRecipient] = useState("");
  const [dataFields, setDataFields] = useState<Record<string, string>>({});
  const [expiresAt, setExpiresAt] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: schemaUids } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getAllSchemaUids",
  });

  const { data: selectedSchema } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getSchema",
    args: schemaUid ? [schemaUid as `0x${string}`] : undefined,
    query: { enabled: !!schemaUid },
  });

  const schema = selectedSchema as { name: string; definition: string; revocable: boolean } | undefined;

  const fields = schema?.definition
    ? schema.definition.split(",").map((f) => {
        const [name, type] = f.split(":");
        return { name: name.trim(), type: type?.trim() || "string" };
      })
    : [];

  function handleIssue() {
    if (!schemaUid || !recipient || !DOTVERIFY_ADDRESS) return;

    // Encode data as simple bytes
    const dataStr = JSON.stringify(dataFields);
    const data = toHex(new TextEncoder().encode(dataStr));

    const expiry = expiresAt
      ? BigInt(Math.floor(new Date(expiresAt).getTime() / 1000))
      : BigInt(0);

    writeContract({
      address: DOTVERIFY_ADDRESS,
      abi: DOTVERIFY_ABI,
      functionName: "attest",
      args: [
        schemaUid as `0x${string}`,
        recipient as `0x${string}`,
        data,
        expiry,
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
      ],
    });
  }

  return (
    <div className="space-y-6">
      <div className="border border-border rounded-lg p-4">
        <h2 className="font-semibold text-sm mb-3">Issue Attestation</h2>

        {!address && (
          <p className="text-xs text-amber-600 mb-3">Connect your wallet to issue attestations.</p>
        )}

        <div className="space-y-3">
          {/* Schema selector */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Schema</label>
            <select
              value={schemaUid}
              onChange={(e) => {
                setSchemaUid(e.target.value);
                setDataFields({});
              }}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            >
              <option value="">Select a schema...</option>
              {schemaUids &&
                (schemaUids as `0x${string}`[]).map((uid) => (
                  <option key={uid} value={uid}>
                    {uid.slice(0, 18)}...
                  </option>
                ))}
            </select>
            {schema && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {schema.name} &mdash; {schema.revocable ? "Revocable" : "Permanent"}
              </p>
            )}
          </div>

          {/* Recipient */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Recipient Address</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>

          {/* Dynamic fields based on schema */}
          {fields.length > 0 && (
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Attestation Data</label>
              <div className="space-y-2">
                {fields.map((f) => (
                  <div key={f.name}>
                    <label className="text-[10px] text-muted-foreground">{f.name} ({f.type})</label>
                    <input
                      type={f.type === "uint256" ? "number" : "text"}
                      value={dataFields[f.name] || ""}
                      onChange={(e) => setDataFields({ ...dataFields, [f.name]: e.target.value })}
                      placeholder={f.name}
                      className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expiration */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Expiration (optional)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>

          <button
            onClick={handleIssue}
            disabled={isPending || isConfirming || !address || !schemaUid || !recipient || !DOTVERIFY_ADDRESS}
            className="px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
          >
            {isPending ? "Signing..." : isConfirming ? "Confirming..." : "Issue Attestation"}
          </button>

          {isSuccess && txHash && (
            <div className="text-xs text-green-600">
              <p>Attestation issued!</p>
              <p className="font-mono text-[10px] mt-1">Tx: {txHash.slice(0, 18)}...</p>
            </div>
          )}

          {!DOTVERIFY_ADDRESS && (
            <p className="text-xs text-amber-600">Contract not configured.</p>
          )}
        </div>
      </div>
    </div>
  );
}
