"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/lib/wagmi";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";

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
