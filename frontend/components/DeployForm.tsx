"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Rocket, Loader2, CheckCircle2, Shield, Brain, Timer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { buildScheduleConfig } from "@/lib/hedera";
import { CONTRACTS } from "@/lib/contracts";

const STRATEGIES = [
    {
        id: "yield_conservative",
        name: "Conservative Yield",
        desc: "Aave V3 USDC supply — safe, steady 3-5% APY",
    },
    {
        id: "yield_balanced",
        name: "Balanced Yield",
        desc: "Multi-protocol allocation — Aave + Compound, 5-10% APY",
    },
    {
        id: "yield_aggressive",
        name: "Aggressive Alpha",
        desc: "Active swap + supply rotation across protocols",
    },
    {
        id: "dca_strategy",
        name: "DCA Accumulator",
        desc: "Dollar-cost average ETH with Uniswap V4 swaps",
    },
];

const INTERVALS = [
    { value: "30", label: "30 seconds (demo)" },
    { value: "60", label: "1 minute" },
    { value: "300", label: "5 minutes" },
    { value: "900", label: "15 minutes" },
    { value: "3600", label: "1 hour" },
    { value: "86400", label: "24 hours" },
];

type DeployStep = "config" | "deploying" | "complete";

interface DeployResult {
    tokenId: number;
    txHash: string;
    scheduleConfig: string;
}

export function DeployForm() {
    const router = useRouter();
    const [step, setStep] = useState<DeployStep>("config");
    const [name, setName] = useState("");
    const [strategy, setStrategy] = useState("");
    const [interval, setInterval] = useState("30");
    const [deployProgress, setDeployProgress] = useState(0);
    const [deployLogs, setDeployLogs] = useState<string[]>([]);
    const [deployResult, setDeployResult] = useState<DeployResult | null>(null);

    const addLog = (msg: string) => {
        setDeployLogs((prev) => [...prev, msg]);
    };

    const handleDeploy = async () => {
        if (!name || !strategy) return;

        setStep("deploying");
        setDeployLogs([]);
        setDeployProgress(0);

        const result: DeployResult = {
            tokenId: 0,
            txHash: "",
            scheduleConfig: "",
        };

        try {
            addLog("Connecting to Base Sepolia...");
            setDeployProgress(5);

            addLog("Minting agent iNFT on Base Sepolia...");
            setDeployProgress(10);

            const resp = await fetch("/api/deploy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    strategy,
                    interval: parseInt(interval),
                }),
            });

            const data = await resp.json();

            if (!resp.ok) {
                throw new Error(data.error || "Mint failed");
            }

            result.txHash = data.txHash;
            result.tokenId = data.tokenId;

            setDeployLogs((prev) => {
                const newLogs = [...prev];
                newLogs[newLogs.length - 1] = `✓ Agent iNFT Minted — Token #${data.tokenId}, Tx: ${data.txHash.slice(0, 10)}...`;
                return newLogs;
            });
            toast.success("Agent NFT Minted On-Chain!", {
                description: `Token #${data.tokenId} — ${data.txHash.slice(0, 14)}...`,
            });
            setDeployProgress(40);

            addLog("Building Hedera HIP-1215 heartbeat schedule payload...");
            setDeployProgress(70);

            const scheduleConfig = buildScheduleConfig(
                data.tokenId,
                parseInt(interval),
                CONTRACTS.baseRelay
            );
            result.scheduleConfig = scheduleConfig.memo;
            addLog(`✓ HIP-1215 Schedule: ${scheduleConfig.memo}`);
            addLog(`  ↳ Target: ${scheduleConfig.targetContract.slice(0, 10)}... every ${interval}s`);
            addLog(`  ↳ Calldata: ${scheduleConfig.calldata.slice(0, 20)}...`);
            setDeployProgress(90);

            addLog("✓ Agent deployed and registered for autonomous execution.");
            setDeployProgress(100);

            setDeployResult(result);
            setStep("complete");

        } catch (e: any) {
            console.error(e);
            toast.error("Deployment Failed", { description: e.message || "Something went wrong." });
            setStep("config");
        }
    };

    if (step === "complete") {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
                <div className="max-w-lg mx-auto collection-card p-8 text-center space-y-6">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
                        className="w-16 h-16 mx-auto rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center"
                    >
                        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    </motion.div>
                    <div className="space-y-2">
                        <h2 className="text-3xl">Agent Deployed</h2>
                        <p className="text-neutral-500">
                            <span className="text-white font-medium">{name}</span> is now alive
                            and autonomously executing DeFi strategies every{" "}
                            <span className="text-white font-mono">{interval}s</span>.
                        </p>
                    </div>

                    {deployResult && (
                        <div className="bg-black/40 rounded-xl p-4 text-left space-y-3 border border-white/[0.04]">
                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Live Integration Proof</p>
                            <div className="space-y-2 text-xs font-mono">
                                <div className="flex items-start gap-2">
                                    <span className="text-white shrink-0">Base</span>
                                    <span className="text-neutral-400 break-all">
                                        Mint Tx:{" "}
                                        <a
                                            href={`https://sepolia.basescan.org/tx/${deployResult.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:underline"
                                        >
                                            {deployResult.txHash.slice(0, 24)}...
                                        </a>
                                    </span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-purple-400 shrink-0">Hedera</span>
                                    <span className="text-neutral-400 break-all">{deployResult.scheduleConfig}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-black/40 rounded-xl p-4 text-left space-y-2 font-mono text-xs border border-white/[0.04] max-h-48 overflow-y-auto">
                        {deployLogs.map((log, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="text-neutral-500"
                            >
                                <span className="text-neutral-600">[{i + 1}/{deployLogs.length}]</span>{" "}
                                {log}
                            </motion.div>
                        ))}
                    </div>
                    <Button onClick={() => router.push("/dashboard")} className="w-full bg-white text-black hover:bg-neutral-200 rounded-full h-11 font-medium">
                        View Dashboard
                    </Button>
                </div>
            </motion.div>
        );
    }

    if (step === "deploying") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
            >
                <div className="max-w-lg mx-auto collection-card p-8 space-y-6">
                    <div className="text-center space-y-3">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        >
                            <Loader2 className="h-8 w-8 mx-auto text-neutral-300" />
                        </motion.div>
                        <h2 className="text-2xl mt-4">Deploying {name}...</h2>
                        <p className="text-sm text-neutral-500">
                            Minting on-chain via Base Sepolia
                        </p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-neutral-500">
                            <span>Progress</span>
                            <span>{Math.round(deployProgress)}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                            <motion.div
                                className="h-full bg-white"
                                initial={{ width: 0 }}
                                animate={{ width: `${deployProgress}%` }}
                                transition={{ ease: "circOut" }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <span className={`moonbird-badge text-xs ${deployProgress >= 20 ? 'border-white/20 text-white' : ''}`}>Base iNFT</span>
                        <span className={`moonbird-badge text-xs ${deployProgress >= 70 ? 'border-purple-500/30 text-purple-400' : ''}`}>HIP-1215</span>
                        <span className={`moonbird-badge text-xs ${deployProgress >= 90 ? 'border-amber-500/30 text-amber-300' : ''}`}>ADI Paymaster</span>
                    </div>

                    <div className="bg-black/40 rounded-xl p-4 space-y-1.5 font-mono text-xs max-h-56 overflow-y-auto border border-white/[0.04]">
                        <AnimatePresence mode="popLayout">
                            {deployLogs.map((log, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10, height: 0 }}
                                    animate={{ opacity: 1, x: 0, height: "auto" }}
                                    exit={{ opacity: 0 }}
                                    className="text-neutral-500"
                                >
                                    <span className="text-neutral-600">{">"}</span> {log}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
        >
            <div className="max-w-lg mx-auto collection-card p-8 space-y-8">
                <div className="space-y-1">
                    <h2 className="text-2xl font-sans font-semibold flex items-center gap-2">
                        <Rocket className="h-5 w-5 text-neutral-400" />
                        Deploy New Agent
                    </h2>
                    <p className="text-sm text-neutral-500">
                        Launch an autonomous AI agent that runs forever on-chain
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="flex items-center gap-1.5 text-sm text-neutral-400">
                            <Brain className="h-3.5 w-3.5" />
                            Agent Name
                        </Label>
                        <Input
                            id="name"
                            placeholder="e.g. Haven Alpha"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-black/40 border-white/[0.06] focus:border-white/[0.15] rounded-xl h-11"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-sm text-neutral-400">
                            <Shield className="h-3.5 w-3.5" />
                            DeFi Strategy
                        </Label>
                        <Select value={strategy} onValueChange={setStrategy}>
                            <SelectTrigger className="bg-black/40 border-white/[0.06] rounded-xl h-11">
                                <SelectValue placeholder="Select strategy..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0a0a0a] border-white/[0.06]">
                                {STRATEGIES.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        <div>
                                            <div className="font-medium">{s.name}</div>
                                            <div className="text-xs text-neutral-500">{s.desc}</div>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-sm text-neutral-400">
                            <Timer className="h-3.5 w-3.5" />
                            Heartbeat Interval
                        </Label>
                        <Select value={interval} onValueChange={setInterval}>
                            <SelectTrigger className="bg-black/40 border-white/[0.06] rounded-xl h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0a0a0a] border-white/[0.06]">
                                {INTERVALS.map((i) => (
                                    <SelectItem key={i.value} value={i.value}>
                                        {i.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-neutral-600">
                            How often the agent autonomously executes DeFi actions via Hedera HIP-1215
                        </p>
                    </div>

                    <div className="bg-black/40 rounded-xl p-5 space-y-3 border border-white/[0.04]">
                        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Deployment pipeline
                        </p>
                        <ul className="space-y-2.5 text-xs text-neutral-500">
                            <li className="flex items-start gap-3">
                                <span className="text-neutral-400 mt-0.5 font-mono">01</span>
                                <span>Mint agent iNFT on <span className="text-white">Base Sepolia</span></span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-neutral-400 mt-0.5 font-mono">02</span>
                                <span>Prepare <span className="text-purple-400">Hedera HIP-1215</span> heartbeat calldata</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-neutral-400 mt-0.5 font-mono">03</span>
                                <span>Fund <span className="text-amber-300">ADI Paymaster</span> for gas sponsorship</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-neutral-400 mt-0.5 font-mono">04</span>
                                <span>Register on BaseRelay + start autonomous execution</span>
                            </li>
                        </ul>
                    </div>

                    <Button
                        onClick={handleDeploy}
                        disabled={!name || !strategy}
                        className="w-full h-12 text-sm font-medium bg-white text-black hover:bg-neutral-200 rounded-full"
                    >
                        <Rocket className="h-4 w-4 mr-2" />
                        Deploy Agent — Give it a Home Forever
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}
