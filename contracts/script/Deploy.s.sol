// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AgentHavenNFT} from "../src/AgentHavenNFT.sol";
import {AgentHavenTBA, AgentHavenTBARegistry} from "../src/AgentHavenTBA.sol";
import {AgentHavenWallet} from "../src/AgentHavenWallet.sol";
import {BaseRelay} from "../src/BaseRelay.sol";
import {DeFiModules} from "../src/DeFiModules.sol";
import {AgentHavenPaymaster} from "../src/AgentHavenPaymaster.sol";

/// @title Deploy — Full AgentHaven Deployment Script
/// @notice Deploys and wires up the entire AgentHaven protocol:
///         1. Deploy NFT contract (iNFT factory)
///         2. Deploy DeFi modules
///         3. Deploy Paymaster
///         4. Deploy BaseRelay (connects NFT, DeFi, Paymaster, 0G oracle)
///         5. Deploy TBA implementation + registry
///         6. Wire all contracts together
///         7. Mint first demo agent
///         8. Create TBA for agent
///         9. Register agent on BaseRelay with 30s heartbeat
///
/// @dev Run with: forge script script/Deploy.s.sol --broadcast --rpc-url base_sepolia

// Foundry Script base contract (minimal interface)
abstract contract Script {
    address internal constant VM_ADDRESS = address(uint160(uint256(keccak256("hevm cheat code"))));
    bool public IS_SCRIPT = true;

    function vm_startBroadcast() internal {
        (bool success,) = VM_ADDRESS.call(abi.encodeWithSignature("startBroadcast()"));
        require(success);
    }

    function vm_stopBroadcast() internal {
        (bool success,) = VM_ADDRESS.call(abi.encodeWithSignature("stopBroadcast()"));
        require(success);
    }

    function vm_envUint(string memory key) internal returns (uint256) {
        (bool success, bytes memory data) = VM_ADDRESS.call(abi.encodeWithSignature("envUint(string)", key));
        require(success);
        return abi.decode(data, (uint256));
    }

    function run() external virtual;
}

contract Deploy is Script {
    // ── Deployed addresses (populated during deployment) ──────────
    AgentHavenNFT public nft;
    DeFiModules public defi;
    AgentHavenPaymaster public paymaster;
    BaseRelay public relay;
    AgentHavenTBA public tbaImpl;
    AgentHavenTBARegistry public tbaRegistry;
    AgentHavenWallet public wallet;

    // ── Testnet Protocol Addresses (Base Sepolia) ────────────────
    // ERC-4337 EntryPoint v0.7 (canonical deployment)
    address constant ENTRYPOINT_V07 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;

    // Placeholder protocol addresses for testnet
    // These would be replaced with real testnet deployments
    address constant AAVE_POOL = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951;
    address constant COMPOUND_COMET = 0xAec1F48e02Cfb822Be958B68C7957156EB3F0b6e;
    address constant UNISWAP_ROUTER = 0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4;
    address constant ZERO_G_ORACLE = 0x0000000000000000000000000000000000000000; // Set post-deploy

    function run() external override {
        vm_startBroadcast();

        // ═══════════════════════════════════════════════════════════
        //  1. Deploy Core Contracts
        // ═══════════════════════════════════════════════════════════

        // NFT Contract (ERC-7857 iNFT Factory)
        nft = new AgentHavenNFT();

        // DeFi Modules (Aave, Compound, Uniswap integrations)
        defi = new DeFiModules(AAVE_POOL, COMPOUND_COMET, UNISWAP_ROUTER);

        // Paymaster (ADI-style self-funding)
        paymaster = new AgentHavenPaymaster(ENTRYPOINT_V07, address(nft));

        // BaseRelay (Autonomous heartbeat engine)
        relay = new BaseRelay(address(nft), address(defi), address(paymaster), ZERO_G_ORACLE);

        // ═══════════════════════════════════════════════════════════
        //  2. Deploy TBA Infrastructure
        // ═══════════════════════════════════════════════════════════

        // TBA Implementation (template)
        tbaImpl = new AgentHavenTBA();

        // TBA Registry (deploys TBAs per agent via CREATE2)
        tbaRegistry = new AgentHavenTBARegistry(address(tbaImpl), address(nft), address(relay));

        // ═══════════════════════════════════════════════════════════
        //  3. Wire Contracts Together
        // ═══════════════════════════════════════════════════════════

        nft.setTBARegistry(address(tbaRegistry));
        nft.setBaseRelay(address(relay));
        paymaster.setBaseRelay(address(relay));

        // ═══════════════════════════════════════════════════════════
        //  4. Mint First Demo Agent
        // ═══════════════════════════════════════════════════════════

        uint256 agentId = nft.mintAgent(
            "Haven Alpha",                           // Agent name
            "QmYieldFarmerV1StrategyHash0G",        // 0G storage hash (strategy brain)
            30                                        // 30 second heartbeat
        );

        // Deploy TBA for this agent
        address agentTBA = tbaRegistry.createAccount(agentId);

        // Deploy AA Wallet
        wallet = new AgentHavenWallet(ENTRYPOINT_V07, msg.sender, agentTBA);

        // ═══════════════════════════════════════════════════════════
        //  5. Register Agent on BaseRelay (start autonomous loop)
        // ═══════════════════════════════════════════════════════════

        relay.registerAgent(agentId, 30); // 30-second heartbeat

        // Fund paymaster for initial gas deposits
        paymaster.depositForAgent{value: 0.01 ether}(agentId);
        paymaster.verifyAgent(agentId);

        vm_stopBroadcast();
    }
}
