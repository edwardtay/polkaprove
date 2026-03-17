"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const DEMO_ATTESTATIONS = [
  {
    name: "Alice Chen",
    project: "DotVerify",
    track: "PVM Smart Contracts",
    uid: "0xaddb81591c5f3cd34c9fdd6fafde82a02a8e35edc34ef755d1406f51f4d5a07e",
  },
  {
    name: "Bob Kim",
    project: "DotSwap",
    track: "EVM Smart Contract",
    uid: null, // Issued to address 0x...002
  },
  {
    name: "Carol Nguyen",
    project: "PolkaLend",
    track: "EVM Smart Contract",
    uid: null, // Issued to address 0x...003
  },
];

const STEPS = [
  {
    step: 1,
    title: "OpenGuild registers as a trusted issuer",
    desc: "The hackathon organizer connects their wallet and registers on DotVerify's Issuer Registry. Their EVM address is bound to a Polkadot Substrate AccountId via the toAccountId precompile.",
    action: "Issuers tab → Register",
    done: true,
  },
  {
    step: 2,
    title: "Create the HackathonCompletion schema",
    desc: "A permanent (non-revocable) schema is registered with fields: participant, hackathon, project, track, completionDate. The schema UID is generated with BLAKE2-256.",
    action: "Schemas tab → HackathonCompletion template",
    done: true,
  },
  {
    step: 3,
    title: "Issue completion certificates to participants",
    desc: "The organizer issues individual attestations to each participant. Each credential gets a unique UID (BLAKE2-256 hash) and the data integrity hash is stored on-chain.",
    action: "Issue tab → Select schema → Fill participant data → Issue",
    done: true,
  },
  {
    step: 4,
    title: "Participants share their verification link",
    desc: "Each participant gets a shareable URL like /verify/0xUID... They can send this to employers, other DAOs, or post on social media. No wallet needed to verify.",
    action: "Copy link or download credential card with QR code",
    done: true,
  },
  {
    step: 5,
    title: "Anyone verifies instantly",
    desc: "An employer clicks the link and sees: VALID credential, issuer address, participant data, issue date — all read directly from the Polkadot Hub blockchain. No account needed.",
    action: "Click verify link below →",
    done: true,
  },
  {
    step: 6,
    title: "Cross-chain verification via XCM",
    desc: "The credential status can be sent to Moonbeam, Astar, or any Polkadot parachain using native XCM messaging. No bridges, no oracles.",
    action: "Verify tab → XCM section → Select parachain → Send",
    done: true,
  },
];

export default function DemoPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#E6007A]">Live Demo</span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 mb-2">
            Hackathon Completion Certificates
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            This walkthrough shows how OpenGuild could use DotVerify to issue
            verifiable completion certificates to Polkadot Solidity Hackathon 2026 participants.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            All data below is live on Polkadot Hub Testnet. Click any link to verify on-chain.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-12">
          {STEPS.map((s) => (
            <div key={s.step} className="border border-border rounded-xl p-5">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#E6007A] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {s.step}
                </span>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{s.desc}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-muted/50 px-2 py-0.5 rounded">{s.action}</span>
                    {s.done && <span className="text-[10px] text-green-600 font-medium">Done on testnet</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Live credentials */}
        <div className="mb-12">
          <h2 className="text-lg font-bold mb-1">Live Credentials</h2>
          <p className="text-xs text-muted-foreground mb-4">
            These attestations exist on Polkadot Hub Testnet right now. Click to verify.
          </p>
          <div className="space-y-3">
            {DEMO_ATTESTATIONS.map((att) => (
              <div key={att.name} className="border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{att.name}</span>
                    <span className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded">VALID</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {att.project} &middot; {att.track}
                  </p>
                </div>
                {att.uid ? (
                  <Link
                    href={`/verify/${att.uid}`}
                    className="px-3 py-1.5 bg-[#E6007A] text-white rounded-lg text-xs font-medium hover:bg-[#c40066] transition-colors"
                  >
                    Verify →
                  </Link>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Different recipient</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* What makes this special */}
        <div className="border border-[#E6007A]/20 bg-[#E6007A]/5 rounded-xl p-5 mb-12">
          <h2 className="font-bold text-sm mb-3">What Makes This Different</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
            <div>
              <span className="font-semibold block mb-0.5">BLAKE2-256 UIDs</span>
              <span className="text-muted-foreground">Every credential UID uses Polkadot-native hashing, compatible with Substrate state proofs</span>
            </div>
            <div>
              <span className="font-semibold block mb-0.5">Permanent & non-revocable</span>
              <span className="text-muted-foreground">The HackathonCompletion schema is permanent — once issued, it can never be taken back</span>
            </div>
            <div>
              <span className="font-semibold block mb-0.5">No wallet to verify</span>
              <span className="text-muted-foreground">Anyone with the link can verify. No account, no extension, no login</span>
            </div>
            <div>
              <span className="font-semibold block mb-0.5">Cross-chain portable</span>
              <span className="text-muted-foreground">Credential status can be sent to any parachain via XCM</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-3">
          <Link
            href="/app"
            className="inline-block px-6 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors"
          >
            Try it yourself →
          </Link>
          <p className="text-[10px] text-muted-foreground">
            Contract: 0xC3B8399C...EF7d on Polkadot Hub Testnet (420420417)
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
