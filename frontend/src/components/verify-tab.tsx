"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { toHex } from "viem";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

export function VerifyTab() {
  const [anchorId, setAnchorId] = useState("");
  const [originalData, setOriginalData] = useState("");
  const [checking, setChecking] = useState(false);

  const { data: verifyResult } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "verifyOffchain",
    args: anchorId && originalData && checking
      ? [anchorId as `0x${string}`, toHex(new TextEncoder().encode(originalData)) as `0x${string}`]
      : undefined,
    query: { enabled: checking && !!anchorId && !!originalData },
  });

  const result = verifyResult as [boolean, boolean] | undefined;

  return (
    <div className="space-y-6">
      <div className="border border-border rounded-xl p-5">
        <h2 className="text-sm font-bold mb-1">Verify a Proof</h2>
        <p className="text-[10px] text-muted-foreground mb-4">
          Check if data matches a previously anchored fingerprint. If the data was modified, the check will fail.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Anchor ID</label>
            <input
              type="text"
              value={anchorId}
              onChange={(e) => { setAnchorId(e.target.value); setChecking(false); }}
              placeholder="0x..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Original data</label>
            <textarea
              value={originalData}
              onChange={(e) => { setOriginalData(e.target.value); setChecking(false); }}
              placeholder="Paste the original data that was anchored"
              rows={4}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>

          <button
            onClick={() => setChecking(true)}
            disabled={!anchorId || !originalData}
            className="w-full px-4 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
          >
            Check
          </button>
        </div>

        {checking && result && (
          <div className={`mt-4 rounded-xl p-4 ${
            result[0] && result[1]
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={result[0] && result[1] ? "text-green-600 text-lg" : "text-red-600 text-lg"}>
                {result[0] && result[1] ? "✓" : "✗"}
              </span>
              <span className={`text-sm font-bold ${result[0] && result[1] ? "text-green-700" : "text-red-700"}`}>
                {!result[0] ? "Anchor not found or revoked" : !result[1] ? "Data does NOT match" : "Data matches — verified"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {result[0] && result[1]
                ? "The data is identical to what was originally anchored."
                : !result[0]
                  ? "No anchor exists with this ID, or it has been revoked."
                  : "The data has been modified since anchoring. BLAKE2 hashes do not match."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
