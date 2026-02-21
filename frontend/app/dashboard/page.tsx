"use client";

import Link from "next/link";
import { useAllAgents } from "@/hooks/useAgent";
import { useLiveActions } from "@/hooks/useLiveActions";
import { LiveActivityFeed } from "@/components/LiveActivityFeed";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Activity,
    Landmark,
    Vote,
    Users,
    CheckCircle2,
    XCircle,
    TerminalSquare,
    ExternalLink,
    ArrowRight,
    Bot,
    TrendingUp,
    Rocket,
    Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { motion, type Variants } from "framer-motion";
import { fetchProposals, fetchTreasuryBalance, NounsProposal } from "@/lib/nounsBuilder";

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

export default function DashboardPage() {
    const { agents, loading: agentsLoading, stats } = useAllAgents();
    const { actions, isConnected, onNewAction } = useLiveActions();
    const [proposals, setProposals] = useState<NounsProposal[]>([]);
    const [treasury, setTreasury] = useState<number>(0);

    useEffect(() => {
        fetchProposals().then(setProposals).catch(() => {});
        fetchTreasuryBalance().then(setTreasury).catch(() => {});
    }, []);

    useEffect(() => {
        onNewAction((action) => {
            toast.success(`DAO Execution: ${action.actionLabel}`, {
                description: `Optimal Route via Uniswap API ${action.profit ? `(+${action.profit} ETH)` : ""}`,
                duration: 4000,
            });

            if (Number(action.profit) > 2.0) {
                confetti({
                    particleCount: 50,
                    spread: 80,
                    origin: { y: 0.9 },
                    colors: ["#e8d5b7", "#c4956a", "#ffffff"],
                });
            }
        });
    }, [onNewAction]);

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
                            <Link href="/dashboard" className="nav-link active">Dashboard</Link>
                            <Link href="/deploy" className="nav-link">Deploy</Link>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="moonbird-badge">
                            <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-neutral-600"}`} />
                            {isConnected ? "Live" : "Connecting"}
                        </div>
                        <Link href="/deploy">
                            <Button size="sm" className="bg-white text-black hover:bg-neutral-200 rounded-full h-9 px-5 text-sm font-medium">
                                <Rocket className="h-3.5 w-3.5 mr-1.5" /> Deploy
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
                {/* Protocol Stats */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    <motion.div variants={itemVariants}>
                        <div className="collection-card p-6">
                            <div className="flex items-center gap-2 text-neutral-500 mb-3">
                                <Bot className="h-4 w-4" />
                                <span className="text-xs uppercase tracking-wider font-medium">Total Agents</span>
                            </div>
                            <div className="text-3xl font-mono text-white">{stats.totalAgents}</div>
                            <span className="text-xs text-neutral-500 mt-1 block">Minted on Base Sepolia</span>
                        </div>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <div className="collection-card p-6">
                            <div className="flex items-center gap-2 text-neutral-500 mb-3">
                                <Landmark className="h-4 w-4" />
                                <span className="text-xs uppercase tracking-wider font-medium">Builder Treasury</span>
                            </div>
                            <div className="text-3xl font-mono text-white">{treasury.toFixed(2)}</div>
                            <span className="text-xs text-neutral-500 mt-1 block">ETH controlled by DAO</span>
                        </div>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <div className="collection-card p-6">
                            <div className="flex items-center gap-2 text-neutral-500 mb-3">
                                <TrendingUp className="h-4 w-4" />
                                <span className="text-xs uppercase tracking-wider font-medium">Total Earnings</span>
                            </div>
                            <div className="text-3xl font-mono text-white">{stats.totalEarnings.toFixed(4)}</div>
                            <span className="text-xs text-neutral-500 mt-1 block">ETH earned by agents</span>
                        </div>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <div className="collection-card p-6">
                            <div className="flex items-center gap-2 text-neutral-500 mb-3">
                                <Activity className="h-4 w-4" />
                                <span className="text-xs uppercase tracking-wider font-medium">Live Actions</span>
                            </div>
                            <div className="text-3xl font-mono text-white">{actions.length}</div>
                            <span className="text-xs text-neutral-500 mt-1 block">Hedera + Base combined</span>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Agents Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="space-y-6"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl mb-1">Your Agents</h2>
                            <p className="text-sm text-neutral-500">On-chain autonomous agents with iNFT identity</p>
                        </div>
                        <Link href="/deploy">
                            <Button className="bg-white text-black hover:bg-neutral-200 rounded-full text-sm font-medium">
                                <Rocket className="w-4 h-4 mr-2" />
                                Deploy New Agent
                            </Button>
                        </Link>
                    </div>

                    {agentsLoading ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="collection-card p-6 animate-pulse space-y-4">
                                    <div className="h-6 bg-white/5 rounded w-32" />
                                    <div className="h-4 bg-white/5 rounded w-48" />
                                    <div className="h-10 bg-white/5 rounded w-24" />
                                </div>
                            ))}
                        </div>
                    ) : agents.length === 0 ? (
                        <div className="collection-card p-12 text-center space-y-4">
                            <Bot className="h-10 w-10 mx-auto text-neutral-600" />
                            <div className="space-y-2">
                                <h3 className="text-lg font-medium text-neutral-400">No agents deployed yet</h3>
                                <p className="text-sm text-neutral-600 max-w-sm mx-auto">
                                    Deploy your first autonomous AI agent to start earning yield on-chain.
                                </p>
                            </div>
                            <Link href="/deploy">
                                <Button className="bg-white text-black hover:bg-neutral-200 rounded-full">
                                    <Rocket className="h-4 w-4 mr-2" /> Deploy First Agent
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {agents.map((agent) => (
                                <Link key={agent.id} href={`/agents/${agent.id}`}>
                                    <div className="collection-card p-6 space-y-4 hover:border-white/[0.15] transition-all cursor-pointer group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-2.5 w-2.5 rounded-full ${agent.active ? "bg-emerald-400 animate-pulse" : "bg-neutral-600"}`} />
                                                <h3 className="text-lg font-semibold text-white group-hover:text-white/90">{agent.name}</h3>
                                            </div>
                                            <span className="moonbird-badge text-[10px]">#{agent.id}</span>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="moonbird-badge text-[10px]">{agent.strategyHash}</span>
                                            <span className="moonbird-badge text-[10px]">{agent.heartbeatInterval}s</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/[0.06]">
                                            <div>
                                                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Earnings</p>
                                                <p className="text-lg font-mono text-white">{agent.totalEarnings.toFixed(4)}</p>
                                                <p className="text-[10px] text-neutral-600">ETH</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Actions</p>
                                                <p className="text-lg font-mono text-white">{agent.totalActions}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <span className="text-[10px] text-neutral-600 font-mono">
                                                TBA: {agent.boundAccount.slice(0, 8)}...{agent.boundAccount.slice(-4)}
                                            </span>
                                            <ArrowRight className="h-3.5 w-3.5 text-neutral-600 group-hover:text-white transition-colors" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Proposals + Live Feed */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="grid lg:grid-cols-3 gap-8"
                >
                    {/* Nouns Builder Proposals */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl mb-1">DAO Proposals</h2>
                                <p className="text-sm text-neutral-500">Nouns Builder governed agent strategies</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {proposals.length === 0 ? (
                                <div className="collection-card p-12 text-center space-y-4">
                                    <Vote className="h-8 w-8 mx-auto text-neutral-600" />
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-medium text-neutral-400">No active proposals</h3>
                                        <p className="text-sm text-neutral-600 max-w-sm mx-auto">
                                            Proposals from the Nouns Builder DAO will appear here.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                proposals.map((prop) => (
                                    <div
                                        key={prop.id}
                                        className="collection-card p-6"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-mono text-neutral-600">{prop.id}</span>
                                                    <span className={`moonbird-badge ${prop.state === "Active" ? "text-emerald-400 border-emerald-500/30" : ""}`}>
                                                        {prop.state}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-sans font-semibold text-white">{prop.title}</h3>
                                                <p className="text-sm text-neutral-500 max-w-xl">{prop.description}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                                            <div className="flex justify-between text-sm">
                                                <div className="flex items-center gap-1.5 text-emerald-400">
                                                    <CheckCircle2 className="w-4 h-4" /> For: {(prop.forVotes / 1000000).toFixed(1)}M
                                                </div>
                                                <div className="flex items-center gap-1.5 text-rose-400">
                                                    <XCircle className="w-4 h-4" /> Against: {(prop.againstVotes / 1000000).toFixed(1)}M
                                                </div>
                                            </div>
                                            <Progress
                                                value={(prop.forVotes / (prop.forVotes + prop.againstVotes)) * 100 || 0}
                                                className="h-1.5 bg-rose-500/20"
                                            />
                                            <div className="flex items-center justify-between pt-1">
                                                <a
                                                    href={prop.daoAddress ? `https://nouns.build/dao/base/${prop.daoAddress}/${prop.proposalHash}` : "#"}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-[10px] text-neutral-600 hover:text-white transition-colors"
                                                >
                                                    Verify on nouns.build <ExternalLink className="h-2.5 w-2.5" />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Live Activity Feed */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl">Observer</h2>
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-neutral-400" />
                            </div>
                        </div>
                        <div className="collection-card overflow-hidden">
                            <div className="px-6 py-4 border-b border-white/[0.06]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-neutral-400" />
                                        <span className="text-sm font-medium">Live Actions</span>
                                    </div>
                                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                </div>
                            </div>
                            <div className="p-0">
                                <LiveActivityFeed
                                    actions={actions}
                                    isConnected={isConnected}
                                    maxHeight="650px"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
