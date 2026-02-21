// ═══════════════════════════════════════════════════════════════════
// Contract ABIs + Deployed Addresses
// All ABIs match the Solidity contracts in /contracts/src/
// ═══════════════════════════════════════════════════════════════════

// ── Deployed Addresses (Base Sepolia testnet) ────────────────────
// Run `forge script Deploy.s.sol --rpc-url base-sepolia --broadcast` to deploy
// Then update these addresses with the deployed contract addresses

export const CONTRACTS = {
    agentHavenNFT: (process.env.NEXT_PUBLIC_NFT_ADDRESS || "0x0000000000000000000000000000000000000001") as `0x${string}`,
    tbaRegistry: (process.env.NEXT_PUBLIC_TBA_REGISTRY || "0x000000006551c19487814612e58FE06813775758") as `0x${string}`,
    baseRelay: (process.env.NEXT_PUBLIC_RELAY_ADDRESS || "0x0000000000000000000000000000000000000003") as `0x${string}`,
    defiModules: (process.env.NEXT_PUBLIC_DEFI_MODULES || "0x0000000000000000000000000000000000000004") as `0x${string}`,
    paymaster: (process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS || "0x0000000000000000000000000000000000000005") as `0x${string}`,
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as `0x${string}`, // ERC-4337 v0.7 canonical
} as const;

// ── KaydenNFT ABI ────────────────────────────────────────────

export const AGENT_HAVEN_NFT_ABI = [
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
        type: "function",
        name: "getAgentConfig",
        inputs: [{ name: "tokenId", type: "uint256" }],
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    { name: "name", type: "string" },
                    { name: "strategyHash", type: "string" },
                    { name: "heartbeatInterval", type: "uint256" },
                    { name: "boundAccount", type: "address" },
                    { name: "totalEarnings", type: "uint256" },
                    { name: "totalActions", type: "uint256" },
                    { name: "active", type: "bool" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "totalAgents",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "ownerOf",
        inputs: [{ name: "tokenId", type: "uint256" }],
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "updateStrategy",
        inputs: [
            { name: "tokenId", type: "uint256" },
            { name: "newStrategyHash", type: "string" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "deactivateAgent",
        inputs: [{ name: "tokenId", type: "uint256" }],
        outputs: [],
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
    {
        type: "event",
        name: "AgentDeactivated",
        inputs: [{ name: "tokenId", type: "uint256", indexed: true }],
    },
    {
        type: "event",
        name: "AgentConfigUpdated",
        inputs: [
            { name: "tokenId", type: "uint256", indexed: true },
            { name: "newStrategyHash", type: "string", indexed: false },
        ],
    },
] as const;

// ── BaseRelay ABI ────────────────────────────────────────────────

export const BASE_RELAY_ABI = [
    {
        type: "function",
        name: "executeHeartbeat",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "getLastAction",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    { name: "agentId", type: "uint256" },
                    { name: "actionType", type: "uint8" },
                    { name: "protocol", type: "address" },
                    { name: "tokenIn", type: "address" },
                    { name: "tokenOut", type: "address" },
                    { name: "amountIn", type: "uint256" },
                    { name: "amountOut", type: "uint256" },
                    { name: "profit", type: "uint256" },
                    { name: "gasUsed", type: "uint256" },
                    { name: "timestamp", type: "uint256" },
                    { name: "txHash", type: "bytes32" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getNextHeartbeat",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getAgentStats",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [
            { name: "totalActions", type: "uint256" },
            { name: "totalEarnings", type: "uint256" },
            { name: "nextBeat", type: "uint256" },
            { name: "isActive", type: "bool" },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "registerAgent",
        inputs: [
            { name: "agentId", type: "uint256" },
            { name: "interval", type: "uint256" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        name: "AgentActionExecuted",
        inputs: [
            { name: "agentId", type: "uint256", indexed: true },
            { name: "actionType", type: "uint8", indexed: false },
            { name: "protocol", type: "address", indexed: true },
            { name: "amountIn", type: "uint256", indexed: false },
            { name: "amountOut", type: "uint256", indexed: false },
            { name: "profit", type: "uint256", indexed: false },
            { name: "timestamp", type: "uint256", indexed: false },
        ],
    },
    {
        type: "event",
        name: "HeartbeatScheduled",
        inputs: [
            { name: "agentId", type: "uint256", indexed: true },
            { name: "nextExecution", type: "uint256", indexed: false },
            { name: "interval", type: "uint256", indexed: false },
        ],
    },
    {
        type: "event",
        name: "PaymasterFunded",
        inputs: [
            { name: "agentId", type: "uint256", indexed: true },
            { name: "amount", type: "uint256", indexed: false },
        ],
    },
] as const;

// ── Paymaster ABI ────────────────────────────────────────────────

export const PAYMASTER_ABI = [
    {
        type: "function",
        name: "getAgentDeposit",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getAgentGasStats",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [
            { name: "deposit", type: "uint256" },
            { name: "gasSponsored", type: "uint256" },
            { name: "verified", type: "bool" },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "depositForAgent",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "event",
        name: "AgentFunded",
        inputs: [
            { name: "agentId", type: "uint256", indexed: true },
            { name: "amount", type: "uint256", indexed: false },
            { name: "newBalance", type: "uint256", indexed: false },
        ],
    },
    {
        type: "event",
        name: "GasSponsored",
        inputs: [
            { name: "agentId", type: "uint256", indexed: true },
            { name: "amount", type: "uint256", indexed: false },
            { name: "remainingBalance", type: "uint256", indexed: false },
        ],
    },
] as const;

// ── Action type labels ───────────────────────────────────────────

export const ACTION_TYPE_LABELS: Record<number, string> = {
    0: "Supply",
    1: "Withdraw",
    2: "Swap",
    3: "Harvest",
    4: "Rebalance",
};

export const ACTION_TYPE_COLORS: Record<number, string> = {
    0: "text-foreground",
    1: "text-foreground",
    2: "text-foreground",
    3: "text-foreground",
    4: "text-foreground",
};
