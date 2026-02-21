"use client";

import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Timer } from "lucide-react";

interface HeartbeatCountdownProps {
    nextHeartbeat: number;
    interval: number;
    compact?: boolean;
}

export function HeartbeatCountdown({
    nextHeartbeat,
    interval,
    compact = false,
}: HeartbeatCountdownProps) {
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const tick = () => {
            const now = Math.floor(Date.now() / 1000);
            const remaining = Math.max(0, nextHeartbeat - now);
            const pct = Math.max(0, Math.min(100, ((interval - remaining) / interval) * 100));
            setSecondsLeft(remaining);
            setProgress(pct);
        };

        tick();
        const timer = setInterval(tick, 100);
        return () => clearInterval(timer);
    }, [nextHeartbeat, interval]);

    if (compact) {
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                        <Timer className="h-3 w-3" />
                        <span>Next heartbeat</span>
                    </div>
                    <span className="text-xs font-mono font-medium text-white">
                        {secondsLeft}s
                    </span>
                </div>
                <Progress value={progress} />
            </div>
        );
    }

    return (
        <div className="collection-card p-8 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-neutral-500 flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Next Heartbeat
                </h3>
                <span className="text-sm font-mono text-neutral-600">
                    every {interval}s
                </span>
            </div>

            {/* Large countdown display */}
            <div className="flex items-center justify-center py-6">
                <div className="relative">
                    {/* Circular progress ring */}
                    <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                        <circle
                            cx="60"
                            cy="60"
                            r="52"
                            fill="none"
                            stroke="rgba(255,255,255,0.04)"
                            strokeWidth="4"
                        />
                        <circle
                            cx="60"
                            cy="60"
                            r="52"
                            fill="none"
                            stroke="url(#heartbeat-gradient)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 52}`}
                            strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
                            className="transition-all duration-200"
                        />
                        <defs>
                            <linearGradient id="heartbeat-gradient">
                                <stop offset="0%" stopColor="#e8d5b7" />
                                <stop offset="100%" stopColor="#8fad88" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-mono text-white">
                            {secondsLeft}
                        </span>
                        <span className="text-xs text-neutral-600 mt-1">seconds</span>
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <Progress value={progress} />
            <p className="text-center text-xs text-neutral-600">
                {secondsLeft === 0
                    ? "Executing heartbeat..."
                    : `Next autonomous action in ${secondsLeft}s`}
            </p>
        </div>
    );
}
