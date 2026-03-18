"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { toHex } from "viem";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

export function VerifyTab() {
  const [mode, setMode] = useState<"offchain" | "credential">("offchain");

  // Off-chain anchor verification
  const [anchorId, setAnchorId] = useState("");
  const [verifyData, setVerifyData] = useState("");
  const [triggerOffchain, setTriggerOffchain] = useState(false);

  // Credential verification
  const [credentialId, setCredentialId] = useState("");
  const [triggerCredential, setTriggerCredential] = useState(false);

  // Off-chain verify query
  const { data: offchainResult, isLoading: offchainLoading } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "verifyOffchain",
    args:
      triggerOffchain && anchorId && verifyData
        ? [
            anchorId as `0x${string}`,
            toHex(new TextEncoder().encode(verifyData)) as `0x${string}`,
          ]
        : undefined,
    query: { enabled: triggerOffchain && !!anchorId && !!verifyData },
  });

  const offchain = offchainResult as [boolean, boolean] | undefined;

  // Credential verify query
  const { data: credentialResult, isLoading: credentialLoading } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "verify",
    args:
      triggerCredential && credentialId
        ? [credentialId as `0x${string}`]
        : undefined,
    query: { enabled: triggerCredential && !!credentialId },
  });

  const credential = credentialResult as
    | [
        boolean,
        {
          uid: string;
          issuer: string;
          recipient: string;
          issuedAt: bigint;
          revoked: boolean;
        }
      ]
    | undefined;

  function handleCheckOffchain() {
    setTriggerOffchain(false);
    setTimeout(() => setTriggerOffchain(true), 50);
  }

  function handleCheckCredential() {
    setTriggerCredential(false);
    setTimeout(() => setTriggerCredential(true), 50);
  }

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("offchain")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            mode === "offchain"
              ? "border-[#E6007A] bg-[#E6007A]/5 text-[#E6007A]"
              : "border-border hover:border-muted-foreground/30"
          }`}
        >
          Verify Proof (Anchor)
        </button>
        <button
          onClick={() => setMode("credential")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            mode === "credential"
              ? "border-[#E6007A] bg-[#E6007A]/5 text-[#E6007A]"
              : "border-border hover:border-muted-foreground/30"
          }`}
        >
          Verify Credential (ID)
        </button>
      </div>

      {/* Off-chain anchor verification */}
      {mode === "offchain" && (
        <div className="border border-border rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-1">Verify Anchored Proof</h2>
          <p className="text-[10px] text-muted-foreground mb-4">
            Check if data matches a previously anchored fingerprint on Polkadot Hub.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Anchor ID
              </label>
              <input
                type="text"
                value={anchorId}
                onChange={(e) => {
                  setAnchorId(e.target.value);
                  setTriggerOffchain(false);
                }}
                placeholder="0x..."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Original Data
              </label>
              <textarea
                value={verifyData}
                onChange={(e) => {
                  setVerifyData(e.target.value);
                  setTriggerOffchain(false);
                }}
                placeholder="Paste the original data to check against the on-chain anchor"
                rows={4}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
              />
            </div>

            <button
              onClick={handleCheckOffchain}
              disabled={!anchorId || !verifyData || offchainLoading}
              className="w-full px-4 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
            >
              {offchainLoading ? "Checking..." : "Check"}
            </button>

            {offchain && (
              <div
                className={`rounded-lg p-4 ${
                  offchain[0] && offchain[1]
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-lg ${
                      offchain[0] && offchain[1] ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {offchain[0] && offchain[1] ? "\u2713" : "\u2717"}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      offchain[0] && offchain[1] ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {!offchain[0]
                      ? "Anchor not found or revoked"
                      : !offchain[1]
                      ? "Data does NOT match anchor"
                      : "Data matches anchor"}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {offchain[0] && offchain[1]
                    ? "The data has not been modified since it was anchored on Polkadot Hub."
                    : "The data has been modified or the anchor ID is invalid."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Credential ID verification */}
      {mode === "credential" && (
        <div className="border border-border rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-1">Verify Credential by ID</h2>
          <p className="text-[10px] text-muted-foreground mb-4">
            Check the validity of a schema-based attestation credential.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Credential ID
              </label>
              <input
                type="text"
                value={credentialId}
                onChange={(e) => {
                  setCredentialId(e.target.value);
                  setTriggerCredential(false);
                }}
                placeholder="0x..."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
              />
            </div>

            <button
              onClick={handleCheckCredential}
              disabled={!credentialId || credentialLoading}
              className="w-full px-4 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
            >
              {credentialLoading ? "Checking..." : "Check"}
            </button>

            {credential && (
              <div
                className={`rounded-lg p-4 ${
                  credential[0]
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-lg ${credential[0] ? "text-green-600" : "text-red-600"}`}
                  >
                    {credential[0] ? "\u2713" : "\u2717"}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      credential[0] ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {credential[0] ? "Valid Credential" : "Invalid or Revoked"}
                  </span>
                </div>

                {credential[1] && Number(credential[1].issuedAt) > 0 && (
                  <div className="space-y-1 text-[11px]">
                    <p>
                      <span className="text-muted-foreground">Issuer:</span>{" "}
                      <span className="font-mono">{credential[1].issuer}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Recipient:</span>{" "}
                      <span className="font-mono">{credential[1].recipient}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Issued:</span>{" "}
                      {new Date(Number(credential[1].issuedAt) * 1000).toLocaleDateString()}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Revoked:</span>{" "}
                      {credential[1].revoked ? "Yes" : "No"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="border border-border rounded-lg p-3 bg-muted/10">
        <p className="text-[10px] text-muted-foreground">
          <span className="font-medium">No wallet needed.</span> Verification reads directly from the PolkaProve contract on Polkadot Hub Testnet.
        </p>
      </div>
    </div>
  );
}
