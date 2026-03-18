"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toHex } from "viem";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";
import { ZkTlsProve } from "./zktls-prove";

export function ProveTab() {
  const { address } = useAccount();
  const [customData, setCustomData] = useState("");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function handleAnchorCustom() {
    if (!DOTVERIFY_ADDRESS || !customData) return;
    const payload = JSON.stringify({
      type: "custom",
      data: customData,
      prover: address,
      timestamp: Math.floor(Date.now() / 1000),
    });
    writeContract({
      address: DOTVERIFY_ADDRESS,
      abi: DOTVERIFY_ABI,
      functionName: "anchorOffchain",
      args: [toHex(new TextEncoder().encode(payload)) as `0x${string}`],
    });
  }

  // Save on success
  if (isSuccess && txHash && txHash !== lastTxHash && address) {
    setLastTxHash(txHash);
    try {
      const key = `polkaprove-proofs-${address}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push({
        type: "custom",
        txHash,
        timestamp: Date.now(),
        summary: "Custom data anchor",
      });
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {}
  }

  return (
    <div className="space-y-6">
      {!address && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-center">
          <p className="text-sm text-amber-700">Connect your wallet to create proofs.</p>
        </div>
      )}

      {/* zkTLS — primary */}
      <ZkTlsProve />

      {/* Custom data anchor */}
      <div className="border border-border rounded-xl p-5">
        <h2 className="text-sm font-bold mb-1">Anchor Any Data</h2>
        <p className="text-[10px] text-muted-foreground mb-3">
          Paste any data — bank statements, certificates, documents. Only the BLAKE2 fingerprint is stored on-chain. Your data stays private.
        </p>
        <textarea
          value={customData}
          onChange={(e) => setCustomData(e.target.value)}
          placeholder='{"bank":"Revolut","balance":"$12,500","date":"2026-03-18"}'
          rows={4}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A] mb-3"
        />
        <button
          onClick={handleAnchorCustom}
          disabled={!address || !customData || isPending || isConfirming}
          className="w-full px-4 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
        >
          {isPending ? "Signing..." : isConfirming ? "Anchoring..." : "Anchor On-Chain"}
        </button>

        {isSuccess && txHash && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-3">
            <p className="text-xs font-medium text-green-700">Anchored</p>
            <p className="font-mono text-[10px] text-green-600">Tx: {txHash}</p>
          </div>
        )}
      </div>
    </div>
  );
}
