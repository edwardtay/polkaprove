"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const FEATURES = [
  { icon: "◈", title: "Schema Registry", desc: "Define attestation schemas — field types, revocability, metadata" },
  { icon: "✦", title: "Issue Credentials", desc: "Create on-chain attestations under any schema with BLAKE2 hashing" },
  { icon: "✓", title: "Verify Instantly", desc: "Check any credential by UID — valid, expired, or revoked" },
  { icon: "⬡", title: "PVM-Native Security", desc: "sr25519 issuer auth, BLAKE2 integrity, callerIsOrigin protection" },
  { icon: "⇄", title: "XCM Cross-Chain", desc: "Query and relay attestation status to any Polkadot parachain" },
  { icon: "●", title: "AI Assistant", desc: "Analyze documents, suggest schemas, verify credentials via chat" },
];

const PVM_FEATURES = [
  { feature: "BLAKE2-256 attestation hashing", precompile: "ISystem 0x900", evm: "No" },
  { feature: "sr25519 issuer authentication", precompile: "ISystem 0x900", evm: "No" },
  { feature: "XCM cross-chain attestation queries", precompile: "IXcm 0xA0000", evm: "No" },
  { feature: "ecdsaToEthAddress identity resolution", precompile: "ISystem 0x900", evm: "No" },
  { feature: "callerIsOrigin anti-proxy protection", precompile: "ISystem 0x900", evm: "No" },
  { feature: "2D weight metering (refTime + proofSize)", precompile: "ISystem 0x900", evm: "No" },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Verifiable Credentials.{" "}
            <span className="text-[#E6007A]">On-Chain.</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto mb-6">
            The Ethereum Attestation Service (EAS) for Polkadot — powered by PVM precompiles
            that make attestations more secure than on any standard EVM chain.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/app"
              className="px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors"
            >
              Launch App
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              View Contract
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-16">
          {FEATURES.map((f) => (
            <div key={f.title} className="border border-border rounded-lg p-4">
              <span className="text-lg mb-2 block">{f.icon}</span>
              <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-[11px] text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Why PVM */}
        <div className="mb-16">
          <h2 className="text-lg font-bold mb-4">Why PVM? (Not Possible on Standard EVM)</h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 font-semibold">Feature</th>
                  <th className="text-left px-3 py-2 font-semibold">Precompile</th>
                  <th className="text-center px-3 py-2 font-semibold">Standard EVM?</th>
                </tr>
              </thead>
              <tbody>
                {PVM_FEATURES.map((f) => (
                  <tr key={f.feature} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{f.feature}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{f.precompile}</td>
                    <td className="px-3 py-2 text-center text-red-500 font-bold">{f.evm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-lg font-bold mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { step: "1", title: "Register Schema", desc: "Define credential fields and rules" },
              { step: "2", title: "Issue Attestation", desc: "Create on-chain credential with BLAKE2 hash" },
              { step: "3", title: "Share UID", desc: "Recipients share their attestation UID" },
              { step: "4", title: "Verify Anywhere", desc: "Anyone can verify — on-chain or cross-chain via XCM" },
            ].map((s) => (
              <div key={s.step} className="border border-border rounded-lg p-4 text-center">
                <span className="inline-block w-6 h-6 rounded-full bg-[#E6007A] text-white text-xs font-bold leading-6 mb-2">
                  {s.step}
                </span>
                <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                <p className="text-[11px] text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
