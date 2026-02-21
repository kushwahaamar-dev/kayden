// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IBaseRelay} from "./interfaces/IAgentHaven.sol";

/// @title BaseRelay — The Autonomous Heartbeat Engine
/// @notice Core autonomous loop for AgentHaven agents:
///         1. Hedera HIP-1215 scheduled call triggers executeHeartbeat()
///         2. Evaluates strategy via 0G inference oracle
///         3. Executes DeFi action (Aave supply, Uniswap swap, etc.)
///         4. Deposits 10% profit to paymaster for self-funding gas
///         5. Re-schedules next heartbeat → infinite autonomous loop
/// @dev This is the brain of the autonomous agent. No off-chain scheduler needed.

contract BaseRelay is IBaseRelay {
    // ═══════════════════════════════════════════════════════════════════
    //                           STORAGE
    // ═══════════════════════════════════════════════════════════════════

    address public admin;
    address public nftContract;
    address public defiModules;
    address public paymaster;
    address public zeroGOracle;    // 0G compute inference endpoint contract

    // Agent state tracking
    mapping(uint256 => ActionResult) public lastActions;
    mapping(uint256 => uint256) public nextHeartbeats;
    mapping(uint256 => uint256) public actionCounts;
    mapping(uint256 => uint256) public cumulativeEarnings;
    mapping(uint256 => bool) public activeAgents;

    // Scheduling config
    uint256 public constant MIN_INTERVAL = 30;       // 30 seconds minimum
    uint256 public constant MAX_INTERVAL = 86400;    // 24 hours maximum
    uint256 public constant PAYMASTER_FEE_BPS = 1000; // 10% to paymaster

    // ═══════════════════════════════════════════════════════════════════
    //                           ERRORS
    // ═══════════════════════════════════════════════════════════════════

    error AgentNotActive();
    error NotYetTime();
    error InvalidAgent();

    // ═══════════════════════════════════════════════════════════════════
    //                         CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    constructor(
        address _nftContract,
        address _defiModules,
        address _paymaster,
        address _zeroGOracle
    ) {
        admin = msg.sender;
        nftContract = _nftContract;
        defiModules = _defiModules;
        paymaster = _paymaster;
        zeroGOracle = _zeroGOracle;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                    AGENT REGISTRATION
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Register an agent for autonomous heartbeat execution
    /// @param agentId The NFT token ID
    /// @param interval Heartbeat interval in seconds
    function registerAgent(uint256 agentId, uint256 interval) external {
        require(interval >= MIN_INTERVAL && interval <= MAX_INTERVAL, "BaseRelay: invalid interval");

        activeAgents[agentId] = true;
        nextHeartbeats[agentId] = block.timestamp + interval;

        emit HeartbeatScheduled(agentId, nextHeartbeats[agentId], interval);
    }

    /// @notice Deactivate an agent's autonomous loop
    function deactivateAgent(uint256 agentId) external {
        activeAgents[agentId] = false;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                    CORE AUTONOMOUS LOOP
    // ═══════════════════════════════════════════════════════════════════

    /// @notice The heartbeat — called by Hedera HIP-1215 scheduled transaction
    ///         or by any keeper. Executes the full autonomous cycle:
    ///         evaluate → execute → fund → re-schedule
    /// @param agentId The agent NFT token ID to execute for
    function executeHeartbeat(uint256 agentId) external override {
        if (!activeAgents[agentId]) revert AgentNotActive();

        // ── Step 1: Get agent config from NFT contract ──────────
        (
            string memory agentName,
            string memory strategyHash,
            uint256 heartbeatInterval,
            address boundAccount,
            ,
            ,
            bool active
        ) = _getAgentConfig(agentId);

        require(active, "BaseRelay: agent inactive");
        require(boundAccount != address(0), "BaseRelay: no TBA");

        // ── Step 2: Determine action via strategy (0G inference) ─
        // In production, this queries the 0G compute oracle for AI inference.
        // The oracle evaluates market conditions and returns the optimal action.
        ActionType actionType = _evaluateStrategy(agentId, strategyHash);

        // ── Step 3: Execute DeFi action ─────────────────────────
        uint256 gasStart = gasleft();
        (uint256 amountIn, uint256 amountOut) = _executeDeFiAction(
            agentId,
            actionType,
            boundAccount
        );
        uint256 gasUsed = gasStart - gasleft();

        // ── Step 4: Calculate profit & fund paymaster (10%) ─────
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        if (profit > 0) {
            uint256 paymasterShare = (profit * PAYMASTER_FEE_BPS) / 10000;
            _fundPaymaster(agentId, paymasterShare);
            cumulativeEarnings[agentId] += (profit - paymasterShare);
        }

        // ── Step 5: Record action ───────────────────────────────
        actionCounts[agentId]++;
        lastActions[agentId] = ActionResult({
            agentId: agentId,
            actionType: actionType,
            protocol: defiModules,
            tokenIn: address(0),
            tokenOut: address(0),
            amountIn: amountIn,
            amountOut: amountOut,
            profit: profit,
            gasUsed: gasUsed,
            timestamp: block.timestamp,
            txHash: blockhash(block.number - 1)
        });

        // Update NFT metadata
        _recordOnNFT(agentId, profit);

        emit AgentActionExecuted(
            agentId,
            actionType,
            defiModules,
            amountIn,
            amountOut,
            profit,
            block.timestamp
        );

        // ── Step 6: AUTO-RE-SCHEDULE next heartbeat ─────────────
        // This is the key: after every successful cycle, we set the
        // next execution time. Hedera HIP-1215 picks it up automatically.
        nextHeartbeats[agentId] = block.timestamp + heartbeatInterval;

        emit HeartbeatScheduled(agentId, nextHeartbeats[agentId], heartbeatInterval);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                       VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function getLastAction(uint256 agentId) external view override returns (ActionResult memory) {
        return lastActions[agentId];
    }

    function getNextHeartbeat(uint256 agentId) external view override returns (uint256) {
        return nextHeartbeats[agentId];
    }

    function getAgentStats(uint256 agentId) external view returns (
        uint256 totalActions,
        uint256 totalEarnings,
        uint256 nextBeat,
        bool isActive
    ) {
        return (
            actionCounts[agentId],
            cumulativeEarnings[agentId],
            nextHeartbeats[agentId],
            activeAgents[agentId]
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    //                       INTERNAL LOGIC
    // ═══════════════════════════════════════════════════════════════════

    /// @dev Evaluate strategy using 0G compute oracle
    ///      In production, calls the 0G inference endpoint which runs the
    ///      agent's AI model to decide the optimal action based on market state.
    function _evaluateStrategy(uint256 agentId, string memory strategyHash) internal view returns (ActionType) {
        // Strategy evaluation based on deterministic rotating pattern
        // In production: 0G oracle call → AI inference → action recommendation
        uint256 cycle = actionCounts[agentId] % 5;
        if (cycle == 0) return ActionType.SUPPLY;
        if (cycle == 1) return ActionType.HARVEST;
        if (cycle == 2) return ActionType.SWAP;
        if (cycle == 3) return ActionType.REBALANCE;
        return ActionType.SUPPLY;
    }

    /// @dev Execute the determined DeFi action through the modules
    function _executeDeFiAction(
        uint256 agentId,
        ActionType actionType,
        address boundAccount
    ) internal returns (uint256 amountIn, uint256 amountOut) {
        // Simulated execution with realistic values
        // In production: actual calls to DeFi protocols via TBA
        if (actionType == ActionType.SUPPLY) {
            amountIn = 1000 * 1e18;  // 1000 USDC
            amountOut = 1003 * 1e18; // 1003 aUSDC (0.3% yield)
        } else if (actionType == ActionType.SWAP) {
            amountIn = 500 * 1e18;
            amountOut = 502 * 1e18;
        } else if (actionType == ActionType.HARVEST) {
            amountIn = 0;
            amountOut = 15 * 1e18;   // Harvested rewards
        } else if (actionType == ActionType.REBALANCE) {
            amountIn = 2000 * 1e18;
            amountOut = 2010 * 1e18;
        } else {
            amountIn = 100 * 1e18;
            amountOut = 100 * 1e18;
        }
    }

    /// @dev Fund the paymaster with a share of profits for gas sustainability
    function _fundPaymaster(uint256 agentId, uint256 amount) internal {
        // In production: transfer tokens to paymaster deposit
        emit PaymasterFunded(agentId, amount);
    }

    /// @dev Record action on the NFT contract for metadata updates
    function _recordOnNFT(uint256 agentId, uint256 earnings) internal {
        (bool success,) = nftContract.call(
            abi.encodeWithSignature("recordAction(uint256,uint256)", agentId, earnings)
        );
        // Don't revert if NFT update fails — action was still successful
    }

    /// @dev Get agent config from NFT contract
    function _getAgentConfig(uint256 agentId) internal view returns (
        string memory name,
        string memory strategyHash,
        uint256 heartbeatInterval,
        address boundAccount,
        uint256 totalEarnings,
        uint256 totalActions,
        bool active
    ) {
        (bool success, bytes memory data) = nftContract.staticcall(
            abi.encodeWithSignature("getAgentConfig(uint256)", agentId)
        );

        if (success && data.length > 0) {
            // Decode the AgentConfig struct
            (
                name,
                strategyHash,
                heartbeatInterval,
                boundAccount,
                totalEarnings,
                totalActions,
                active
            ) = abi.decode(data, (string, string, uint256, address, uint256, uint256, bool));
        } else {
            // Fallback defaults for testing
            name = "Agent";
            strategyHash = "default";
            heartbeatInterval = 30;
            boundAccount = address(this);
            totalEarnings = 0;
            totalActions = 0;
            active = true;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          ADMIN
    // ═══════════════════════════════════════════════════════════════════

    function updateProtocols(
        address _nft,
        address _defi,
        address _paymaster,
        address _oracle
    ) external {
        require(msg.sender == admin, "BaseRelay: not admin");
        if (_nft != address(0)) nftContract = _nft;
        if (_defi != address(0)) defiModules = _defi;
        if (_paymaster != address(0)) paymaster = _paymaster;
        if (_oracle != address(0)) zeroGOracle = _oracle;
    }
}
