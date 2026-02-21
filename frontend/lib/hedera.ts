// ═══════════════════════════════════════════════════════════════════
// Hedera HIP-1215 — Scheduled Transaction Logic
// Creates and manages autonomous heartbeat schedules for agents.
// Schedule runs every 30s (configurable) and auto-re-schedules.
// ═══════════════════════════════════════════════════════════════════

const HEDERA_MIRROR_REST =
    process.env.NEXT_PUBLIC_HEDERA_MIRROR_REST ||
    "https://testnet.mirrornode.hedera.com";
const HEDERA_MIRROR_WS = "wss://testnet.mirrornode.hedera.com";

export interface ScheduleInfo {
    scheduleId: string;
    creatorAccountId: string;
    payerAccountId: string;
    expirationTime: string;
    executedAt: string | null;
    memo: string;
    status: "pending" | "executed" | "deleted";
}

export interface HederaTransaction {
    transactionId: string;
    type: string;
    result: string;
    consensusTimestamp: string;
    transfers: Array<{ account: string; amount: number }>;
}

// ── Schedule Creation (client-side helper) ───────────────────────
// In production, this would use @hashgraph/sdk ScheduleCreateTransaction
// For the frontend, we provide the config and let the backend/contract handle it

export interface ScheduleConfig {
    agentId: number;
    intervalSeconds: number;
    targetContract: string;
    calldata: string;
    memo: string;
}

export function buildScheduleConfig(
    agentId: number,
    intervalSeconds: number = 30,
    relayAddress: string
): ScheduleConfig {
    // Build the calldata for executeHeartbeat(uint256)
    const selector = "0x7a0ed627"; // keccak256("executeHeartbeat(uint256)")
    const paddedId = agentId.toString(16).padStart(64, "0");
    const calldata = selector + paddedId;

    return {
        agentId,
        intervalSeconds,
        targetContract: relayAddress,
        calldata,
        memo: `Kayden heartbeat | Agent #${agentId} | ${intervalSeconds}s interval`,
    };
}

// ── Mirror Node REST API — Query Schedules ───────────────────────

export async function getSchedule(
    scheduleId: string
): Promise<ScheduleInfo | null> {
    try {
        const response = await fetch(
            `${HEDERA_MIRROR_REST}/api/v1/schedules/${scheduleId}`
        );
        if (!response.ok) return null;
        const data = await response.json();
        return {
            scheduleId: data.schedule_id,
            creatorAccountId: data.creator_account_id,
            payerAccountId: data.payer_account_id,
            expirationTime: data.expiration_time,
            executedAt: data.executed_timestamp,
            memo: data.memo,
            status: data.executed_timestamp
                ? "executed"
                : data.deleted
                    ? "deleted"
                    : "pending",
        };
    } catch {
        return null;
    }
}

// ── Mirror Node REST API — Query Transactions ────────────────────

export async function getAccountTransactions(
    accountId: string,
    limit: number = 25
): Promise<HederaTransaction[]> {
    try {
        const response = await fetch(
            `${HEDERA_MIRROR_REST}/api/v1/transactions?account.id=${accountId}&limit=${limit}&order=desc`
        );
        if (!response.ok) return [];
        const data = await response.json();
        return (data.transactions || []).map(
            (tx: Record<string, unknown>) => ({
                transactionId: tx.transaction_id as string,
                type: tx.name as string,
                result: tx.result as string,
                consensusTimestamp: tx.consensus_timestamp as string,
                transfers: (tx.transfers || []) as Array<{
                    account: string;
                    amount: number;
                }>,
            })
        );
    } catch {
        return [];
    }
}

// ── WebSocket Subscription for Real-time Updates ─────────────────

export function subscribeToHederaTopic(
    topicId: string,
    onMessage: (msg: { timestamp: string; message: string; sequenceNumber: number }) => void
): () => void {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
        ws = new WebSocket(`${HEDERA_MIRROR_WS}/api/v1/topics/${topicId}/messages`);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onMessage({
                    timestamp: data.consensus_timestamp,
                    message: atob(data.message),
                    sequenceNumber: data.sequence_number,
                });
            } catch {
                // Skip malformed messages
            }
        };

        ws.onclose = () => {
            reconnectTimeout = setTimeout(connect, 3000);
        };
    }

    connect();

    return () => {
        if (ws) ws.close();
        clearTimeout(reconnectTimeout);
    };
}

// ── Utility: Format Hedera timestamp ─────────────────────────────

export function formatHederaTimestamp(timestamp: string): string {
    const [seconds] = timestamp.split(".");
    return new Date(parseInt(seconds) * 1000).toLocaleString();
}
