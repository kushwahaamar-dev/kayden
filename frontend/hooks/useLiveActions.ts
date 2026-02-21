"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { getAccountTransactions, type HederaTransaction } from "@/lib/hedera";
import { ACTION_TYPE_LABELS, AGENT_HAVEN_NFT_ABI, BASE_RELAY_ABI, CONTRACTS } from "@/lib/contracts";

const RPC = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org";

function getClient() {
    return createPublicClient({
        chain: baseSepolia,
        transport: http(RPC),
        batch: { multicall: true },
    });
}

export interface LiveAction {
    id: string;
    agentId: number;
    agentName: string;
    actionType: number;
    actionLabel: string;
    protocol: string;
    amountIn: string;
    amountOut: string;
    profit: string;
    gasUsed: string;
    timestamp: number;
    txHash: string;
    chain: string;
    source: "hedera" | "base" | "combined";
}

const HEDERA_AGENT_ACCOUNT = "0.0.7981295";

async function fetchHederaActions(): Promise<LiveAction[]> {
    try {
        const txs = await getAccountTransactions(HEDERA_AGENT_ACCOUNT, 10);
        return txs
            .filter((tx: HederaTransaction) => tx.result === "SUCCESS")
            .map((tx: HederaTransaction) => {
                const totalTransfer = tx.transfers.reduce(
                    (sum: number, t: { amount: number }) => sum + Math.abs(t.amount),
                    0
                );
                const hbarAmount = (totalTransfer / 100000000).toFixed(4);
                return {
                    id: `hedera-${tx.transactionId}`,
                    agentId: 0,
                    agentName: "Hedera Observer",
                    actionType: 4,
                    actionLabel: tx.type,
                    protocol: "Hedera HIP-1215",
                    amountIn: `${hbarAmount} HBAR`,
                    amountOut: `${hbarAmount} HBAR`,
                    profit: "0.0000",
                    gasUsed: "n/a",
                    timestamp: Math.floor(parseFloat(tx.consensusTimestamp)),
                    txHash: tx.transactionId,
                    chain: "Hedera Testnet",
                    source: "hedera" as const,
                };
            });
    } catch {
        return [];
    }
}

const isConfiguredAddress = (value: string) =>
    value.length === 42 && !/^0x0{39}[0-9a-fA-F]$/.test(value) && !/^0x0+$/.test(value);

async function fetchBaseRelayAgentActions(): Promise<LiveAction[]> {
    if (!isConfiguredAddress(CONTRACTS.baseRelay) || !isConfiguredAddress(CONTRACTS.agentHavenNFT)) {
        return [];
    }

    try {
        const client = getClient();

        const total = await client.readContract({
            address: CONTRACTS.agentHavenNFT,
            abi: AGENT_HAVEN_NFT_ABI,
            functionName: "totalAgents",
        });

        const totalAgents = Number(total);
        if (!totalAgents) return [];

        const ids = Array.from({ length: totalAgents }, (_, i) => i + 1);

        const calls = ids.flatMap((id) => [
            { address: CONTRACTS.baseRelay, abi: BASE_RELAY_ABI, functionName: "getAgentStats" as const, args: [BigInt(id)] },
            { address: CONTRACTS.baseRelay, abi: BASE_RELAY_ABI, functionName: "getLastAction" as const, args: [BigInt(id)] },
            { address: CONTRACTS.agentHavenNFT, abi: AGENT_HAVEN_NFT_ABI, functionName: "getAgentConfig" as const, args: [BigInt(id)] },
        ]);

        const results = await client.multicall({ contracts: calls, allowFailure: true });

        const actions: LiveAction[] = [];
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const statsResult = results[i * 3];
            const actionResult = results[i * 3 + 1];
            const configResult = results[i * 3 + 2];

            if (statsResult.status !== "success" || actionResult.status !== "success") continue;

            const stats = statsResult.result as any;
            const lastAction = actionResult.result as any;
            const config = configResult.status === "success" ? configResult.result as any : null;

            const totalActions = Number(stats[0]);
            const timestamp = Number(lastAction.timestamp);
            const actionType = Number(lastAction.actionType);

            if (totalActions === 0 || timestamp === 0) continue;

            const amountIn = Number(lastAction.amountIn) / 1e18;
            const amountOut = Number(lastAction.amountOut) / 1e18;
            const profit = Number(lastAction.profit) / 1e18;

            actions.push({
                id: `relay-${id}-${timestamp}`,
                agentId: id,
                agentName: config?.name || `Agent #${id}`,
                actionType,
                actionLabel: ACTION_TYPE_LABELS[actionType] || "Execute",
                protocol: "BaseRelay",
                amountIn: `${amountIn.toFixed(2)} ETH`,
                amountOut: `${amountOut.toFixed(2)} ETH`,
                profit: profit.toFixed(4),
                gasUsed: `${Number(lastAction.gasUsed).toLocaleString()}`,
                timestamp,
                txHash: lastAction.txHash,
                chain: "Base Sepolia",
                source: "base" as const,
            });
        }

        return actions;
    } catch {
        return [];
    }
}

export function useLiveActions(agentId?: number, maxActions: number = 50) {
    const [actions, setActions] = useState<LiveAction[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const latestActionRef = useRef<LiveAction | null>(null);
    const onNewActionCallbackRef = useRef<((action: LiveAction) => void) | null>(null);

    const onNewAction = useCallback((callback: (action: LiveAction) => void) => {
        onNewActionCallbackRef.current = callback;
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            const [hederaActions, baseActions] = await Promise.allSettled([
                fetchHederaActions(),
                fetchBaseRelayAgentActions(),
            ]);

            if (cancelled) return;

            const initial: LiveAction[] = [];
            if (hederaActions.status === "fulfilled") initial.push(...hederaActions.value);
            if (baseActions.status === "fulfilled") initial.push(...baseActions.value);

            initial.sort((a, b) => b.timestamp - a.timestamp);
            setActions(
                initial
                    .filter((action) => !agentId || action.agentId === agentId || action.source === "hedera")
                    .slice(0, maxActions)
            );
            setIsConnected(true);
        }

        load();

        const refreshInterval = setInterval(async () => {
            if (cancelled) return;
            try {
                const [hederaActions, baseActions] = await Promise.all([
                    fetchHederaActions(),
                    fetchBaseRelayAgentActions(),
                ]);

                const merged = [...baseActions, ...hederaActions]
                    .filter((action) => !agentId || action.agentId === agentId || action.source === "hedera")
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, maxActions);

                const newest = merged[0];
                const current = latestActionRef.current;
                if (newest && (!current || newest.id !== current.id)) {
                    latestActionRef.current = newest;
                    onNewActionCallbackRef.current?.(newest);
                }
                setActions(merged);
            } catch { /* silent */ }
        }, 30000);

        return () => {
            cancelled = true;
            clearInterval(refreshInterval);
            setIsConnected(false);
        };
    }, [agentId, maxActions]);

    return { actions, isConnected, latestAction: latestActionRef.current, onNewAction, totalActions: actions.length };
}
