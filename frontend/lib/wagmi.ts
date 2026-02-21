"use client";

import { http, createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { coinbaseWallet, metaMask, walletConnect } from "wagmi/connectors";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
const enableWalletConnect =
    process.env.NEXT_PUBLIC_ENABLE_WALLETCONNECT === "true" &&
    !!walletConnectProjectId &&
    walletConnectProjectId.length >= 20;

// ═══════════════════════════════════════════════════════════════════
// Wagmi Config
// ═══════════════════════════════════════════════════════════════════

export const config = createConfig({
    // Demo-safe setup: Base only to avoid cross-chain wallet/network confusion.
    chains: [baseSepolia],
    connectors: [
        coinbaseWallet({
            appName: "Kayden",
            appLogoUrl: "https://www.base.org/apple-touch-icon.png",
        }),
        metaMask(),
        ...(enableWalletConnect
            ? [walletConnect({
                projectId: walletConnectProjectId,
            })]
            : []),
    ],
    transports: {
        [baseSepolia.id]: http(
            process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org"
        ),
    },
    ssr: true,
});

export { baseSepolia };
