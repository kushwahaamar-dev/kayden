# Kayden — Autonomous Agent Infrastructure

> Permanent homes for AI agents on Base. Deploy once, agent runs forever.

[![ETHDenver 2026](https://img.shields.io/badge/ETHDenver-2026-blue)](https://www.ethdenver.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636)](https://soliditylang.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)

**Live demo:** https://kayden.vercel.app

---

## The Problem

AI agents in crypto are operationally fragile:

1. **No durable identity** — agents are ephemeral scripts, not addressable entities.
2. **Gas depletion kills them** — when ETH runs out, the agent dies.
3. **Off-chain schedulers are single points of failure** — if the server goes down, the agent stops.
4. **No governance** — there's no way for a community to collectively manage agent strategies.

## Our Solution

Kayden treats agents as **first-class on-chain entities**:

- Each agent is minted as an **iNFT** (ERC-721 + on-chain metadata) with strategy config stored in the token.
- Each agent gets a **Token Bound Account** (ERC-6551 pattern) — a wallet owned by the NFT.
- A **BaseRelay** contract handles heartbeat-driven execution: evaluate strategy → execute DeFi action → deposit profit to paymaster → reschedule.
- An **ERC-4337 paymaster** sponsors gas from agent earnings, enabling self-sustaining operation.
- **Nouns Builder DAO** governs agent strategies and treasury allocation.
- **Uniswap Developer Platform API** powers optimal swap routing.
- **Hedera Mirror Node** provides cross-chain observability.

---

## Deployed Contracts (Base Sepolia)

All contracts are live and verifiable on [BaseScan](https://sepolia.basescan.org):

| Contract | Address | BaseScan |
|----------|---------|----------|
| AgentHavenNFT | `0x710a3d8cad8eb9669b3a459bcfb7fb04c5e407ed` | [View](https://sepolia.basescan.org/address/0x710a3d8cad8eb9669b3a459bcfb7fb04c5e407ed) |
| TBA Registry | `0xebf3379d5a6be4989c996808cc9dbecb45969c81` | [View](https://sepolia.basescan.org/address/0xebf3379d5a6be4989c996808cc9dbecb45969c81) |
| BaseRelay | `0x50Fec67E215AB8e3D52418b628FD0A079232aa45` | [View](https://sepolia.basescan.org/address/0x50Fec67E215AB8e3D52418b628FD0A079232aa45) |
| DeFiModules | `0xb700abe8cc4eeaf32523c9d61877b8b07c4afa33` | [View](https://sepolia.basescan.org/address/0xb700abe8cc4eeaf32523c9d61877b8b07c4afa33) |
| Paymaster | `0x1672bfb9f38d654296e7fac0169ed6e927ed210f` | [View](https://sepolia.basescan.org/address/0x1672bfb9f38d654296e7fac0169ed6e927ed210f) |

**6 agents** are currently minted and actively executing heartbeats on-chain.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Nouns Builder DAO                      │
│         (Governance proposals, treasury, voting)         │
└──────────────────────┬──────────────────────────────────┘
                       │ strategy decisions
                       ▼
┌──────────────────────────────────────────────────────────┐
│                    AgentHavenNFT                          │
│   iNFT identity · strategy config · heartbeat interval   │
│                  ┌──────────────┐                        │
│                  │  TBA Wallet  │ (ERC-6551 pattern)     │
│                  │  owns assets │                        │
│                  └──────┬───────┘                        │
└─────────────────────────┼────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│                      BaseRelay                            │
│   executeHeartbeat() → evaluate → execute → fund gas     │
│                          │                               │
│              ┌───────────┼───────────┐                   │
│              ▼           ▼           ▼                   │
│         DeFiModules  Paymaster   Reschedule              │
│        (Aave, Uni,  (ERC-4337   (next heartbeat)        │
│         Compound)    gas fund)                           │
└──────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼──────────────────┐
        ▼                                    ▼
   Base Sepolia                      Hedera Mirror Node
   (execution logs)                  (cross-chain observability)
        │                                    │
        └────────────────┬───────────────────┘
                         ▼
                  Live Activity Feed
                  (dashboard UI)
```

---

## Bounty Alignment

### Base — Self-Sustaining Autonomous Agents
- Agents deployed as iNFTs on Base Sepolia with Token Bound Accounts
- BaseRelay contract executes heartbeat-driven DeFi actions
- Paymaster contract enables gas sponsorship from agent earnings
- 6 agents live with real on-chain heartbeat transactions

### Hedera — Cross-Chain Agent Observability
- Hedera Mirror Node REST API integration for real-time transaction feeds
- Cross-chain activity displayed alongside Base actions in unified dashboard
- HIP-1215 scheduling config builder for future autonomous triggers

### Uniswap Foundation — Developer Platform API Integration
- Uniswap Trading API for optimal swap route quotes
- QuoterV2 on-chain fallback when API is unavailable
- Swap routing displayed in agent strategy evaluation

### Nouns Builder — Governance UX
- Live proposal fetch from Nouns Builder Goldsky subgraph
- Treasury balance reads via on-chain calls
- Governance context drives agent strategy decisions
- Proposal voting UI with verification links to nouns.build

### ADI Foundation — ERC-4337 Paymaster Tooling
- Custom paymaster contract with per-agent deposit tracking
- Agent verification and gas sponsorship bookkeeping
- ERC-4337 `validatePaymasterUserOp` interface implementation

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui |
| Wallet | wagmi 2.x, viem, Coinbase Wallet / MetaMask |
| Contracts | Solidity 0.8.28, Foundry, EVM Cancun |
| Integrations | Uniswap Trading API, Nouns Builder Goldsky, Hedera Mirror Node |
| Deployment | Vercel (frontend), Base Sepolia (contracts) |

---

## Quick Start

```bash
git clone https://github.com/your-repo/kayden
cd kayden/frontend
npm install
cp .env.example .env.local  # then fill in values
npm run dev
```

Open http://localhost:3000

### Contract Development

```bash
cd contracts
forge build
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast --private-key $PRIVATE_KEY
```

---

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BASE_SEPOLIA_RPC` | Base Sepolia RPC endpoint |
| `NEXT_PUBLIC_NFT_ADDRESS` | AgentHavenNFT contract address |
| `NEXT_PUBLIC_RELAY_ADDRESS` | BaseRelay contract address |
| `NEXT_PUBLIC_PAYMASTER_ADDRESS` | Paymaster contract address |
| `NEXT_PUBLIC_UNISWAP_API_KEY` | Uniswap Developer Platform API key |
| `DEPLOYER_PRIVATE_KEY` | Server-side agent minting (never commit) |

---

## What's Real vs. In Progress

### Fully implemented and verifiable
- Agent minting as iNFTs with on-chain metadata (verify on BaseScan)
- Token Bound Account creation via custom registry
- BaseRelay heartbeat execution with on-chain action logs
- Paymaster deposit tracking and agent verification
- Uniswap API quote and swap route generation
- Nouns Builder proposal and treasury data (live from Goldsky)
- Hedera Mirror Node transaction feed (live from testnet)
- All frontend data reads from deployed contracts (no mock data)

### Contract internals still using simulation
- `BaseRelay._executeDeFiAction()` returns computed values rather than calling external DeFi protocols
- `BaseRelay._fundPaymaster()` emits events but does not transfer tokens
- ERC-4337 paymaster is not yet connected to a bundler for full UserOperation flow
- Hedera HIP-1215 schedule creation is configured but not executed from the frontend

This is clearly documented because we believe in honest engineering.

---

## Repository Structure

```
kayden/
├── contracts/
│   ├── src/
│   │   ├── AgentHavenNFT.sol       # iNFT agent identity
│   │   ├── AgentHavenTBA.sol        # Token Bound Account
│   │   ├── AgentHavenWallet.sol     # ERC-4337 wallet
│   │   ├── AgentHavenPaymaster.sol  # Gas sponsorship
│   │   ├── BaseRelay.sol            # Heartbeat execution engine
│   │   └── DeFiModules.sol          # Protocol integrations
│   ├── script/Deploy.s.sol
│   └── foundry.toml
├── frontend/
│   ├── app/                         # Next.js pages
│   ├── components/                  # UI components
│   ├── hooks/                       # useAgent, useLiveActions
│   └── lib/                         # contracts, uniswap, hedera, nounsBuilder
└── README.md
```

---

## License

MIT

---

Built for ETHDenver 2026.
