"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BorderBeamProps {
    className?: string;
    size?: number;
    duration?: number;
    delay?: number;
    colorFrom?: string;
    colorTo?: string;
}

export const BorderBeam = ({
    className,
    size = 200,
    duration = 15,
    delay = 0,
    colorFrom = "#ffffff",
    colorTo = "#333333",
}: BorderBeamProps) => {
    return (
        <div className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]", className)}>
            <motion.div
                initial={{ transform: `rotate(0deg) translateY(-50%)` }}
                animate={{ transform: `rotate(360deg) translateY(-50%)` }}
                transition={{
                    repeat: Infinity,
                    duration,
                    delay,
                    ease: "linear",
                }}
                className="absolute left-1/2 top-1/2 origin-left"
                style={{
                    width: size,
                    height: size,
                    // Linear gradient acting like a beam of light traversing the edge
                    background: `linear-gradient(90deg, transparent 0%, ${colorTo} 20%, ${colorFrom} 40%, transparent 100%)`,
                    maskImage: `radial-gradient(ellipse at center, transparent 30%, black 100%)`,
                    opacity: 0.8,
                }}
            />
            {/* Soft inner glow masking to keep beam strictly on perimeter */}
            <div className="absolute inset-[1px] rounded-[inherit] bg-black/50 z-[-1]" />
        </div>
    );
};
