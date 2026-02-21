import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function shortenAddress(address: string, chars = 4): string {
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatEther(value: bigint, decimals = 4): string {
    const eth = Number(value) / 1e18;
    return eth.toFixed(decimals);
}

export function formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

export function timeAgo(timestamp: number): string {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
