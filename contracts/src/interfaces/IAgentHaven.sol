// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IAgentHaven — Core interfaces for the AgentHaven protocol
/// @notice Defines the agent lifecycle: create, execute, schedule, fund

interface IAgentHavenNFT {
    struct AgentConfig {
        string name;
        string strategyHash;     // 0G storage hash for strategy config
        uint256 heartbeatInterval; // seconds between autonomous actions
        address boundAccount;     // ERC-6551 TBA address
        uint256 totalEarnings;
        uint256 totalActions;
        bool active;
    }

    event AgentCreated(uint256 indexed tokenId, address indexed owner, string name, string strategyHash);
    event AgentDeactivated(uint256 indexed tokenId);
    event AgentConfigUpdated(uint256 indexed tokenId, string newStrategyHash);

    function mintAgent(string calldata name, string calldata strategyHash, uint256 heartbeatInterval) external returns (uint256 tokenId);
    function getAgentConfig(uint256 tokenId) external view returns (AgentConfig memory);
    function updateStrategy(uint256 tokenId, string calldata newStrategyHash) external;
    function deactivateAgent(uint256 tokenId) external;
    function totalAgents() external view returns (uint256);
}

interface IBaseRelay {
    enum ActionType { SUPPLY, WITHDRAW, SWAP, HARVEST, REBALANCE }

    struct ActionResult {
        uint256 agentId;
        ActionType actionType;
        address protocol;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 profit;
        uint256 gasUsed;
        uint256 timestamp;
        bytes32 txHash;
    }

    event AgentActionExecuted(
        uint256 indexed agentId,
        ActionType actionType,
        address indexed protocol,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event HeartbeatScheduled(
        uint256 indexed agentId,
        uint256 nextExecution,
        uint256 interval
    );

    event PaymasterFunded(
        uint256 indexed agentId,
        uint256 amount
    );

    function executeHeartbeat(uint256 agentId) external;
    function getLastAction(uint256 agentId) external view returns (ActionResult memory);
    function getNextHeartbeat(uint256 agentId) external view returns (uint256);
}

interface IDeFiModule {
    function supplyToAave(address asset, uint256 amount) external returns (uint256 shares);
    function withdrawFromAave(address asset, uint256 shares) external returns (uint256 amount);
    function supplyToCompound(address asset, uint256 amount) external returns (uint256 shares);
    function swapOnUniswap(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee) external returns (uint256 amountOut);
}
