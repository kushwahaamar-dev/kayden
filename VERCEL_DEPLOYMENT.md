# Kayden: Vercel Deployment Guide

Follow these steps to deploy the Kayden frontend to Vercel and ensure all live integrations work in production.

## 1. Prepare your GitHub Repository
The code has already been successfully pushed to your GitHub repository at:
`https://github.com/kushwahaamar-dev/kayden`

## 2. Import Project to Vercel
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** -> **Project**.
2. Select your `kushwahaamar-dev/kayden` repository.
3. In the "Configure Project" screen, ensure the following framework settings are automatically detected:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend` (Important: Click "Edit" and change to `frontend` since the Next.js app is inside the frontend folder)
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install`
   - **Output Directory**: `.next`

## 3. Configure Environment Variables
Expand the **"Environment Variables"** section and add the following keys. These are required for the live data integrations to function in production:

| Key Name | Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_UNISWAP_API_KEY` | *Your Uniswap API Key* | Required for live routing & quotes (Base Mainnet) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | *Your WC Project ID* | Required for Wagmi wallet connection |
| `NEXT_PUBLIC_HEDERA_MIRROR_REST` | `https://testnet.mirrornode.hedera.com/api/v1` | Hedera data fetching |
| `NEXT_PUBLIC_BASE_SEPOLIA_RPC` | `https://sepolia.base.org` | Wagmi default chain RPC |

*Optional Contract Overrides (Defaults are provided in code, but you can override them here):*
- `NEXT_PUBLIC_NFT_ADDRESS`
- `NEXT_PUBLIC_TBA_REGISTRY`
- `NEXT_PUBLIC_RELAY_ADDRESS`
- `NEXT_PUBLIC_DEFI_MODULES`
- `NEXT_PUBLIC_PAYMASTER_ADDRESS`

## 4. Deploy
1. Click the **Deploy** button.
2. Vercel will install dependencies, build the Next.js application, and deploy it.
3. Once finished, click **Continue to Dashboard** and click **Visit** to see your live site.

## 5. Verify Integrations Working in Production
After deployment, check the following pages:
1. **Landing Page (`/`)**: Verify the Base Treasury value and live Nouns Builder proposals are loading.
2. **Dashboard (`/dashboard`)**: Check the Active Proposals section to ensure Nouns Builder subgraphs are properly fetched. Check the live Hedera and Uniswap feeds to see valid token quotes and recent Hedera `CRYPTOTRANSFER` actions. 
3. Verify that the "Pool ↗" and "Verify on nouns.build ↗" external links resolve to the correct on-chain block explorers.

## Troubleshooting
- **API Errors / Failing to fetch live data**: Double-check that your `NEXT_PUBLIC_UNISWAP_API_KEY` and `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` are set correctly in the Vercel environment variables, as Next.js requires these at build time to embed them into the production client bundle.
