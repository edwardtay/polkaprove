"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { toHex } from "viem";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

export function ZkTlsAttest() {
  const { address } = useAccount();
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceData, setSourceData] = useState("");
  const [anchorId, setAnchorId] = useState("");
  const [verifyAnchorId, setVerifyAnchorId] = useState("");
  const [verifyData, setVerifyData] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Verify off-chain anchor
  const { data: verifyResult } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "verifyOffchain",
    args: verifyAnchorId && verifyData
      ? [verifyAnchorId as `0x${string}`, toHex(new TextEncoder().encode(verifyData)) as `0x${string}`]
      : undefined,
    query: { enabled: !!verifyAnchorId && !!verifyData },
  });

  const verification = verifyResult as [boolean, boolean] | undefined;

  function handleAnchor() {
    if (!sourceData || !DOTVERIFY_ADDRESS) return;

    // Include source URL in the anchored data for provenance
    const payload = JSON.stringify({
      source: sourceUrl || "manual",
      data: sourceData,
      timestamp: Math.floor(Date.now() / 1000),
      anchored_by: address,
    });

    const dataHex = toHex(new TextEncoder().encode(payload));
    writeContract({
      address: DOTVERIFY_ADDRESS,
      abi: DOTVERIFY_ABI,
      functionName: "anchorOffchain",
      args: [dataHex as `0x${string}`],
    });
  }

  return (
    <div className="space-y-6">
      {/* Anchor section */}
      <div className="border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">🔒</span>
          <h2 className="font-semibold text-sm">Anchor Web Data On-Chain</h2>
        </div>
        <p className="text-[10px] text-muted-foreground mb-4">
          Save a tamper-proof fingerprint of any data on Polkadot Hub.
          Only the BLAKE2-256 hash is stored — ~95% cheaper than full on-chain storage.
          The original data stays with you.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Source URL <span className="text-[9px]">(optional — for your records)</span>
            </label>
            <input
              type="text"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://api.example.com/user/me"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Data to anchor</label>
            <textarea
              value={sourceData}
              onChange={(e) => setSourceData(e.target.value)}
              placeholder='{"name": "Alice", "degree": "Computer Science", "graduated": true}'
              rows={4}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>

          <button
            onClick={handleAnchor}
            disabled={!sourceData || !address || isPending || isConfirming}
            className="w-full px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
          >
            {isPending ? "Signing..." : isConfirming ? "Anchoring..." : "Anchor Fingerprint On-Chain"}
          </button>

          {isSuccess && txHash && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-medium text-green-700">Data anchored on Polkadot Hub</p>
              <p className="font-mono text-[10px] text-green-600 mt-1">Tx: {txHash}</p>
              <p className="text-[10px] text-green-600 mt-1">
                The BLAKE2-256 fingerprint is now permanently on-chain.
                Save the anchor ID from the transaction to verify later.
              </p>
            </div>
          )}

          {!address && <p className="text-xs text-amber-600">Connect wallet to anchor data.</p>}
        </div>
      </div>

      {/* Verify section */}
      <div className="border border-border rounded-xl p-5">
        <h2 className="font-semibold text-sm mb-1">Verify Anchored Data</h2>
        <p className="text-[10px] text-muted-foreground mb-4">
          Check if data matches a previously anchored fingerprint. If someone modified the data, the check will fail.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Anchor ID</label>
            <input
              type="text"
              value={verifyAnchorId}
              onChange={(e) => setVerifyAnchorId(e.target.value)}
              placeholder="0x..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Original data</label>
            <textarea
              value={verifyData}
              onChange={(e) => setVerifyData(e.target.value)}
              placeholder="Paste the original data to check against the anchor"
              rows={3}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>

          {verification && (
            <div className={`rounded-lg p-3 ${
              verification[0] && verification[1]
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={verification[0] && verification[1] ? "text-green-600" : "text-red-600"}>
                  {verification[0] && verification[1] ? "✓" : "✗"}
                </span>
                <span className={`text-xs font-bold ${verification[0] && verification[1] ? "text-green-700" : "text-red-700"}`}>
                  {!verification[0] ? "Anchor not found or revoked" : !verification[1] ? "Data does NOT match anchor" : "Data matches anchor"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {verification[0] && verification[1]
                  ? "The data has not been modified since it was anchored."
                  : "The data has been modified or the anchor ID is invalid."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="border border-border rounded-lg p-3 bg-muted/10">
        <p className="text-[10px] text-muted-foreground">
          <span className="font-medium">How it works:</span> Your data is hashed with BLAKE2-256 (Polkadot-native) and stored on-chain.
          Later, anyone can verify the original data against the stored hash.
          Only the 32-byte fingerprint is stored — full data stays off-chain.
        </p>
      </div>
    </div>
  );
}
