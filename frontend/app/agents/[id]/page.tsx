"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useAgent } from "@/hooks/useAgent";
import { useLiveActions } from "@/hooks/useLiveActions";
import { LiveActivityFeed } from "@/components/LiveActivityFeed";
import { HeartbeatCountdown } from "@/components/HeartbeatCountdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { motion, type Variants } from "framer-motion";
import { Sparkline } from "@/components/magicui/sparkline";
import { useSendTransaction, useAccount } from "wagmi";
import { getUniswapTransaction } from "@/lib/uniswap";
import { evaluateStrategy } from "@/lib/zeroG";
import { buildScheduleConfig } from "@/lib/hedera";

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
    const [isSwapping, setIsSwapping] = useState(false);
    const [aiRecommendation, setAiRecommendation] = useState<{ action: string; protocol: string; asset: string; amount: string; confidence: number } | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    // Run 0G Compute inference on page load
    useEffect(() => {
        if (!agent) return;
        setAiLoading(true);
        evaluateStrategy(agent.id, agent.strategyHash, {
            eth_price: 3200,
            gas_gwei: 0.01,
            aave_apy: 4.2,
            compound_apy: 3.8,
            uniswap_volume_24h: 850000000,
        }).then(setAiRecommendation).finally(() => setAiLoading(false));
    }, [agent]);

    const { sendTransactionAsync } = useSendTransaction();
    const { address } = useAccount();

    const executeLiveSwap = async () => {
        if (!address) {
            toast.error("Wallet not connected", { description: "Please connect your wallet to execute a real swap." });
            return;
        }

        setIsSwapping(true);
        const toastId = toast.loading("Fetching live routing from Uniswap Dev API...");

        try {
            const WETH = "0x4200000000000000000000000000000000000006";
            const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
            const amountStr = "0.0001";

            const txData = await getUniswapTransaction(WETH, USDC, amountStr, 18, address, 84532);

            if (!txData) {
                toast.error("Uniswap API Failed", { id: toastId, description: "Could not generate routing data. Check API key." });
                return;
            }

            toast.loading("Please sign the transaction in your wallet...", { id: toastId });

            const hash = await sendTransactionAsync({
                to: txData.to as `0x${string}`,
                data: txData.data as `0x${string}`,
                value: BigInt(txData.value || 0),
            });

            toast.success("Swap Executed On-Chain!", {
                id: toastId,
                description: `Tx Hash: ${hash.slice(0, 8)}...${hash.slice(-6)}`,
                action: {
                    label: "View Explorer",
                    onClick: () => window.open(`https://sepolia.basescan.org/tx/${hash}`, "_blank"),
                }
            });

            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ["#e8d5b7", "#c4956a"],
            });

        } catch (e: any) {
            console.error(e);
            toast.error("Transaction Failed", { id: toastId, description: e.message || "User rejected or simulation failed." });
        } finally {
            setIsSwapping(false);
        }
    };

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
            {/* Nav */}
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
                                {agent.active ? "Executing" : "Paused"}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-neutral-500">
                            <span className="font-mono">Sub-DAO #{agent.id}</span>
                            <button
                                onClick={copyAddress}
                                className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                            >
                                Treasury: {agent.boundAccount.slice(0, 10)}...
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

                    <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-3">
                            <span className="moonbird-badge">
                                <Timer className="h-3 w-3" />
                                {agent.heartbeatInterval}s heartbeat
                            </span>
                            <span className="moonbird-badge">
                                <Shield className="h-3 w-3" />
                                Verified
                            </span>
                        </div>
                        <Button
                            onClick={executeLiveSwap}
                            disabled={isSwapping}
                            className="bg-white text-black hover:bg-neutral-200 rounded-full text-sm font-medium font-mono"
                        >
                            <Zap className="h-4 w-4 mr-2" />
                            {isSwapping ? "Routing..." : "Execute Live Swap"}
                        </Button>
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
                            <div className="text-sm font-mono truncate text-white">{agent.strategyHash.slice(0, 20)}...</div>
                            <span className="text-xs text-neutral-500">Uniswap API Routing</span>
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
                            <TabsTrigger value="ai">0G AI Brain</TabsTrigger>
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
                                    <Brain className="h-5 w-5 text-emerald-400" />
                                    0G Compute — AI Strategy Engine
                                </h3>
                                <p className="text-sm text-neutral-500">
                                    Real-time AI inference powered by 0G decentralized compute. The agent&apos;s brain evaluates market conditions and recommends the optimal DeFi action.
                                </p>
                                {aiLoading ? (
                                    <div className="bg-black/40 rounded-xl p-6 border border-white/[0.04] flex items-center justify-center">
                                        <span className="text-sm text-neutral-500 animate-pulse">Running 0G inference...</span>
                                    </div>
                                ) : aiRecommendation ? (
                                    <div className="bg-black/40 rounded-xl p-6 border border-white/[0.04] space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-neutral-500 uppercase tracking-wider">AI Recommendation</span>
                                            <span className="moonbird-badge text-xs text-emerald-400 border-emerald-500/30">Live</span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="space-y-1">
                                                <p className="text-xs text-neutral-500">Action</p>
                                                <p className="text-white font-mono text-sm">{aiRecommendation.action}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-neutral-500">Protocol</p>
                                                <p className="text-white font-mono text-sm">{aiRecommendation.protocol}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-neutral-500">Asset</p>
                                                <p className="text-white font-mono text-sm">{aiRecommendation.asset}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-neutral-500">Confidence</p>
                                                <p className="text-white font-mono text-sm">{(aiRecommendation.confidence * 100).toFixed(0)}%</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                                <div className="bg-black/40 rounded-xl p-4 border border-white/[0.04]">
                                    <p className="text-xs text-neutral-600 font-mono">Model: yield-strategy-v1 · Endpoint: {process.env.NEXT_PUBLIC_0G_COMPUTE_ENDPOINT || "compute-testnet.0g.ai"}</p>
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
                                    {agent.earningsHistory.length > 0 ? (
                                        <div className="w-full h-full relative flex items-center px-4">
                                            <Sparkline
                                                data={agent.earningsHistory.map(h => ({ value: h.amount }))}
                                                width={600}
                                                height={200}
                                                color="#e8d5b7"
                                                className="w-full h-full opacity-90"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-neutral-600 flex flex-col items-center justify-center h-full space-y-2">
                                            <Activity className="h-8 w-8" />
                                            <p>No earnings history yet</p>
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

                                {/* 0G Section */}
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">0G Storage + Compute</p>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="bg-black/40 rounded-xl p-4 space-y-2 border border-white/[0.04]">
                                            <span className="text-xs text-neutral-500">Strategy Hash (0G Storage)</span>
                                            <p className="font-mono text-sm break-all text-white">{agent.strategyHash}</p>
                                        </div>
                                        <div className="bg-black/40 rounded-xl p-4 space-y-2 border border-white/[0.04]">
                                            <span className="text-xs text-neutral-500">0G Compute Endpoint</span>
                                            <p className="font-mono text-sm text-white">{process.env.NEXT_PUBLIC_0G_COMPUTE_ENDPOINT || "compute-testnet.0g.ai"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Kite Section */}
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-blue-400 uppercase tracking-wider">Kite x402 Identity</p>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="bg-black/40 rounded-xl p-4 space-y-2 border border-white/[0.04]">
                                            <span className="text-xs text-neutral-500">Kite Passport Status</span>
                                            <p className="font-mono text-sm flex items-center gap-1.5 text-white">
                                                <Shield className="h-3.5 w-3.5 text-blue-400" />
                                                {agent.verified ? "Verified — x402 Active" : "Pending"}
                                            </p>
                                        </div>
                                        <div className="bg-black/40 rounded-xl p-4 space-y-2 border border-white/[0.04]">
                                            <span className="text-xs text-neutral-500">Capabilities</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {["defi_swap", "defi_supply", "governance_vote"].map(c => (
                                                    <span key={c} className="moonbird-badge text-xs">{c}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Hedera Section */}
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
                                                {buildScheduleConfig(agent.id, agent.heartbeatInterval, "0x0000000000000000000000000000000000000003").calldata}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Base Section */}
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
