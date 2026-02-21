"use client";

import { useState, useEffect, useCallback } from "react";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { ACTION_TYPE_LABELS, AGENT_HAVEN_NFT_ABI, BASE_RELAY_ABI, CONTRACTS, PAYMASTER_ABI } from "@/lib/contracts";

const RPC = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org";

function getClient() {
    return createPublicClient({
        chain: baseSepolia,
        transport: http(RPC),
        batch: { multicall: true },
    });
}

const isPlaceholderAddress = (value: string) =>
    /^0x0{39}[0-9a-fA-F]$/.test(value) || /^0x0+$/.test(value);

const isConfiguredAddress = (value: string) =>
    value.length === 42 && !isPlaceholderAddress(value);

export interface AgentData {
    id: number;
    name: string;
    strategyHash: string;
    heartbeatInterval: number;
    boundAccount: string;
    totalEarnings: number;
    totalActions: number;
    active: boolean;
    nextHeartbeat: number;
    lastActionType: string;
    paymasterDeposit: number;
    verified: boolean;
    earningsHistory: { amount: number }[];
}

function buildEarningsHistory(baseEarnings: number, totalActions: number, points: number = 24): { amount: number }[] {
    if (baseEarnings <= 0 || totalActions <= 0) return [];
    const perAction = baseEarnings / totalActions;
    const filled = Math.min(totalActions, points);
    const history: { amount: number }[] = [];
    for (let i = 0; i < filled; i++) {
        history.push({ amount: +((i + 1) * perAction).toFixed(4) });
    }
    return history;
}

function parseAgent(id: number, config: any, relayStats: any, lastAction: any, pmStats: any): AgentData {
    const relay = {
        totalActions: 0, totalEarnings: 0, nextBeat: 0, isActive: false,
    };
    let lastActionType = 0;
    let paymasterDeposit = 0;
    let verified = false;

    if (relayStats) {
        try {
            relay.totalActions = Number(relayStats[0]);
            relay.totalEarnings = Number(relayStats[1]) / 1e18;
            relay.nextBeat = Number(relayStats[2]);
            relay.isActive = Boolean(relayStats[3]);
        } catch { /* partial decode */ }
    }
    if (lastAction) {
        try { lastActionType = Number(lastAction.actionType); } catch { /* */ }
    }
    if (pmStats) {
        try {
            paymasterDeposit = Number(pmStats[0]) / 1e18;
            verified = Boolean(pmStats[2]);
        } catch { /* */ }
    }

    const isActive = Boolean(config?.active) || relay.isActive;

    return {
        id,
        name: config?.name || `Agent #${id}`,
        strategyHash: config?.strategyHash || "unknown",
        heartbeatInterval: Number(config?.heartbeatInterval) || 30,
        boundAccount: config?.boundAccount || "0x0000000000000000000000000000000000000000",
        totalEarnings: relay.totalEarnings,
        totalActions: relay.totalActions,
        active: isActive,
        nextHeartbeat: relay.nextBeat,
        lastActionType: ACTION_TYPE_LABELS[lastActionType] || "Supply",
        paymasterDeposit,
        verified,
        earningsHistory: buildEarningsHistory(relay.totalEarnings, relay.totalActions),
    };
}

async function fetchAllAgentsBatched(client: ReturnType<typeof getClient>): Promise<AgentData[]> {
    const total = await client.readContract({
        address: CONTRACTS.agentHavenNFT,
        abi: AGENT_HAVEN_NFT_ABI,
        functionName: "totalAgents",
    });

    const count = Number(total);
    if (!count) return [];

    const ids = Array.from({ length: count }, (_, i) => i + 1);
    const hasRelay = isConfiguredAddress(CONTRACTS.baseRelay);
    const hasPM = isConfiguredAddress(CONTRACTS.paymaster);

    const calls: any[] = [];
    const callMap: { id: number; field: string; idx: number }[] = [];

    for (const id of ids) {
        callMap.push({ id, field: "config", idx: calls.length });
        calls.push({
            address: CONTRACTS.agentHavenNFT,
            abi: AGENT_HAVEN_NFT_ABI,
            functionName: "getAgentConfig",
            args: [BigInt(id)],
        });

        if (hasRelay) {
            callMap.push({ id, field: "relayStats", idx: calls.length });
            calls.push({
                address: CONTRACTS.baseRelay,
                abi: BASE_RELAY_ABI,
                functionName: "getAgentStats",
                args: [BigInt(id)],
            });
            callMap.push({ id, field: "lastAction", idx: calls.length });
            calls.push({
                address: CONTRACTS.baseRelay,
                abi: BASE_RELAY_ABI,
                functionName: "getLastAction",
                args: [BigInt(id)],
            });
        }

        if (hasPM) {
            callMap.push({ id, field: "pmStats", idx: calls.length });
            calls.push({
                address: CONTRACTS.paymaster,
                abi: PAYMASTER_ABI,
                functionName: "getAgentGasStats",
                args: [BigInt(id)],
            });
        }
    }

    const results = await client.multicall({ contracts: calls, allowFailure: true });

    const agentDataMap = new Map<number, Record<string, any>>();
    for (const entry of callMap) {
        if (!agentDataMap.has(entry.id)) agentDataMap.set(entry.id, {});
        const r = results[entry.idx];
        if (r.status === "success") {
            agentDataMap.get(entry.id)![entry.field] = r.result;
        }
    }

    const agents: AgentData[] = [];
    for (const id of ids) {
        const data = agentDataMap.get(id);
        if (!data?.config) continue;
        agents.push(parseAgent(id, data.config, data.relayStats, data.lastAction, data.pmStats));
    }
    return agents;
}

export function useAgent(agentId?: number) {
    const [agent, setAgent] = useState<AgentData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchAgent = useCallback(async () => {
        if (!agentId || !isConfiguredAddress(CONTRACTS.agentHavenNFT)) {
            setAgent(null);
            setLoading(false);
            return;
        }

        try {
            const client = getClient();
            const hasRelay = isConfiguredAddress(CONTRACTS.baseRelay);
            const hasPM = isConfiguredAddress(CONTRACTS.paymaster);

            const calls: any[] = [
                { address: CONTRACTS.agentHavenNFT, abi: AGENT_HAVEN_NFT_ABI, functionName: "getAgentConfig", args: [BigInt(agentId)] },
            ];
            if (hasRelay) {
                calls.push({ address: CONTRACTS.baseRelay, abi: BASE_RELAY_ABI, functionName: "getAgentStats", args: [BigInt(agentId)] });
                calls.push({ address: CONTRACTS.baseRelay, abi: BASE_RELAY_ABI, functionName: "getLastAction", args: [BigInt(agentId)] });
            }
            if (hasPM) {
                calls.push({ address: CONTRACTS.paymaster, abi: PAYMASTER_ABI, functionName: "getAgentGasStats", args: [BigInt(agentId)] });
            }

            const results = await client.multicall({ contracts: calls, allowFailure: true });

            let idx = 0;
            const config = results[idx++]?.status === "success" ? results[idx - 1].result : null;
            const relayStats = hasRelay && results[idx]?.status === "success" ? results[idx++].result : (hasRelay && idx++, null);
            const lastAction = hasRelay && results[idx]?.status === "success" ? results[idx++].result : (hasRelay && idx++, null);
            const pmStats = hasPM && results[idx]?.status === "success" ? results[idx].result : null;

            if (!config) { setAgent(null); return; }
            setAgent(parseAgent(agentId, config, relayStats, lastAction, pmStats));
        } catch {
            setAgent(null);
        } finally {
            setLoading(false);
        }
    }, [agentId]);

    useEffect(() => {
        fetchAgent();
        const interval = setInterval(fetchAgent, 30000);
        return () => clearInterval(interval);
    }, [fetchAgent]);

    return { agent, loading, refetch: fetchAgent };
}

export function useAllAgents() {
    const [agents, setAgents] = useState<AgentData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAll() {
            if (!isConfiguredAddress(CONTRACTS.agentHavenNFT)) {
                setAgents([]);
                setLoading(false);
                return;
            }

            try {
                const client = getClient();
                const loaded = await fetchAllAgentsBatched(client);
                setAgents(loaded);
            } catch { /* silent */ } finally {
                setLoading(false);
            }
        }

        fetchAll();
        const interval = setInterval(fetchAll, 30000);
        return () => clearInterval(interval);
    }, []);

    const stats = {
        totalAgents: agents.length,
        activeAgents: agents.filter((a) => a.active).length,
        totalEarnings: agents.reduce((sum, a) => sum + a.totalEarnings, 0),
        totalActions: agents.reduce((sum, a) => sum + a.totalActions, 0),
    };

    return { agents, loading, stats };
}

export { ACTION_TYPE_LABELS };
