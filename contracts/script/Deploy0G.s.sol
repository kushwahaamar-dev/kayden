// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AgentHavenNFT} from "../src/AgentHavenNFT.sol";

/// @title Deploy0G — Deploy iNFT Contract to 0G Chain Testnet
/// @notice Deploys just the AgentHavenNFT (ERC-7857 iNFT) to 0G Chain.
///         This fulfills the 0G bounty requirement:
///         ✅ Deploy at least one iNFT/agent contract on 0G Chain
///         ✅ Agent has on-chain identity (mintable/ownable) with metadata
///         ✅ Demonstrates meaningful agent action (mint + configure)
///
/// @dev Run with:
///   source ~/.zshenv && forge script script/Deploy0G.s.sol \
///     --rpc-url https://evmrpc-testnet.0g.ai \
///     --broadcast \
///     --private-key $PRIVATE_KEY

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

    function run() external virtual;
}

contract Deploy0G is Script {
    function run() external override {
        vm_startBroadcast();

        // 1. Deploy the ERC-7857 iNFT Factory
        AgentHavenNFT nft = new AgentHavenNFT();

        // 2. Mint first agent — on-chain identity with metadata
        nft.mintAgent(
            "Haven Alpha",                      // Agent name
            "QmYieldFarmerV1StrategyHash0G",   // 0G Storage strategy hash
            30                                   // 30s heartbeat interval
        );

        // 3. Mint second agent — demonstrates multi-agent support
        nft.mintAgent(
            "DeFi Sentinel",
            "QmConservativeAaveSupplyOnly",
            120
        );

        vm_stopBroadcast();
    }
}
