"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/lib/wagmi";
import { Toaster, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60_000,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    useEffect(() => {
        const onUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            const message =
                typeof reason === "string"
                    ? reason
                    : reason?.message || reason?.toString?.() || "";

            // Wallet/network providers can throw raw fetch errors in browser.
            // Prevent dev overlay noise and show a user-facing warning instead.
            if (message.includes("Failed to fetch")) {
                event.preventDefault();
                toast.error("Network request failed", {
                    description: "Please check RPC/API connectivity and try again.",
                });
            }
        };

        window.addEventListener("unhandledrejection", onUnhandledRejection);
        return () => window.removeEventListener("unhandledrejection", onUnhandledRejection);
    }, []);

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                    {children}
                    <Toaster
                        theme="dark"
                        position="bottom-right"
                        toastOptions={{
                            style: {
                                background: "rgba(10, 10, 10, 0.9)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                backdropFilter: "blur(24px)",
                                color: "#fafafa",
                            },
                        }}
                    />
                </TooltipProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
