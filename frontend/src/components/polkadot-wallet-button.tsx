"use client";

import { useState } from "react";
import { usePolkadotWallet } from "@/hooks/use-polkadot-wallet";

export function PolkadotWalletButton() {
  const { selectedAccount, accounts, isConnecting, error, connect, selectAccount, disconnect } =
    usePolkadotWallet();
  const [showDropdown, setShowDropdown] = useState(false);

  if (selectedAccount) {
    const short = `${selectedAccount.address.slice(0, 4)}...${selectedAccount.address.slice(-4)}`;
    return (
      <div className="relative">
        <button
          className="flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-border bg-white hover:bg-muted/50 transition-colors text-[11px] font-medium"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <span className="w-2 h-2 rounded-full bg-[#E6007A]" />
          <span className="font-mono">{short}</span>
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-border rounded-lg shadow-lg p-1.5 min-w-[200px]">
            <p className="text-[9px] font-semibold text-muted-foreground px-2 py-0.5 uppercase tracking-wider">Polkadot</p>
            {accounts.map((acc) => (
              <button
                key={acc.address}
                className={`w-full text-left px-2 py-1 rounded text-xs hover:bg-muted transition-colors ${
                  acc.address === selectedAccount.address ? "bg-muted" : ""
                }`}
                onClick={() => {
                  selectAccount(acc);
                  setShowDropdown(false);
                }}
              >
                <span className="font-medium text-[11px]">{acc.name || "Account"}</span>
                <span className="font-mono block text-[10px] text-muted-foreground">
                  {acc.address.slice(0, 8)}...{acc.address.slice(-6)}
                </span>
              </button>
            ))}
            <div className="border-t border-border mt-1 pt-1 flex gap-1">
              <button
                className="flex-1 text-[10px] px-2 py-1 rounded hover:bg-muted transition-colors"
                onClick={() => {
                  if (selectedAccount) navigator.clipboard.writeText(selectedAccount.address);
                }}
              >
                Copy
              </button>
              <button
                className="flex-1 text-[10px] px-2 py-1 rounded text-red-500 hover:bg-red-50 transition-colors"
                onClick={() => {
                  disconnect();
                  setShowDropdown(false);
                }}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        className="flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-border bg-white hover:bg-muted/50 transition-colors text-[11px] font-medium"
        onClick={connect}
        disabled={isConnecting}
      >
        <span className="w-2 h-2 rounded-full bg-[#E6007A]" />
        {isConnecting ? "..." : "Polkadot"}
      </button>
      {error && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-red-200 rounded-lg shadow-lg p-2 max-w-[240px]">
          <p className="text-[10px] text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
}
