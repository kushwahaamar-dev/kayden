"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useAgent } from "@/hooks/useAgent";
import { useLiveActions } from "@/hooks/useLiveActions";
import { LiveActivityFeed } from "@/components/LiveActivityFeed";
import { HeartbeatCountdown } from "@/components/HeartbeatCountdown";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    TerminalSquare,
    ArrowLeft,
    TrendingUp,
    Activity,
    Wallet,
    Shield,
    Brain,
    Timer,
    ExternalLink,
    Copy,
    CheckCircle2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { motion, type Variants } from "framer-motion";
import { Sparkline } from "@/components/magicui/sparkline";
import { buildScheduleConfig } from "@/lib/hedera";
import { CONTRACTS } from "@/lib/contracts";

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 120, damping: 18 },
    },
};

export default function AgentDetailPage() {
    const params = useParams();
    const agentId = Number(params.id);
    const { agent, loading } = useAgent(agentId);
    const { actions, isConnected, onNewAction } = useLiveActions(agentId);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        onNewAction((action) => {
            toast.success(`${action.actionLabel} executed`, {
                description: `+${action.profit} ETH via ${action.protocol}`,
            });
            confetti({
                particleCount: 25,
                spread: 50,
                origin: { y: 0.8 },
                colors: ["#ffffff", "#d4d4d4"],
            });
        });
    }, [onNewAction]);

    const copyAddress = () => {
        if (agent?.boundAccount) {
            navigator.clipboard.writeText(agent.boundAccount);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-8 w-32 bg-white/5 rounded-lg animate-pulse" />
            </div>
        );
    }

    if (!agent) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-neutral-500">Agent not found</p>
                <Link href="/dashboard">
                    <Button variant="outline" className="rounded-full">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Dashboard
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <nav className="border-b border-white/[0.06]">
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <TerminalSquare className="h-5 w-5 text-white" />
                            <span className="font-medium text-[15px] tracking-tight text-white">Kayden</span>
                        </Link>
                        <div className="hidden md:flex items-center gap-6">
                            <Link href="/" className="nav-link">About</Link>
                            <Link href="/dashboard" className="nav-link">Dashboard</Link>
                            <span className="nav-link active">{agent.name}</span>
                        </div>
                    </div>
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back
                        </Button>
                    </Link>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
                {/* Agent Header */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col md:flex-row md:items-start md:justify-between gap-6"
                >
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className={`pulse-dot ${agent.active ? "" : "bg-neutral-600 !shadow-none"}`} />
                            <h1 className="text-4xl md:text-5xl">{agent.name}</h1>
                            <span className={`moonbird-badge ${agent.active ? "text-emerald-400 border-emerald-500/30" : ""}`}>
                                {agent.active ? "Active" : "Idle"}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-neutral-500">
                            <span className="font-mono">Agent #{agent.id}</span>
                            <button
                                onClick={copyAddress}
                                className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                            >
                                TBA: {agent.boundAccount.slice(0, 10)}...
                                {copied ? (
                                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                ) : (
                                    <Copy className="h-3 w-3" />
                                )}
                            </button>
                            <a
                                href={`https://sepolia.basescan.org/address/${agent.boundAccount}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-white transition-colors"
                            >
                                Explorer <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="moonbird-badge">
                            <Timer className="h-3 w-3" />
                            {agent.heartbeatInterval}s heartbeat
                        </span>
                        <span className="moonbird-badge">
                            <Shield className="h-3 w-3" />
                            {agent.verified ? "Verified" : "Pending"}
                        </span>
                    </div>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid md:grid-cols-4 gap-4"
                >
                    <motion.div variants={itemVariants}>
                        <div className="collection-card p-6">
                            <div className="flex items-center gap-2 text-neutral-500 mb-2">
                                <TrendingUp className="h-4 w-4" />
                                <span className="text-xs uppercase tracking-wider">Total Earnings</span>
                            </div>
                            <div className="text-3xl font-mono text-white">{agent.totalEarnings.toFixed(4)}</div>
                            <span className="text-xs text-neutral-500">ETH</span>
                        </div>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <div className="collection-card p-6">
                            <div className="flex items-center gap-2 text-neutral-500 mb-2">
                                <Activity className="h-4 w-4" />
                                <span className="text-xs uppercase tracking-wider">Total Actions</span>
                            </div>
                            <div className="text-3xl font-mono text-white">{agent.totalActions}</div>
                        </div>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <div className="collection-card p-6">
                            <div className="flex items-center gap-2 text-neutral-500 mb-2">
                                <Wallet className="h-4 w-4" />
                                <span className="text-xs uppercase tracking-wider">Paymaster</span>
                            </div>
                            <div className="text-3xl font-mono text-white">{agent.paymasterDeposit.toFixed(4)}</div>
                            <span className="text-xs text-neutral-500">ETH</span>
                        </div>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <div className="collection-card p-6">
                            <div className="flex items-center gap-2 text-neutral-500 mb-2">
                                <Brain className="h-4 w-4" />
                                <span className="text-xs uppercase tracking-wider">Strategy</span>
                            </div>
                            <div className="text-sm font-mono truncate text-white">{agent.strategyHash}</div>
                            <span className="text-xs text-neutral-500">On-chain config</span>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Heartbeat Countdown */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    <HeartbeatCountdown
                        nextHeartbeat={agent.nextHeartbeat}
                        interval={agent.heartbeatInterval}
                    />
                </motion.div>

                {/* Tabbed Content */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                >
                    <Tabs defaultValue="activity" className="space-y-4">
                        <TabsList className="bg-[#0a0a0a] border border-white/[0.06]">
                            <TabsTrigger value="activity">Live Activity</TabsTrigger>
                            <TabsTrigger value="ai">Strategy Engine</TabsTrigger>
                            <TabsTrigger value="earnings">Earnings Chart</TabsTrigger>
                            <TabsTrigger value="config">Configuration</TabsTrigger>
                        </TabsList>

                        <TabsContent value="activity">
                            <div className="collection-card p-6">
                                <LiveActivityFeed
                                    actions={actions}
                                    isConnected={isConnected}
                                    maxHeight="500px"
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="ai">
                            <div className="collection-card p-6 space-y-4">
                                <h3 className="flex items-center gap-2 font-sans font-semibold">
                                    <Brain className="h-5 w-5 text-neutral-300" />
                                    On-Chain Strategy Engine
                                </h3>
                                <p className="text-sm text-neutral-500">
                                    Strategy execution is driven by on-chain heartbeat state and BaseRelay action logs.
                                </p>
                                <div className="bg-black/40 rounded-xl p-6 border border-white/[0.04] space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-neutral-500 uppercase tracking-wider">Live Agent State</span>
                                        <span className="moonbird-badge text-xs text-emerald-400 border-emerald-500/30">On-chain</span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-neutral-500">Agent ID</p>
                                            <p className="text-white font-mono text-sm">{agent.id}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-neutral-500">Last Action</p>
                                            <p className="text-white font-mono text-sm">{agent.lastActionType}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-neutral-500">Interval</p>
                                            <p className="text-white font-mono text-sm">{agent.heartbeatInterval}s</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-neutral-500">Verified</p>
                                            <p className="text-white font-mono text-sm">{agent.verified ? "yes" : "no"}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-black/40 rounded-xl p-4 border border-white/[0.04]">
                                    <p className="text-xs text-neutral-600 font-mono">BaseRelay: {CONTRACTS.baseRelay}</p>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="earnings">
                            <div className="collection-card overflow-hidden">
                                <div className="px-6 py-4 border-b border-white/[0.06]">
                                    <h3 className="flex items-center gap-2 font-sans font-semibold">
                                        <TrendingUp className="h-5 w-5 text-neutral-400" />
                                        Earnings History
                                    </h3>
                                </div>
                                <div className="h-[300px] flex items-center justify-center p-6">
                                    {agent.earningsHistory.some(h => h.amount > 0) ? (
                                        <div className="w-full h-full relative flex items-center px-4">
                                            <Sparkline
                                                data={agent.earningsHistory.map((h) => ({ value: h.amount }))}
                                                width={600}
                                                height={200}
                                                color="#e8d5b7"
                                                className="w-full h-full opacity-90"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-neutral-600 flex flex-col items-center justify-center h-full space-y-2">
                                            <Activity className="h-8 w-8" />
                                            <p>No earnings yet — agent is awaiting first heartbeat execution</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="config">
                            <div className="collection-card p-6 space-y-6">
                                <h3 className="flex items-center gap-2 font-sans font-semibold">
                                    <Shield className="h-5 w-5 text-neutral-400" />
                                    Agent Configuration
                                </h3>

                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-neutral-300 uppercase tracking-wider">Strategy Metadata</p>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="bg-black/40 rounded-xl p-4 space-y-2 border border-white/[0.04]">
                                            <span className="text-xs text-neutral-500">Strategy Hash</span>
                                            <p className="font-mono text-sm break-all text-white">{agent.strategyHash}</p>
                                        </div>
                                        <div className="bg-black/40 rounded-xl p-4 space-y-2 border border-white/[0.04]">
                                            <span className="text-xs text-neutral-500">Last Action Type</span>
                                            <p className="font-mono text-sm text-white">{agent.lastActionType}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-purple-400 uppercase tracking-wider">Hedera HIP-1215 Schedule</p>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="bg-black/40 rounded-xl p-4 space-y-2 border border-white/[0.04]">
                                            <span className="text-xs text-neutral-500">Heartbeat Interval</span>
                                            <p className="font-mono text-sm text-white">{agent.heartbeatInterval}s via HIP-1215</p>
                                        </div>
                                        <div className="bg-black/40 rounded-xl p-4 space-y-2 border border-white/[0.04]">
                                            <span className="text-xs text-neutral-500">Schedule Calldata</span>
                                            <p className="font-mono text-xs break-all text-neutral-400">
                                                {buildScheduleConfig(agent.id, agent.heartbeatInterval, CONTRACTS.baseRelay).calldata}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-white uppercase tracking-wider">Base ERC-4337 + ERC-6551</p>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="bg-black/40 rounded-xl p-4 space-y-2 border border-white/[0.04]">
                                            <span className="text-xs text-neutral-500">Token Bound Account</span>
                                            <p className="font-mono text-sm break-all text-white">{agent.boundAccount}</p>
                                        </div>
                                        <div className="bg-black/40 rounded-xl p-4 space-y-2 border border-white/[0.04]">
                                            <span className="text-xs text-neutral-500">Paymaster Deposit</span>
                                            <p className="font-mono text-sm text-white">{agent.paymasterDeposit.toFixed(4)} ETH</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </main>
        </div>
    );
}
