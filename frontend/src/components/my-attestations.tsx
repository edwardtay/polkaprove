"use client";

import { useState } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

export function MyAttestations({ address }: { address?: `0x${string}` }) {
  const [view, setView] = useState<"received" | "issued">("received");

  const { data: received } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getReceivedAttestations",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: issued } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getIssuedAttestations",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const uids = (view === "received" ? received : issued) as `0x${string}`[] | undefined;

  if (!address) {
    return (
      <div className="border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground text-sm">Connect your wallet to view attestations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex gap-1 border border-border rounded-lg p-0.5 w-fit">
        <button
          onClick={() => setView("received")}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            view === "received" ? "bg-[#E6007A] text-white" : "hover:bg-muted/50"
          }`}
        >
          Received ({(received as `0x${string}`[] | undefined)?.length || 0})
        </button>
        <button
          onClick={() => setView("issued")}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            view === "issued" ? "bg-[#E6007A] text-white" : "hover:bg-muted/50"
          }`}
        >
          Issued ({(issued as `0x${string}`[] | undefined)?.length || 0})
        </button>
      </div>

      {/* Attestation List */}
      {uids && uids.length > 0 ? (
        <div className="space-y-2">
          {uids.map((uid) => (
            <AttestationCard key={uid} uid={uid} canRevoke={view === "issued"} />
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-lg p-6 text-center">
          <p className="text-xs text-muted-foreground">
            No {view} attestations yet.
          </p>
        </div>
      )}
    </div>
  );
}

function AttestationCard({ uid, canRevoke }: { uid: `0x${string}`; canRevoke: boolean }) {
  const { data: result } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "verify",
    args: [uid],
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const verification = result as [boolean, { uid: string; schemaUid: string; issuer: string; recipient: string; data: string; issuedAt: bigint; expiresAt: bigint; revoked: boolean }] | undefined;

  if (!verification) return null;

  const [valid, att] = verification;

  function tryDecode(hex: string): string {
    try {
      const bytes = hex.startsWith("0x") ? hex.slice(2) : hex;
      const decoded = new TextDecoder().decode(
        new Uint8Array(bytes.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)))
      );
      if (decoded.match(/^[\x20-\x7E\s]+$/)) return decoded;
      return hex.slice(0, 30) + "...";
    } catch {
      return hex.slice(0, 30) + "...";
    }
  }

  return (
    <div className={`border rounded-lg p-3 ${valid ? "border-green-200" : "border-red-200"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${valid ? "bg-green-500" : "bg-red-500"}`} />
          <span className="font-mono text-[10px]">{uid.slice(0, 18)}...</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            att.revoked ? "bg-red-100 text-red-700" : valid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}>
            {att.revoked ? "Revoked" : valid ? "Valid" : "Expired"}
          </span>
          {canRevoke && !att.revoked && DOTVERIFY_ADDRESS && (
            <button
              onClick={() => writeContract({
                address: DOTVERIFY_ADDRESS!,
                abi: DOTVERIFY_ABI,
                functionName: "revoke",
                args: [uid],
              })}
              disabled={isPending || isConfirming}
              className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              {isPending || isConfirming ? "..." : "Revoke"}
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <span className="text-muted-foreground">Issuer</span>
          <p className="font-mono">{att.issuer.slice(0, 8)}...{att.issuer.slice(-4)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Recipient</span>
          <p className="font-mono">{att.recipient.slice(0, 8)}...{att.recipient.slice(-4)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Issued</span>
          <p>{new Date(Number(att.issuedAt) * 1000).toLocaleDateString()}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Expires</span>
          <p>{Number(att.expiresAt) === 0 ? "Never" : new Date(Number(att.expiresAt) * 1000).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="mt-1 text-[10px]">
        <span className="text-muted-foreground">Data: </span>
        <span className="font-mono">{tryDecode(att.data)}</span>
      </div>
    </div>
  );
}
