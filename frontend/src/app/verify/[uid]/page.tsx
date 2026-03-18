"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function VerifyPage() {
  const params = useParams();
  const uid = params.uid as string;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 sm:py-12">
        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">Proof Verification</h1>
          <code className="text-[10px] font-mono text-muted-foreground break-all">{uid}</code>
        </div>

        <div className="border border-border rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            View this proof on the Polkadot Hub block explorer:
          </p>
          <a
            href={`https://blockscout-testnet.polkadot.io/tx/${uid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-2.5 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors"
          >
            View on Blockscout →
          </a>
          <p className="text-[10px] text-muted-foreground mt-4">
            The BLAKE2-256 hash of the proof data is permanently stored on Polkadot Hub Testnet.
          </p>
        </div>

        <div className="text-center mt-6">
          <Link href="/app" className="text-xs text-[#E6007A] hover:underline">
            Open App
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
