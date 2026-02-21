"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const buttonVariants = cva(
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer overflow-hidden",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/90 glow-white",
                destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                outline: "border border-white/10 bg-transparent hover:bg-white/5 hover:border-white/20",
                secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-white/5",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-md px-3",
                lg: "h-11 rounded-md px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
        const [isHovered, setIsHovered] = React.useState(false);

        const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMousePosition({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
        };

        return (
            <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn("inline-block", className)}
            >
                <Comp
                    className={cn(buttonVariants({ variant, size, className: "" }))}
                    ref={ref}
                    onMouseMove={handleMouseMove}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    {...props}
                >
                    {isHovered && (variant === "outline" || variant === "ghost" || variant === "secondary") && (
                        <div
                            className="pointer-events-none absolute -inset-px rounded-lg opacity-0 transition duration-300"
                            style={{
                                opacity: isHovered ? 1 : 0,
                                background: `radial-gradient(100px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.1), transparent 40%)`,
                            }}
                        />
                    )}
                    <span className="relative z-10 flex items-center gap-2">{props.children}</span>
                </Comp>
            </motion.div>
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
