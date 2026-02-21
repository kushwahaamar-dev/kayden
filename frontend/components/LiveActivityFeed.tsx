"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ArrowUpRight,
    ArrowDownRight,
    RefreshCw,
    Sparkles,
    Repeat,
    ExternalLink,
} from "lucide-react";
import type { LiveAction } from "@/hooks/useLiveActions";
import { timeAgo } from "@/lib/utils";

interface LiveActivityFeedProps {
    actions: LiveAction[];
    isConnected: boolean;
    maxHeight?: string;
}

const ACTION_ICONS: Record<number, React.ReactNode> = {
    0: <ArrowUpRight className="h-4 w-4 text-neutral-300" />,
    1: <ArrowDownRight className="h-4 w-4 text-neutral-500" />,
    2: <RefreshCw className="h-4 w-4 text-neutral-300" />,
    3: <Sparkles className="h-4 w-4 text-neutral-300" />,
    4: <Repeat className="h-4 w-4 text-neutral-500" />,
};

export function LiveActivityFeed({
    actions,
    isConnected,
    maxHeight = "500px",
}: LiveActivityFeedProps) {
    const feedRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = 0;
        }
    }, [actions.length]);

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3">
                <h3 className="text-sm font-medium text-neutral-500">
                    Live Activity Feed
                </h3>
                <div className="flex items-center gap-2">
                    <div
                        className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-neutral-600"}`}
                    />
                    <span className="text-xs text-neutral-500">
                        {isConnected ? "Connected" : "Disconnected"}
                    </span>
                </div>
            </div>

            {/* Feed */}
            <ScrollArea style={{ maxHeight }} className="rounded-lg">
                <div ref={feedRef} className="space-y-0 px-2">
                    {actions.map((action) => (
                        <div
                            key={action.id}
                            className="rounded-lg p-3 transition-all duration-200 hover:bg-white/[0.02] border-b border-white/[0.03] last:border-0"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="mt-0.5 flex-shrink-0">
                                        {ACTION_ICONS[action.actionType]}
                                    </div>
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-white">
                                                {action.agentName}
                                            </span>
                                            <span className="moonbird-badge text-[10px] py-0 px-1.5">
                                                {action.actionLabel}
                                            </span>
                                        </div>
                                        <p className="text-xs text-neutral-500">
                                            {action.protocol} · {action.amountIn} → {action.amountOut}{" "}
                                            <span className="text-white font-medium">
                                                (+{action.profit} ETH)
                                            </span>
                                        </p>
                                        <div className="flex items-center gap-3 text-[10px] text-neutral-600">
                                            <span>{action.chain}</span>
                                            <span>Gas: {action.gasUsed}</span>
                                            {action.source === "hedera" ? (
                                                <a
                                                    href={`https://hashscan.io/testnet/transaction/${action.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-0.5 hover:text-white transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    Tx <ExternalLink className="h-2.5 w-2.5" />
                                                </a>
                                            ) : (
                                                <a
                                                    href={`https://sepolia.basescan.org/tx/${action.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-0.5 hover:text-white transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    Tx <ExternalLink className="h-2.5 w-2.5" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[10px] text-neutral-600 flex-shrink-0 whitespace-nowrap">
                                    {timeAgo(action.timestamp)}
                                </span>
                            </div>
                        </div>
                    ))}

                    {actions.length === 0 && (
                        <div className="flex items-center justify-center py-12 text-neutral-600 text-sm">
                            Waiting for agent actions...
                        </div>
                    )}
                </div>
            </ScrollArea >
        </div >
    );
}
