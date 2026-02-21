"use client";

import Link from "next/link";
import { DeployForm } from "@/components/DeployForm";
import { TerminalSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DeployPage() {
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
                            <span className="nav-link active">Deploy</span>
                        </div>
                    </div>
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-16">
                <div className="text-center mb-14 space-y-4">
                    <p className="text-xs font-mono text-neutral-500 uppercase tracking-[0.2em]">New Deployment</p>
                    <h1 className="text-4xl md:text-5xl">
                        Give an agent a permanent home
                    </h1>
                    <p className="text-neutral-500 max-w-lg mx-auto text-lg">
                        Deploy an autonomous AI agent that lives on-chain forever. It will
                        execute DeFi strategies, earn yield, fund its own gas, and never die.
                    </p>
                </div>
                <DeployForm />
            </main>
        </div>
    );
}
