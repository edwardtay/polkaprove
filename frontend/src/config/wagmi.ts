import { http, createStorage, cookieStorage } from "wagmi";
import { type Chain, moonbeam, astar } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { siteConfig } from "./site";

// Polkadot Hub Testnet — https://docs.polkadot.com/smart-contracts/connect/
export const polkadotHubTestnet: Chain = {
  id: 420420417,
  name: "Polkadot Hub Testnet",
  nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://eth-rpc-testnet.polkadot.io/",
        "https://services.polkadothub-rpc.com/testnet/",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://blockscout-testnet.polkadot.io",
    },
  },
  testnet: true,
};

// Polkadot Hub Mainnet — https://docs.polkadot.com/smart-contracts/connect/
export const polkadotHub: Chain = {
  id: 420420419,
  name: "Polkadot Hub",
  nativeCurrency: { name: "DOT", symbol: "DOT", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://eth-rpc.polkadot.io/",
        "https://services.polkadothub-rpc.com/mainnet/",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://blockscout.polkadot.io",
    },
  },
  testnet: false,
};

export const config = getDefaultConfig({
  appName: siteConfig.name,
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
  chains: [polkadotHubTestnet, polkadotHub, moonbeam, astar],
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: {
    [polkadotHubTestnet.id]: http("https://eth-rpc-testnet.polkadot.io/"),
    [polkadotHub.id]: http("https://eth-rpc.polkadot.io/"),
    [moonbeam.id]: http("https://rpc.api.moonbeam.network"),
    [astar.id]: http("https://evm.astar.network"),
  },
});
