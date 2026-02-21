"use client";

import { http, createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

// ═══════════════════════════════════════════════════════════════════
// Custom chain: Hedera Testnet
// ═══════════════════════════════════════════════════════════════════

const hederaTestnet = {
    id: 296,
    name: "Hedera Testnet",
    nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
    rpcUrls: {
        default: { http: ["https://testnet.hashio.io/api"] },
    },
    blockExplorers: {
        default: { name: "HashScan", url: "https://hashscan.io/testnet" },
    },
    testnet: true,
} as const;

// ═══════════════════════════════════════════════════════════════════
// Custom chain: 0G Testnet
// ═══════════════════════════════════════════════════════════════════

const zeroGTestnet = {
    id: 16600,
    name: "0G Newton Testnet",
    nativeCurrency: { name: "A0GI", symbol: "A0GI", decimals: 18 },
    rpcUrls: {
        default: { http: ["https://evmrpc-testnet.0g.ai"] },
    },
    blockExplorers: {
        default: { name: "0G Explorer", url: "https://chainscan-newton.0g.ai" },
    },
    testnet: true,
} as const;

// ═══════════════════════════════════════════════════════════════════
// Wagmi Config
// ═══════════════════════════════════════════════════════════════════

export const config = createConfig({
    chains: [baseSepolia, hederaTestnet, zeroGTestnet],
    connectors: [
        injected(),
        walletConnect({
            projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
        }),
    ],
    transports: {
        [baseSepolia.id]: http(
            process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org"
        ),
        [hederaTestnet.id]: http("https://testnet.hashio.io/api"),
        [zeroGTestnet.id]: http("https://evmrpc-testnet.0g.ai"),
    },
    ssr: true,
});

export { baseSepolia, hederaTestnet, zeroGTestnet };
