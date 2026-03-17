"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { toHex } from "viem";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

export function OffchainAttest() {
  // Anchor state
  const [credentialData, setCredentialData] = useState("");
  const [jsonPreview, setJsonPreview] = useState<object | null>(null);
  const [jsonError, setJsonError] = useState("");

  // Verify state
  const [verifyAnchorId, setVerifyAnchorId] = useState("");
  const [verifyData, setVerifyData] = useState("");
  const [verifyRequested, setVerifyRequested] = useState(false);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Read verification result
  const verifyDataBytes = verifyData
    ? toHex(new TextEncoder().encode(verifyData))
    : undefined;

  const { data: verifyResult, isLoading: isVerifying } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "verifyOffchain",
    args:
      verifyAnchorId && verifyDataBytes
        ? [verifyAnchorId as `0x${string}`, verifyDataBytes]
        : undefined,
    query: { enabled: verifyRequested && !!verifyAnchorId && !!verifyDataBytes },
  });

  const verification = verifyResult as [boolean, boolean] | undefined;

  function handleDataChange(value: string) {
    setCredentialData(value);
    setJsonError("");
    setJsonPreview(null);
    if (!value.trim()) return;
    try {
      const parsed = JSON.parse(value);
      setJsonPreview(parsed);
    } catch {
      setJsonError("Invalid JSON — please check your data format.");
    }
  }

  function handleAnchor() {
    if (!credentialData.trim() || !DOTVERIFY_ADDRESS) return;
    const data = toHex(new TextEncoder().encode(credentialData));
    writeContract({
      address: DOTVERIFY_ADDRESS,
      abi: DOTVERIFY_ABI,
      functionName: "anchorOffchain",
      args: [data],
    });
  }

  function handleVerify() {
    setVerifyRequested(true);
  }

  return (
    <div className="space-y-6">
      {/* Anchor Section */}
      <div className="border border-border rounded-lg p-4">
        <h2 className="font-semibold text-sm mb-1">Save a credential&apos;s fingerprint on-chain</h2>
        <p className="text-[10px] text-muted-foreground mb-3">
          Only the fingerprint is stored — ~95% cheaper than full on-chain storage.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Credential data (JSON)
            </label>
            <textarea
              value={credentialData}
              onChange={(e) => handleDataChange(e.target.value)}
              placeholder='{"name": "Alice", "degree": "Computer Science", "university": "MIT", "year": 2024}'
              rows={4}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A] resize-none"
            />
            {jsonError && (
              <p className="text-[10px] text-red-500 mt-1">{jsonError}</p>
            )}
          </div>

          {/* Preview */}
          {jsonPreview && (
            <div className="border border-border rounded-lg p-3 bg-muted/10">
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Preview
              </label>
              <div className="space-y-1">
                {Object.entries(jsonPreview).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-xs">
                    <span className="text-muted-foreground min-w-[100px]">{key}:</span>
                    <span className="font-mono">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleAnchor}
            disabled={isPending || isConfirming || !credentialData.trim() || !!jsonError || !DOTVERIFY_ADDRESS}
            className="px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
          >
            {isPending ? "Signing..." : isConfirming ? "Confirming..." : "Anchor On-Chain"}
          </button>

          {isSuccess && txHash && (
            <div className="text-xs text-green-600 border border-green-200 bg-green-50 rounded-lg p-4">
              <p className="font-semibold text-sm mb-2">Fingerprint Saved</p>
              <p className="font-mono text-[10px] break-all">Tx: {txHash}</p>
              <p className="text-[10px] mt-2 text-green-700">
                Your credential&apos;s BLAKE2 hash has been anchored on-chain. Save the transaction hash above — you can use it to verify the data later.
              </p>
              <p className="text-[10px] mt-1 text-muted-foreground">
                Keep your original data safe. The chain only stores the fingerprint, not the data itself.
              </p>
            </div>
          )}

          {!DOTVERIFY_ADDRESS && (
            <p className="text-xs text-amber-600">Contract not configured.</p>
          )}
        </div>
      </div>

      {/* Verify Section */}
      <div className="border border-border rounded-lg p-4">
        <h2 className="font-semibold text-sm mb-1">Check if data matches</h2>
        <p className="text-[10px] text-muted-foreground mb-3">
          Paste the anchor ID and the original data to verify they match.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Anchor ID
            </label>
            <input
              type="text"
              value={verifyAnchorId}
              onChange={(e) => {
                setVerifyAnchorId(e.target.value);
                setVerifyRequested(false);
              }}
              placeholder="0x... (the anchor ID from the transaction)"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Original data (JSON)
            </label>
            <textarea
              value={verifyData}
              onChange={(e) => {
                setVerifyData(e.target.value);
                setVerifyRequested(false);
              }}
              placeholder="Paste the original credential data here"
              rows={3}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A] resize-none"
            />
          </div>

          <button
            onClick={handleVerify}
            disabled={!verifyAnchorId || !verifyData || !DOTVERIFY_ADDRESS}
            className="px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
          >
            {isVerifying ? "Checking..." : "Verify Match"}
          </button>

          {verifyRequested && verification && (
            <div
              className={`text-xs border rounded-lg p-4 ${
                verification[0] && verification[1]
                  ? "text-green-600 border-green-200 bg-green-50"
                  : "text-red-600 border-red-200 bg-red-50"
              }`}
            >
              <p className="font-semibold text-sm mb-1">
                {verification[0] && verification[1] ? "Match Confirmed" : "Mismatch"}
              </p>
              <div className="space-y-0.5">
                <p>Anchor valid: {verification[0] ? "Yes" : "No"}</p>
                <p>Data matches: {verification[1] ? "Yes" : "No"}</p>
              </div>
              {verification[0] && verification[1] && (
                <p className="text-[10px] mt-2 text-green-700">
                  The data you provided matches the on-chain fingerprint exactly.
                </p>
              )}
              {(!verification[0] || !verification[1]) && (
                <p className="text-[10px] mt-2 text-red-700">
                  {!verification[0]
                    ? "This anchor ID was not found or has been revoked."
                    : "The data does not match the stored fingerprint. It may have been modified."}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="border border-border rounded-lg p-3 bg-muted/10">
        <p className="text-[10px] text-muted-foreground">
          Off-chain anchoring stores only a BLAKE2-256 hash of your data on Polkadot Hub.
          This is ideal for large credentials, privacy-sensitive data, or high-volume issuance where gas costs matter.
        </p>
      </div>
    </div>
  );
}
