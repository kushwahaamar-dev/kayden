import type { Metadata } from "next";
import { DM_Serif_Display, Sora, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const dmSerif = DM_Serif_Display({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-dm-serif",
});

const sora = Sora({
    subsets: ["latin"],
    variable: "--font-sora",
});

const ibmPlexMono = IBM_Plex_Mono({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
    title: "Kayden — Permanent Homes for AI Agents",
    description:
        "Solving the Homeless Agent Problem. Deploy autonomous AI agents that never run out of gas, never need servers, and never die. 100% on-chain autonomy.",
    keywords: [
        "AI agents",
        "DeFi",
        "autonomous",
        "iNFT",
        "ERC-6551",
        "ERC-4337",
        "Hedera",
        "Base",
        "Uniswap",
        "Nouns Builder",
        "ETHDenver 2026",
    ],
    openGraph: {
        title: "Kayden — Permanent Homes for AI Agents",
        description: "Deploy once → agent runs forever autonomously doing real DeFi yield farming.",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={`${dmSerif.variable} ${sora.variable} ${ibmPlexMono.variable} min-h-screen noise-bg antialiased relative`}>
                <div className="ambient-spotlight"></div>
                <div className="ambient-spotlight-alt"></div>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
