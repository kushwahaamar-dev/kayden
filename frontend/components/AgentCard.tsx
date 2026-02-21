"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, Zap, TrendingUp, Clock } from "lucide-react";
import type { AgentData } from "@/hooks/useAgent";
import { HeartbeatCountdown } from "@/components/HeartbeatCountdown";
import { motion } from "framer-motion";

interface AgentCardProps {
    agent: AgentData;
}

export function AgentCard({ agent }: AgentCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            <Link href={`/agents/${agent.id}`}>
                <div className="collection-card p-6 space-y-4 cursor-pointer">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <div className={`pulse-dot ${agent.active ? "" : "bg-neutral-600 !shadow-none"}`} />
                                <h3 className="font-sans font-semibold text-white tracking-tight max-w-[140px] truncate">{agent.name}</h3>
                            </div>
                            <p className="text-xs text-neutral-500 font-mono">
                                Sub-DAO #{agent.id} · Treasury: {agent.boundAccount.slice(0, 8)}...
                            </p>
                        </div>
                        <span className={`moonbird-badge text-xs ${agent.active ? "text-emerald-400 border-emerald-500/30" : ""}`}>
                            {agent.active ? "Executing" : "Paused"}
                        </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-neutral-500">
                                <TrendingUp className="h-3.5 w-3.5" />
                                <span className="text-xs uppercase tracking-wider">Earnings</span>
                            </div>
                            <p className="text-lg font-mono text-white">
                                {agent.totalEarnings.toFixed(3)} ETH
                            </p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-neutral-500">
                                <Activity className="h-3.5 w-3.5" />
                                <span className="text-xs uppercase tracking-wider">Actions</span>
                            </div>
                            <p className="text-lg font-mono text-white">
                                {agent.totalActions}
                            </p>
                        </div>
                    </div>

                    {/* Heartbeat Countdown */}
                    <HeartbeatCountdown
                        nextHeartbeat={agent.nextHeartbeat}
                        interval={agent.heartbeatInterval}
                        compact
                    />

                    {/* Last Action */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                            <Zap className="h-3 w-3" />
                            Last: <span className="text-neutral-300">{agent.lastActionType}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                            <Clock className="h-3 w-3" />
                            <span className="text-neutral-300">{agent.heartbeatInterval}s interval</span>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
