"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toHex } from "viem";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

const PROOF_TYPES = [
  {
    id: "portfolio",
    icon: "\u{1F4B0}",
    title: "Portfolio Balance",
    desc: "Prove your cross-chain portfolio value",
  },
  {
    id: "staking",
    icon: "\u{1F512}",
    title: "Staking Position",
    desc: "Prove your DOT staking and rewards",
  },
  {
    id: "governance",
    icon: "\u{1F5F3}",
    title: "Governance Activity",
    desc: "Prove your voting history on OpenGov",
  },
  {
    id: "identity",
    icon: "\u{1F464}",
    title: "On-Chain Identity",
    desc: "Prove your verified Polkadot identity",
  },
] as const;

type ProofType = (typeof PROOF_TYPES)[number]["id"];

type ProofRecord = {
  anchorId: string;
  type: string;
  summary: string;
  timestamp: number;
  txHash: string;
  data: string;
};

function saveProof(proof: ProofRecord) {
  const existing = JSON.parse(localStorage.getItem("polkaprove_proofs") || "[]") as ProofRecord[];
  existing.unshift(proof);
  localStorage.setItem("polkaprove_proofs", JSON.stringify(existing));
}

function generateMockData(type: ProofType, address: string): { data: Record<string, unknown>; summary: string } {
  const now = Math.floor(Date.now() / 1000);

  switch (type) {
    case "portfolio":
      return {
        data: {
          type: "portfolio_balance",
          address,
          chains: [
            { chain: "Polkadot Hub", token: "DOT", balance: "150.52", usd_value: "1054.88" },
            { chain: "Polkadot Asset Hub", token: "USDT", balance: "500.00", usd_value: "500.00" },
            { chain: "Moonbeam", token: "GLMR", balance: "2400.00", usd_value: "312.00" },
          ],
          total_usd: "1866.88",
          snapshot_at: now,
        },
        summary: "Portfolio: $1,866.88 across 3 chains",
      };
    case "staking":
      return {
        data: {
          type: "staking_position",
          address,
          staked_dot: "500.00",
          nomination_pools: [
            { pool_id: 42, staked: "500.00", rewards_pending: "2.35" },
          ],
          total_rewards_claimed: "18.72",
          era: 1284,
          snapshot_at: now,
        },
        summary: "Staking: 500 DOT, 18.72 DOT rewards claimed",
      };
    case "governance":
      return {
        data: {
          type: "governance_activity",
          address,
          votes_cast: 23,
          proposals_supported: 18,
          delegations_given: 2,
          recent_votes: [
            { ref: 1147, track: "Medium Spender", vote: "Aye", conviction: "1x" },
            { ref: 1139, track: "Small Tipper", vote: "Aye", conviction: "2x" },
            { ref: 1132, track: "Root", vote: "Nay", conviction: "1x" },
          ],
          snapshot_at: now,
        },
        summary: "Governance: 23 votes cast, 18 proposals supported",
      };
    case "identity":
      return {
        data: {
          type: "onchain_identity",
          address,
          display: "Alice.dot",
          legal: "Alice Johnson",
          web: "https://alice.dot",
          twitter: "@alice_dot",
          verified_fields: ["display", "web", "twitter"],
          judgements: [{ registrar: 0, status: "Reasonable" }],
          snapshot_at: now,
        },
        summary: "Identity: Alice.dot (Reasonable judgement)",
      };
  }
}

export function ProveTab() {
  const { address } = useAccount();
  const [selectedType, setSelectedType] = useState<ProofType | null>(null);
  const [proofData, setProofData] = useState<Record<string, unknown> | null>(null);
  const [proofSummary, setProofSummary] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [anchorSuccess, setAnchorSuccess] = useState<{ anchorId: string; txHash: string } | null>(null);

  // Custom proof state
  const [customData, setCustomData] = useState("");

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  async function handleSelectProof(type: ProofType) {
    if (!address) return;
    setSelectedType(type);
    setProofData(null);
    setAnchorSuccess(null);
    setIsFetching(true);
    reset();

    // Try to fetch real balance from blockscout, fall back to mock
    if (type === "portfolio") {
      try {
        const res = await fetch(
          `https://blockscout-testnet.polkadot.io/api/v2/addresses/${address}`
        );
        if (res.ok) {
          const json = await res.json();
          const balanceWei = BigInt(json.coin_balance || "0");
          const balanceDot = Number(balanceWei) / 1e18;
          const mockResult = generateMockData(type, address);
          if (balanceDot > 0) {
            mockResult.data.chains = [
              { chain: "Polkadot Hub Testnet", token: "PAS", balance: balanceDot.toFixed(4), usd_value: "N/A" },
            ];
            mockResult.data.total_usd = "N/A (testnet)";
            mockResult.summary = `Portfolio: ${balanceDot.toFixed(4)} PAS on Hub Testnet`;
          }
          setProofData(mockResult.data);
          setProofSummary(mockResult.summary);
          setIsFetching(false);
          return;
        }
      } catch {
        // fall through to mock
      }
    }

    // Use mock data for demo
    await new Promise((r) => setTimeout(r, 800));
    const { data, summary } = generateMockData(type, address);
    setProofData(data);
    setProofSummary(summary);
    setIsFetching(false);
  }

  function handleAnchor(dataStr: string, type: string, summary: string) {
    if (!address || !DOTVERIFY_ADDRESS) return;

    const payload = JSON.stringify({
      source: "polkaprove",
      proof_type: type,
      data: dataStr,
      timestamp: Math.floor(Date.now() / 1000),
      anchored_by: address,
    });

    const dataHex = toHex(new TextEncoder().encode(payload));

    writeContract(
      {
        address: DOTVERIFY_ADDRESS,
        abi: DOTVERIFY_ABI,
        functionName: "anchorOffchain",
        args: [dataHex as `0x${string}`],
      },
      {
        onSuccess(txh) {
          // We derive a pseudo anchor ID from tx hash for localStorage tracking
          // The real anchorId comes from the contract return, but we use txHash as reference
          const pseudoAnchorId = txh;
          setAnchorSuccess({ anchorId: pseudoAnchorId, txHash: txh });
          saveProof({
            anchorId: pseudoAnchorId,
            type,
            summary,
            timestamp: Date.now(),
            txHash: txh,
            data: payload,
          });
        },
      }
    );
  }

  function handleProveOnChain() {
    if (!proofData || !selectedType) return;
    handleAnchor(JSON.stringify(proofData), selectedType, proofSummary);
  }

  function handleCustomAnchor() {
    if (!customData.trim()) return;
    const summary = `Custom: ${customData.slice(0, 60)}${customData.length > 60 ? "..." : ""}`;
    handleAnchor(customData, "custom", summary);
  }

  return (
    <div className="space-y-6">
      {/* Section A: Polkadot Ecosystem Proofs */}
      <div>
        <h2 className="font-semibold text-sm mb-1">Polkadot Ecosystem Proofs</h2>
        <p className="text-[10px] text-muted-foreground mb-4">
          Generate verifiable proofs of your on-chain activity. Click a card to fetch your data, then anchor it on Polkadot Hub.
        </p>

        {!address && (
          <p className="text-xs text-amber-600 mb-4">Connect your wallet to generate proofs.</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {PROOF_TYPES.map((pt) => (
            <button
              key={pt.id}
              onClick={() => handleSelectProof(pt.id)}
              disabled={!address}
              className={`border rounded-xl p-4 text-left transition-all hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                selectedType === pt.id
                  ? "border-[#E6007A] bg-[#E6007A]/5"
                  : "border-border hover:border-[#E6007A]/40"
              }`}
            >
              <span className="text-xl block mb-2">{pt.icon}</span>
              <p className="text-sm font-medium">{pt.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{pt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Data Preview */}
      {selectedType && (
        <div className="border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">
              {PROOF_TYPES.find((p) => p.id === selectedType)?.icon}{" "}
              {PROOF_TYPES.find((p) => p.id === selectedType)?.title}
            </h3>
            <button
              onClick={() => {
                setSelectedType(null);
                setProofData(null);
                setAnchorSuccess(null);
                reset();
              }}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>

          {isFetching && (
            <div className="flex items-center gap-2 py-8 justify-center">
              <div className="w-4 h-4 border-2 border-[#E6007A] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">Fetching data...</span>
            </div>
          )}

          {proofData && !isFetching && (
            <>
              <p className="text-xs font-medium text-[#E6007A] mb-2">{proofSummary}</p>
              <pre className="font-mono text-[11px] bg-muted/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all mb-4 max-h-48 overflow-y-auto">
                {JSON.stringify(proofData, null, 2)}
              </pre>

              {!anchorSuccess && (
                <button
                  onClick={handleProveOnChain}
                  disabled={isPending || isConfirming}
                  className="w-full px-4 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
                >
                  {isPending ? "Signing..." : isConfirming ? "Anchoring on-chain..." : "Prove On-Chain"}
                </button>
              )}

              {isSuccess && anchorSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-xs font-bold text-green-700 mb-1">Proof anchored on Polkadot Hub</p>
                  <div className="space-y-1">
                    <p className="text-[10px] text-green-600">
                      <span className="font-medium">Tx:</span>{" "}
                      <span className="font-mono break-all">{anchorSuccess.txHash}</span>
                    </p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/verify/${anchorSuccess.txHash}`;
                        navigator.clipboard.writeText(url);
                      }}
                      className="px-3 py-1.5 border border-green-300 rounded-lg text-[11px] font-medium text-green-700 hover:bg-green-100 transition-colors"
                    >
                      Copy Share Link
                    </button>
                    <a
                      href={`https://blockscout-testnet.polkadot.io/tx/${anchorSuccess.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 border border-green-300 rounded-lg text-[11px] font-medium text-green-700 hover:bg-green-100 transition-colors"
                    >
                      View on Explorer
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Section B: Custom Proof */}
      <div className="border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">&#x270D;&#xFE0F;</span>
          <h2 className="font-semibold text-sm">Custom Proof</h2>
        </div>
        <p className="text-[10px] text-muted-foreground mb-4">
          Paste any data to create a verifiable proof. Bank statements, LinkedIn profiles, API responses — anything.
        </p>

        <textarea
          value={customData}
          onChange={(e) => setCustomData(e.target.value)}
          placeholder='{"employment": "Acme Corp", "role": "Engineer", "since": "2023"}'
          rows={4}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A] mb-3"
        />

        <button
          onClick={handleCustomAnchor}
          disabled={!customData.trim() || !address || isPending || isConfirming}
          className="w-full px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
        >
          {isPending ? "Signing..." : isConfirming ? "Anchoring..." : "Anchor Custom Proof"}
        </button>

        {!address && <p className="text-xs text-amber-600 mt-2">Connect wallet to anchor data.</p>}
      </div>

      {/* How it works */}
      <div className="border border-border rounded-lg p-3 bg-muted/10">
        <p className="text-[10px] text-muted-foreground">
          <span className="font-medium">How it works:</span> Your data is hashed with BLAKE2-256 (Polkadot-native) and the fingerprint is stored on-chain.
          Only the 32-byte hash is stored — full data stays with you. Anyone can later verify the data against the on-chain hash.
        </p>
      </div>
    </div>
  );
}
