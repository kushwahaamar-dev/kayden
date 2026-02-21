"use client";

import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface StaggerRevealProps {
    text: string;
    className?: string;
    delay?: number;
}

export const StaggerReveal = ({ text, className, delay = 0 }: StaggerRevealProps) => {
    // Split text into words, perserving HTML spaces
    const words = text.split(" ");

    const container = {
        hidden: { opacity: 0 },
        visible: (i = 1) => ({
            opacity: 1,
            transition: { staggerChildren: 0.12, delayChildren: 0.04 * i + delay },
        }),
    };

    const child: Variants = {
        visible: {
            opacity: 1,
            y: 0,
            rotate: 0,
            transition: {
                type: "spring",
                damping: 12,
                stiffness: 100,
            } as any,
        },
        hidden: {
            opacity: 0,
            y: 40,
            rotate: 5,
            transition: {
                type: "spring",
                damping: 12,
                stiffness: 100,
            } as any,
        },
    };

    return (
        <motion.div
            style={{ overflow: "hidden", display: "flex", flexWrap: "wrap", justifyContent: "center" }}
            variants={container}
            initial="hidden"
            animate="visible"
            className={className}
        >
            {words.map((word, index) => (
                <motion.span
                    variants={child}
                    style={{ marginRight: "0.25em", display: "inline-block" }}
                    key={index}
                >
                    {/* Preserve special spans for gradient highlights if passed via string match (hack for simple use case) */}
                    {word === "Homeless" || word === "Agent" ? (
                        <span className="text-foreground glow-white-text">{word}</span>
                    ) : (
                        word
                    )}
                </motion.span>
            ))}
        </motion.div>
    );
};
