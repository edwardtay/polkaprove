"use client";

import { VerifyCredential } from "./verify-credential";
import { XcmVerify } from "./xcm-verify";
import { OffchainAttest } from "./offchain-attest";

export function VerifyPage() {
  return (
    <div className="space-y-8">
      <VerifyCredential />
      <div className="border-t border-border pt-8">
        <XcmVerify />
      </div>
      <div className="border-t border-border pt-8">
        <OffchainAttest />
      </div>
    </div>
  );
}
