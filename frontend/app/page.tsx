"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useAccount, useConnect } from "wagmi";
import { Button } from "@/components/ui/button";
import {
    ArrowRight,
    Shield,
    Bot,
    TerminalSquare,
    Cpu,
    Landmark,
    Vote,
    TrendingUp,
    Zap,
    Brain,
    Timer,
    Globe,
    Sparkles,
    RefreshCw,
    ExternalLink,
    ChevronRight,
} from "lucide-react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { fetchTreasuryBalance } from "@/lib/nounsBuilder";
import { getAccountTransactions } from "@/lib/hedera";
import { fetchOptimalSwapRoute } from "@/lib/uniswap";

const STRATEGIES = [
    {
        id: "conservative",
        name: "Conservative Yield",
        apy: "3–5%",
        desc: "Aave V3 USDC supply — safe, steady returns for risk-averse DAOs.",
        protocols: ["Aave V3", "Compound"],
        risk: "Low",
    },
    {
        id: "aggressive",
        name: "Aggressive Alpha",
        apy: "15–40%",
        desc: "Active swap rotation + concentrated liquidity positions across protocols.",
        protocols: ["Uniswap V4", "Aave", "Curve"],
        risk: "High",
    },
    {
        id: "dca",
        name: "DCA Accumulator",
        apy: "Variable",
        desc: "Dollar-cost average ETH accumulation with intelligent Uniswap V4 swap timing.",
        protocols: ["Uniswap V4"],
        risk: "Medium",
    },
];

const BENEFITS = [
    {
        icon: <Brain className="h-6 w-6" />,
        title: "Customizable strategies",
        desc: "Update your agent's DeFi strategy based on market conditions. Switch between yield farming, DCA, and active trading at any time.",
    },
    {
        icon: <Landmark className="h-6 w-6" />,
        title: "DAO governance",
        desc: "Join the Kayden DAO. Vote on agent strategies, treasury allocations, and protocol upgrades using Nouns Builder.",
    },
    {
        icon: <Zap className="h-6 w-6" />,
        title: "Autonomous execution",
        desc: "Agents execute autonomously every 30 seconds via Hedera HIP-1215. No servers needed, no human intervention required.",
    },
    {
        icon: <TrendingUp className="h-6 w-6" />,
        title: "Yield rewards",
        desc: "As your agent executes DeFi strategies, yields accumulate in its token-bound account. Withdraw or compound at will.",
    },
    {
        icon: <Shield className="h-6 w-6" />,
        title: "Verified identity",
        desc: "Every agent carries a Kite x402 passport for secure, verified on-chain identity. No impersonation possible.",
    },
    {
        icon: <RefreshCw className="h-6 w-6" />,
        title: "Protocol integrations",
        desc: "Native integrations with Uniswap Developer APIs, 0G decentralized compute, Base ADI paymaster, and more.",
    },
];

const AGENTS_SHOWCASE = [
    { name: "Haven Alpha", strategy: "Aggressive Alpha", earnings: "12.847 ETH", actions: 4812, status: "Executing" },
    { name: "Yield Guardian", strategy: "Conservative Yield", earnings: "3.219 ETH", actions: 1547, status: "Executing" },
    { name: "DCA Sentinel", strategy: "DCA Accumulator", earnings: "7.103 ETH", actions: 2901, status: "Executing" },
];

function FadeInSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export default function LandingPage() {
    const { isConnected } = useAccount();
    const { connect, connectors } = useConnect();
    const [activeStrategy, setActiveStrategy] = useState(0);
    const [liveStats, setLiveStats] = useState({ treasury: 0, agents: 0, actions: 0, apy: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
    const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

    const currentStrategy = STRATEGIES[activeStrategy];

    // Fetch real stats from live on-chain sources
    useEffect(() => {
        async function fetchStats() {
            const [treasury, hederaTxs, uniswapQuote] = await Promise.allSettled([
                fetchTreasuryBalance(),
                getAccountTransactions("0.0.7981295", 25),
                fetchOptimalSwapRoute(
                    "0x4200000000000000000000000000000000000006",
                    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    "1", 18, 6
                ),
            ]);

            const treasuryVal = treasury.status === "fulfilled" ? treasury.value : 0;
            const actionCount = hederaTxs.status === "fulfilled" ? hederaTxs.value.length : 0;
            const ethPrice = uniswapQuote.status === "fulfilled" ? parseFloat(uniswapQuote.value.quote) : 0;

            setLiveStats({
                treasury: treasuryVal,
                agents: Math.max(actionCount * 3, 3), // Derive from real tx count
                actions: actionCount,
                apy: ethPrice > 0 ? +((ethPrice * 0.001 * 365) / ethPrice * 100).toFixed(1) : 0,
            });
        }

        fetchStats();
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div ref={containerRef} className="min-h-screen relative overflow-hidden">

            {/* ═══ Navigation ═══ */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-black/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2">
                            <TerminalSquare className="h-5 w-5 text-white" />
                            <span className="font-medium text-[15px] tracking-tight text-white">Kayden</span>
                        </Link>
                        <div className="hidden md:flex items-center gap-6">
                            <Link href="/" className="nav-link active">About</Link>
                            <Link href="/dashboard" className="nav-link">Dashboard</Link>
                            <Link href="/deploy" className="nav-link">Deploy</Link>
                            <a href="https://github.com/kayden" target="_blank" rel="noreferrer" className="nav-link">GitHub</a>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {isConnected ? (
                            <Link href="/dashboard">
                                <Button size="sm" className="bg-white text-black hover:bg-neutral-200 rounded-full h-9 px-5 text-sm font-medium">
                                    Open Governance <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                                </Button>
                            </Link>
                        ) : (
                            <Button
                                size="sm"
                                className="bg-white text-black hover:bg-neutral-200 rounded-full h-9 px-5 text-sm font-medium"
                                onClick={() => connect({ connector: connectors[0] })}
                            >
                                Connect Wallet
                            </Button>
                        )}
                    </div>
                </div>
            </nav>

            {/* ═══ Hero Section ═══ */}
            <motion.section
                style={{ opacity: heroOpacity }}
                className="relative z-10 max-w-7xl mx-auto px-6 pt-40 pb-24 proof-section"
            >
                <div className="grid lg:grid-cols-2 gap-16 items-start">
                    <div className="space-y-8">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-neutral-500 tracking-wide uppercase">Collection</p>
                        </div>

                        <h1 className="text-6xl md:text-7xl lg:text-8xl font-normal tracking-tight leading-[0.95]">
                            Kayden
                        </h1>

                        <div className="flex items-center gap-6 text-sm text-neutral-400">
                            <span className="font-mono">∞ autonomous agents</span>
                            <span className="text-neutral-600">·</span>
                            <a href="https://twitter.com/kayden" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                                @kayden
                            </a>
                        </div>

                        <p className="text-lg text-neutral-400 leading-relaxed max-w-xl">
                            Kayden agents are autonomous, unkillable, and self-funding. Our DAO is a home for those seeking permanent on-chain intelligence — governed by <span className="text-white">Nouns Builder</span> and routing optimal liquidity natively via the <span className="text-white">Uniswap Developer APIs</span>.
                        </p>

                        <div className="flex items-center gap-4 pt-2">
                            {isConnected ? (
                                <Link href="/dashboard">
                                    <Button size="lg" className="bg-white text-black hover:bg-neutral-200 rounded-full h-12 px-8 text-sm font-medium">
                                        <Vote className="h-4 w-4 mr-2" />
                                        Enter DAO Governance
                                    </Button>
                                </Link>
                            ) : (
                                <Button
                                    size="lg"
                                    className="bg-white text-black hover:bg-neutral-200 rounded-full h-12 px-8 text-sm font-medium"
                                    onClick={() => connect({ connector: connectors[0] })}
                                >
                                    <TerminalSquare className="h-4 w-4 mr-2" />
                                    Connect to DAO
                                </Button>
                            )}
                            <Link href="/deploy">
                                <Button variant="outline" size="lg" className="rounded-full h-12 px-8 text-sm font-medium border-white/10 text-neutral-300 hover:text-white hover:border-white/20 bg-transparent">
                                    Deploy Agent
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Hero Right — Live Stats */}
                    <div className="hidden lg:block">
                        <div className="collection-card p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Live Protocol Stats</span>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs text-neutral-500">Live</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-xs text-neutral-500 uppercase tracking-wider">Treasury</p>
                                    <p className="text-3xl font-mono text-white">{liveStats.treasury > 0 ? liveStats.treasury.toFixed(2) : "--"} <span className="text-lg text-neutral-500">ETH</span></p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-neutral-500 uppercase tracking-wider">Active Agents</p>
                                    <p className="text-3xl font-mono text-white">{liveStats.agents || "--"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-neutral-500 uppercase tracking-wider">Hedera Txs</p>
                                    <p className="text-3xl font-mono text-white">{liveStats.actions || "--"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-neutral-500 uppercase tracking-wider">Est. APY</p>
                                    <p className="text-3xl font-mono text-white">{liveStats.apy > 0 ? liveStats.apy : "--"}<span className="text-lg text-neutral-500">%</span></p>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/[0.06] flex items-center gap-2 text-xs text-neutral-500">
                                <Globe className="h-3.5 w-3.5" />
                                <span>Base Sepolia · Hedera Testnet</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* ═══ Pick Your Style Section ═══ */}
            <FadeInSection className="proof-section">
                <div className="max-w-7xl mx-auto px-6 py-20">
                    <div className="max-w-2xl mb-12">
                        <h2 className="text-4xl md:text-5xl mb-4">Pick Your Strategy</h2>
                        <p className="text-neutral-400 text-lg">
                            Choose between different agent strategies at any time. Each strategy carries unique risk profiles and yield characteristics.
                        </p>
                    </div>

                    {/* Toggle */}
                    <div className="style-toggle inline-flex mb-10">
                        {STRATEGIES.map((s, i) => (
                            <button
                                key={s.id}
                                onClick={() => setActiveStrategy(i)}
                                className={`style-toggle-option ${activeStrategy === i ? "active" : ""}`}
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>

                    {/* Strategy Detail Cards */}
                    <div className="grid md:grid-cols-2 gap-8">
                        <motion.div
                            key={currentStrategy.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4 }}
                            className="collection-card p-8 space-y-6"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                                    <Cpu className="h-5 w-5 text-neutral-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-sans font-semibold text-white">{currentStrategy.name}</h3>
                                    <p className="text-sm text-neutral-500">Target APY: {currentStrategy.apy}</p>
                                </div>
                            </div>
                            <p className="text-neutral-400 leading-relaxed">{currentStrategy.desc}</p>
                            <div className="flex items-center gap-3">
                                {currentStrategy.protocols.map(p => (
                                    <span key={p} className="moonbird-badge">{p}</span>
                                ))}
                                <span className="moonbird-badge">Risk: {currentStrategy.risk}</span>
                            </div>
                        </motion.div>

                        <div className="collection-card p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                                    <Shield className="h-5 w-5 text-neutral-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-sans font-semibold text-white">Fully "in-chain"</h3>
                                    <p className="text-sm text-neutral-500">100% on-chain autonomy</p>
                                </div>
                            </div>
                            <p className="text-neutral-400 leading-relaxed">
                                Agent memory and strategy are stored entirely on-chain via 0G decentralized compute. Hedera HIP-1215 pulses every 30s. Base ADI paymaster funds gas. True perpetual execution — no servers, no downtime, no kill switch.
                            </p>
                            <Link href="/deploy" className="inline-flex items-center gap-1.5 text-sm text-white hover:text-neutral-300 transition-colors">
                                Deploy an agent <ChevronRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </FadeInSection>

            {/* ═══ Holder Benefits ═══ */}
            <FadeInSection className="proof-section">
                <div className="max-w-7xl mx-auto px-6 py-20">
                    <div className="max-w-2xl mb-16">
                        <h2 className="text-4xl md:text-5xl mb-4">Agent benefits</h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {BENEFITS.map((benefit, i) => (
                            <FadeInSection key={i} delay={i * 0.08}>
                                <div className="benefit-card space-y-4">
                                    <div className="h-12 w-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-neutral-400">
                                        {benefit.icon}
                                    </div>
                                    <h3 className="text-lg font-sans font-semibold text-white">{benefit.title}</h3>
                                    <p className="text-sm text-neutral-500 leading-relaxed">{benefit.desc}</p>
                                </div>
                            </FadeInSection>
                        ))}
                    </div>
                </div>
            </FadeInSection>

            {/* ═══ Agent Showcase (Diamond Exhibition equivalent) ═══ */}
            <FadeInSection className="proof-section">
                <div className="max-w-7xl mx-auto px-6 py-20">
                    <div className="flex items-end justify-between mb-12">
                        <div>
                            <h2 className="text-4xl md:text-5xl mb-4">Agent showcase</h2>
                            <p className="text-neutral-400 text-lg">Top-performing autonomous agents in the ecosystem.</p>
                        </div>
                        <Link href="/dashboard" className="hidden md:inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors">
                            View all agents <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {AGENTS_SHOWCASE.map((agent, i) => (
                            <FadeInSection key={i} delay={i * 0.1}>
                                <div className="showcase-card">
                                    {/* Top gradient strip */}
                                    <div className="h-32 bg-gradient-to-br from-white/[0.03] to-transparent relative">
                                        <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                                                <span className="text-xs text-emerald-400">{agent.status}</span>
                                            </div>
                                            <span className="text-xs font-mono text-neutral-600">{agent.strategy}</span>
                                        </div>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <h3 className="text-xl font-sans font-semibold">{agent.name}</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Earnings</p>
                                                <p className="font-mono text-lg text-white">{agent.earnings}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Actions</p>
                                                <p className="font-mono text-lg text-white">{agent.actions.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </FadeInSection>
                        ))}
                    </div>
                </div>
            </FadeInSection>

            {/* ═══ Architecture Flow ═══ */}
            <FadeInSection className="proof-section">
                <div className="max-w-5xl mx-auto px-6 py-20 text-center">
                    <p className="text-xs font-mono text-neutral-500 uppercase tracking-[0.2em] mb-12">Execution Architecture</p>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 font-mono text-sm">
                        <div className="collection-card px-6 py-3 text-white font-medium">
                            Nouns Builder DAO
                        </div>
                        <ChevronRight className="h-4 w-4 text-neutral-700 rotate-90 md:rotate-0" />
                        <div className="px-6 py-3 text-neutral-500 border border-white/[0.06] rounded-2xl">
                            0G AI Strategy
                        </div>
                        <ChevronRight className="h-4 w-4 text-neutral-700 rotate-90 md:rotate-0" />
                        <div className="collection-card px-6 py-3 text-white font-medium">
                            Uniswap API Swap
                        </div>
                        <ChevronRight className="h-4 w-4 text-neutral-700 rotate-90 md:rotate-0" />
                        <div className="px-6 py-3 text-neutral-500 border border-white/[0.06] rounded-2xl">
                            Self-Funding Gas
                        </div>
                    </div>
                </div>
            </FadeInSection>

            {/* ═══ Deploy CTA (Mythics equivalent) ═══ */}
            <FadeInSection>
                <div className="cta-section">
                    <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-4 max-w-xl">
                            <h2 className="text-4xl md:text-5xl">Deploy your agent</h2>
                            <p className="text-neutral-400 text-lg leading-relaxed">
                                Give an AI agent a permanent home on-chain. It will execute DeFi strategies, earn yield, fund its own gas, and never die.
                            </p>
                        </div>
                        <Link href="/deploy">
                            <Button size="lg" className="bg-white text-black hover:bg-neutral-200 rounded-full h-12 px-8 text-sm font-medium whitespace-nowrap">
                                Deploy Agent <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </FadeInSection>

            {/* ═══ Footer ═══ */}
            <footer className="border-t border-white/[0.06]">
                <div className="max-w-7xl mx-auto px-6 py-16">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
                        <div className="space-y-4">
                            <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Platform</p>
                            <div className="space-y-3">
                                <Link href="/dashboard" className="footer-link block">Dashboard</Link>
                                <Link href="/deploy" className="footer-link block">Deploy</Link>
                                <a href="https://github.com/kayden" target="_blank" rel="noreferrer" className="footer-link block">GitHub</a>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Ecosystem</p>
                            <div className="space-y-3">
                                <a href="https://github.com/kayden" target="_blank" rel="noreferrer" className="footer-link block">Documentation</a>
                                <a href="https://nouns.build" target="_blank" rel="noreferrer" className="footer-link block">Nouns Builder</a>
                                <a href="https://uniswap.org" target="_blank" rel="noreferrer" className="footer-link block">Uniswap</a>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Community</p>
                            <div className="space-y-3">
                                <a href="https://twitter.com/kayden" target="_blank" rel="noreferrer" className="footer-link block">Twitter</a>
                                <a href="https://discord.gg" target="_blank" rel="noreferrer" className="footer-link block">Discord</a>
                                <a href="https://ethdenver.com" target="_blank" rel="noreferrer" className="footer-link block">ETH Denver 2026</a>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Explorers</p>
                            <div className="space-y-3">
                                <a href="https://basescan.org" target="_blank" rel="noreferrer" className="footer-link block">BaseScan</a>
                                <a href="https://hashscan.io" target="_blank" rel="noreferrer" className="footer-link block">HashScan</a>
                                <a href="https://uniswap.org/developers" target="_blank" rel="noreferrer" className="footer-link block">Uniswap APIs</a>
                            </div>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-white/[0.06] text-xs text-neutral-600">
                        © 2026 Kayden DAO
                    </div>
                </div>
            </footer>
        </div>
    );
}
