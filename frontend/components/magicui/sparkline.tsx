"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface SparklineProps {
    data: { value: number }[];
    width?: number;
    height?: number;
    color?: string;
    className?: string;
}

export const Sparkline = ({
    data,
    width = 300,
    height = 80,
    color = "#ffffff",
    className,
}: SparklineProps) => {
    const { path, gradientUrl } = useMemo(() => {
        if (!data || data.length === 0) return { path: "", gradientUrl: "" };

        const max = Math.max(...data.map((d) => d.value));
        const min = Math.min(...data.map((d) => d.value));
        const range = max - min || 1;

        const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((d.value - min) / range) * height * 0.8 - height * 0.1; // 10% padding top/bottom
            return `${x},${y}`;
        });

        // Create a smooth curve using a simplified bezier approach if needed, 
        // but for crypto sparklines, sharp lines often look more "accurate/raw".
        // Here we use sharp lines.
        const pathData = `M ${points.join(" L ")}`;

        return { path: pathData, gradientUrl: `url(#sparkline-gradient)` };
    }, [data, width, height]);

    return (
        <div className={className} style={{ width, height }}>
            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                className="overflow-visible"
            >
                <defs>
                    <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.01} />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Fill Area with Gradient */}
                <motion.path
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    d={`${path} L ${width},${height} L 0,${height} Z`}
                    fill={gradientUrl}
                />

                {/* Glowing Lead Line */}
                <motion.path
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    filter="url(#glow)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Animated Pulsing Dot at current value */}
                {data.length > 0 && (
                    <motion.circle
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                        transition={{
                            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                            opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                            delay: 2,
                        }}
                        cx={width}
                        cy={height - ((data[data.length - 1].value - Math.min(...data.map((d) => d.value))) / (Math.max(...data.map((d) => d.value)) - Math.min(...data.map((d) => d.value)) || 1)) * height * 0.8 - height * 0.1}
                        r="3"
                        fill={color}
                        filter="url(#glow)"
                    />
                )}
            </svg>
        </div>
    );
};
