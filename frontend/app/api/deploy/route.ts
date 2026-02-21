import { createPublicClient, createWalletClient, http, parseEventLogs } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { NextResponse } from "next/server";

const NFT_ADDRESS = (process.env.NEXT_PUBLIC_NFT_ADDRESS ?? "") as `0x${string}`;
const RPC = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org";
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;

const MINT_ABI = [
    {
        type: "function",
        name: "mintAgent",
        inputs: [
            { name: "_name", type: "string" },
            { name: "_strategyHash", type: "string" },
            { name: "_heartbeatInterval", type: "uint256" },
        ],
        outputs: [{ name: "tokenId", type: "uint256" }],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        name: "AgentCreated",
        inputs: [
            { name: "tokenId", type: "uint256", indexed: true },
            { name: "owner", type: "address", indexed: true },
            { name: "name", type: "string", indexed: false },
            { name: "strategyHash", type: "string", indexed: false },
        ],
    },
] as const;

export async function POST(req: Request) {
    try {
        if (!DEPLOYER_KEY) {
            return NextResponse.json({ error: "DEPLOYER_PRIVATE_KEY not set" }, { status: 500 });
        }

        const body = await req.json();
        const { name, strategy, interval } = body as {
            name: string;
            strategy: string;
            interval: number;
        };

        if (!name || !strategy) {
            return NextResponse.json({ error: "name and strategy required" }, { status: 400 });
        }

        const account = privateKeyToAccount(DEPLOYER_KEY);
        const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
        const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

        const hash = await walletClient.writeContract({
            address: NFT_ADDRESS,
            abi: MINT_ABI,
            functionName: "mintAgent",
            args: [name, strategy, BigInt(interval || 30)],
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const events = parseEventLogs({
            abi: MINT_ABI,
            eventName: "AgentCreated",
            logs: receipt.logs,
        });

        const tokenId = events[0] ? Number(events[0].args.tokenId) : 0;

        return NextResponse.json({
            tokenId,
            txHash: hash,
            blockNumber: Number(receipt.blockNumber),
        });
    } catch (e: any) {
        console.error("Deploy API error:", e);
        return NextResponse.json(
            { error: e.shortMessage || e.message || "Mint failed" },
            { status: 500 }
        );
    }
}
