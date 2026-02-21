import { createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { base } from 'viem/chains';

export interface UniswapAction {
    id: string;
    type: "SWAP" | "LP_ADD" | "LP_REMOVE" | "ROUTE_OPTIMIZED";
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOutMin: string;
    feeTier?: number;
    gasSaved: string;
    timestamp: number;
    status: "SUCCESS" | "PENDING";
}

// ═══════════════════════════════════════════════════════════════════
// Base Mainnet QuoterV2 — correct address for live price quoting
// ═══════════════════════════════════════════════════════════════════
const QUOTER_V2_ADDRESS = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a' as const;

const QUOTER_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "tokenIn", "type": "address" },
            { "internalType": "address", "name": "tokenOut", "type": "address" },
            { "internalType": "uint24", "name": "fee", "type": "uint24" },
            { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
            { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
        ],
        "name": "quoteExactInputSingle",
        "outputs": [
            { "internalType": "uint256", "name": "amountOut", "type": "uint256" },
            { "internalType": "uint160", "name": "sqrtPriceX96After", "type": "uint160" },
            { "internalType": "uint32", "name": "initializedTicksCrossed", "type": "uint32" },
            { "internalType": "uint256", "name": "gasEstimate", "type": "uint256" }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

// Fee tiers to try in order: 0.3% (most common), 0.05%, 1%
const FEE_TIERS = [3000, 500, 10000] as const;

const publicClient = createPublicClient({
    chain: base,
    transport: http()
});

export async function fetchOptimalSwapRoute(
    tokenInAddress: string,
    tokenOutAddress: string,
    amount: string,
    decimalsIn: number = 18,
    decimalsOut: number = 6
): Promise<{ path: string[], quote: string, gasEstimate: string, source: string }> {

    const amountInWei = parseUnits(amount, decimalsIn);

    // 1. Attempt using the Uniswap Trading API
    try {
        const apiKey = process.env.NEXT_PUBLIC_UNISWAP_API_KEY;
        if (apiKey) {
            const resp = await fetch("https://trade-api.gateway.uniswap.org/v1/quote", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "x-universal-router-version": "2.0",
                },
                body: JSON.stringify({
                    tokenInChainId: base.id,
                    tokenIn: tokenInAddress,
                    tokenOutChainId: base.id,
                    tokenOut: tokenOutAddress,
                    amount: amountInWei.toString(),
                    type: "EXACT_INPUT",
                    swapper: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // Read-only quoter
                    routingPreference: "BEST_PRICE",
                    urgency: "normal",
                })
            });

            if (resp.ok) {
                const data = await resp.json();
                const quoteAmount = data.quote?.amountDecimals || data.quote?.amount || data.amountOut || "0";
                return {
                    path: [tokenInAddress, tokenOutAddress],
                    quote: typeof quoteAmount === 'string' && quoteAmount.length > 10
                        ? formatUnits(BigInt(quoteAmount), decimalsOut)
                        : quoteAmount.toString(),
                    gasEstimate: data.quote?.gasUseEstimate || data.gasEstimate || "0.0001",
                    source: "Uniswap Trading API"
                };
            }
        }
    } catch {
        // Silent — fall through to QuoterV2
    }

    // 2. On-Chain QuoterV2 — try multiple fee tiers
    for (const feeTier of FEE_TIERS) {
        try {
            const { result } = await publicClient.simulateContract({
                address: QUOTER_V2_ADDRESS,
                abi: QUOTER_ABI,
                functionName: 'quoteExactInputSingle',
                args: [
                    tokenInAddress as `0x${string}`,
                    tokenOutAddress as `0x${string}`,
                    feeTier,
                    amountInWei,
                    BigInt(0)
                ]
            });

            const [amountOut, , , gasEstimate] = result as [bigint, bigint, number, bigint];

            return {
                path: [tokenInAddress, tokenOutAddress],
                quote: formatUnits(amountOut, decimalsOut),
                gasEstimate: formatUnits(gasEstimate, 18),
                source: `Uniswap V3 QuoterV2 (${feeTier / 10000}% pool)`
            };
        } catch {
            // Try next fee tier silently
            continue;
        }
    }

    throw new Error("Unable to fetch real Uniswap route (Trading API and QuoterV2 unavailable).");
}

// ═══════════════════════════════════════════════════════════════════
// REAL ON-CHAIN TRANSACTION GENERATION
// ═══════════════════════════════════════════════════════════════════
export async function getUniswapTransaction(
    tokenInAddress: string,
    tokenOutAddress: string,
    amountStr: string,
    decimalsIn: number,
    walletAddress: string,
    chainId: number = 84532
): Promise<{ to: string, data: string, value: string } | null> {

    const apiKey = process.env.NEXT_PUBLIC_UNISWAP_API_KEY;
    const amountWei = parseUnits(amountStr, decimalsIn).toString();

    if (!apiKey) {
        console.error("No Uniswap API key configured");
        return null;
    }

    try {
        const resp = await fetch(`https://trade-api.gateway.uniswap.org/v1/quote`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "x-universal-router-version": "2.0",
            },
            body: JSON.stringify({
                tokenInChainId: chainId,
                tokenIn: tokenInAddress === "ETH" ? "0x0000000000000000000000000000000000000000" : tokenInAddress,
                tokenOutChainId: chainId,
                tokenOut: tokenOutAddress === "ETH" ? "0x0000000000000000000000000000000000000000" : tokenOutAddress,
                amount: amountWei,
                type: "EXACT_INPUT",
                swapper: walletAddress,
                autoSlippage: "DEFAULT",
                routingPreference: "BEST_PRICE",
                urgency: "urgent",
            })
        });

        if (!resp.ok) {
            console.error("Uniswap API transaction gen failed", await resp.text());
            return null;
        }

        const json = await resp.json();

        if (json.quote && json.quote.methodParameters) {
            return {
                to: json.quote.methodParameters.to,
                data: json.quote.methodParameters.calldata,
                value: json.quote.methodParameters.value
            };
        }

        return null;
    } catch (e) {
        console.error("Exception getting Uniswap transaction", e);
        return null;
    }
}
