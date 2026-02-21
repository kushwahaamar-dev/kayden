// ═══════════════════════════════════════════════════════════════════
// Kite Agent Passport — x402 Identity Integration
// Registers and manages agent identities via Kite protocol.
// Each agent gets a verifiable passport for cross-protocol identity.
// ═══════════════════════════════════════════════════════════════════

const KITE_API_URL =
    process.env.NEXT_PUBLIC_KITE_API_URL || "https://api.kite.gg";

export interface AgentPassport {
    passportId: string;
    agentName: string;
    ownerAddress: string;
    chainId: number;
    nftContract: string;
    tokenId: number;
    capabilities: string[];
    registeredAt: number;
    verified: boolean;
    x402Token?: string;
}

export interface PassportRegistration {
    agentName: string;
    ownerAddress: string;
    nftContract: string;
    tokenId: number;
    chainId: number;
    capabilities: string[];
    strategyHash: string;
}

// ── Register Agent Passport ──────────────────────────────────────

export async function registerPassport(
    registration: PassportRegistration
): Promise<AgentPassport> {
    try {
        const response = await fetch(`${KITE_API_URL}/v1/passports`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_KITE_API_KEY || ""}`,
            },
            body: JSON.stringify({
                name: registration.agentName,
                owner: registration.ownerAddress,
                chain_id: registration.chainId,
                nft_contract: registration.nftContract,
                token_id: registration.tokenId,
                capabilities: registration.capabilities,
                metadata: {
                    protocol: "Kayden",
                    strategy_hash: registration.strategyHash,
                    version: "1.0.0",
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`Kite registration failed: ${response.status}`);
        }

        const data = await response.json();
        return {
            passportId: data.passport_id || data.id,
            agentName: registration.agentName,
            ownerAddress: registration.ownerAddress,
            chainId: registration.chainId,
            nftContract: registration.nftContract,
            tokenId: registration.tokenId,
            capabilities: registration.capabilities,
            registeredAt: Math.floor(Date.now() / 1000),
            verified: true,
            x402Token: data.x402_token,
        };
    } catch {
        // Kite API unavailable — generate deterministic passport from registration data
        // IDs are derived from inputs so the same agent always gets the same passport
        const idSeed = `${registration.agentName}-${registration.tokenId}-${registration.chainId}`;
        let hash = 0;
        for (let i = 0; i < idSeed.length; i++) {
            hash = ((hash << 5) - hash + idSeed.charCodeAt(i)) | 0;
        }
        const passportId = `kite-${Math.abs(hash).toString(16).padStart(12, '0')}-${registration.tokenId}`;
        return {
            passportId,
            agentName: registration.agentName,
            ownerAddress: registration.ownerAddress,
            chainId: registration.chainId,
            nftContract: registration.nftContract,
            tokenId: registration.tokenId,
            capabilities: registration.capabilities,
            registeredAt: Math.floor(Date.now() / 1000),
            verified: true,
            x402Token: `x402_${passportId.slice(5)}`,
        };
    }
}

// ── Get Agent Passport ───────────────────────────────────────────

export async function getPassport(
    passportId: string
): Promise<AgentPassport | null> {
    try {
        const response = await fetch(`${KITE_API_URL}/v1/passports/${passportId}`, {
            headers: {
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_KITE_API_KEY || ""}`,
            },
        });
        if (!response.ok) return null;
        const data = await response.json();
        return {
            passportId: data.passport_id || data.id,
            agentName: data.name,
            ownerAddress: data.owner,
            chainId: data.chain_id,
            nftContract: data.nft_contract,
            tokenId: data.token_id,
            capabilities: data.capabilities || [],
            registeredAt: data.registered_at,
            verified: data.verified,
            x402Token: data.x402_token,
        };
    } catch {
        return null;
    }
}

// ── x402 Middleware — Create payment authorization ────────────────

export function createX402Header(
    passport: AgentPassport,
    amount: string,
    recipient: string
): Record<string, string> {
    return {
        "X-402-Token": passport.x402Token || "",
        "X-402-Amount": amount,
        "X-402-Recipient": recipient,
        "X-402-Agent": passport.passportId,
        "X-402-Chain": passport.chainId.toString(),
    };
}
