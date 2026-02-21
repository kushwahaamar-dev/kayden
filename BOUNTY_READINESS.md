# ETHDenver 2026 — Bounty Readiness

## Target Tracks

| Track | Prize | Status |
|-------|-------|--------|
| Base — Self-Sustaining Autonomous Agents | $10k | Ready |
| Hedera — Cross-Chain Observability | $25k pool | Ready |
| ADI Foundation — ERC-4337 Paymaster | $25k pool | Ready |
| Uniswap Foundation — Developer Platform API | $5k | Ready |
| Nouns Builder — Governance UX | $2k | Ready |

## What We Can Prove to Judges

### On-Chain Evidence (BaseScan-verifiable)
- 6 agents minted as iNFTs: [AgentHavenNFT](https://sepolia.basescan.org/address/0x710a3d8cad8eb9669b3a459bcfb7fb04c5e407ed)
- Multiple heartbeat executions per agent: [BaseRelay](https://sepolia.basescan.org/address/0x50Fec67E215AB8e3D52418b628FD0A079232aa45)
- Paymaster deposits and agent verification: [Paymaster](https://sepolia.basescan.org/address/0x1672bfb9f38d654296e7fac0169ed6e927ed210f)
- TBA registry deployment: [Registry](https://sepolia.basescan.org/address/0xebf3379d5a6be4989c996808cc9dbecb45969c81)

### Live API Integrations (verifiable in UI)
- Uniswap Trading API swap quotes (with API key)
- Nouns Builder proposals from Goldsky subgraph (live data)
- Hedera Mirror Node transaction feed (public testnet)

### Frontend Reads Entirely From Contracts
- Agent list: `totalAgents()` → `getAgentConfig(id)` loop
- Agent stats: `getAgentStats(id)` from BaseRelay
- Last action: `getLastAction(id)` from BaseRelay
- Paymaster: `getAgentGasStats(id)` from Paymaster
- No hardcoded agent data anywhere in frontend

## Honest Limitations

- `BaseRelay._executeDeFiAction()` returns computed values rather than calling external protocols
- `BaseRelay._fundPaymaster()` emits events but doesn't transfer tokens
- ERC-4337 paymaster is not connected to a bundler for full UserOperation flow
- Hedera HIP-1215 schedule creation is configured but not executed from frontend
- No automated contract test suite

These are clearly documented in the README.

## Demo Script for Judges

1. Open live site (Vercel) or `localhost:3000`
2. Landing page shows real agent data from Base Sepolia contracts
3. Navigate to Dashboard → see all 6 agents with real earnings/actions from contract reads
4. Click any agent → see detailed stats, heartbeat countdown, activity feed
5. Navigate to Deploy → mint a new agent (server-side, instant confirmation)
6. Show the new agent appears in dashboard from on-chain reads
7. Show DAO proposals from Nouns Builder (live from Goldsky)
8. Show Hedera transaction feed alongside Base actions
9. Open BaseScan links to verify all transactions are real
