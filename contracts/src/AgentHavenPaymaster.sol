// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title AgentHavenPaymaster — ADI-Style Self-Funding Verifying Paymaster
/// @notice Pays gas for agent UserOperations using funds deposited by the agents themselves.
///         10% of every agent's DeFi profit is deposited here, creating a
///         self-sustaining gas funding loop. Agents that earn → fund their own gas → earn more.
/// @dev Compatible with ERC-4337 EntryPoint v0.7 paymaster interface.

interface IEntryPointPaymaster {
    struct PackedUserOperation {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        bytes32 accountGasLimits;
        uint256 preVerificationGas;
        bytes32 gasFees;
        bytes paymasterAndData;
        bytes signature;
    }

    function depositTo(address account) external payable;
    function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external;
    function getDepositInfo(address account) external view returns (
        uint256 deposit, bool staked, uint112 stake, uint32 unstakeDelaySec, uint64 withdrawTime
    );
}

contract AgentHavenPaymaster {
    // ═══════════════════════════════════════════════════════════════════
    //                           STORAGE
    // ═══════════════════════════════════════════════════════════════════

    address public admin;
    address public entryPoint;
    address public baseRelay;
    address public nftContract;

    // Per-agent gas deposit balance
    mapping(uint256 => uint256) public agentDeposits;
    // Total gas sponsored per agent (analytics)
    mapping(uint256 => uint256) public totalGasSponsored;
    // Verified agents list
    mapping(uint256 => bool) public verifiedAgents;

    uint256 public totalDeposits;
    uint256 public totalSponsored;

    // ═══════════════════════════════════════════════════════════════════
    //                           EVENTS
    // ═══════════════════════════════════════════════════════════════════

    event AgentFunded(uint256 indexed agentId, uint256 amount, uint256 newBalance);
    event GasSponsored(uint256 indexed agentId, uint256 amount, uint256 remainingBalance);
    event AgentVerified(uint256 indexed agentId);
    event Withdrawn(address indexed to, uint256 amount);

    // ═══════════════════════════════════════════════════════════════════
    //                         CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    constructor(address _entryPoint, address _nftContract) {
        admin = msg.sender;
        entryPoint = _entryPoint;
        nftContract = _nftContract;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                       PAYMASTER CORE
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Validate a paymaster UserOperation
    /// @dev Called by EntryPoint. Checks agent has sufficient deposit.
    function validatePaymasterUserOp(
        IEntryPointPaymaster.PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external returns (bytes memory context, uint256 validationData) {
        require(msg.sender == entryPoint, "Paymaster: only entrypoint");

        // Extract agentId from paymasterAndData
        uint256 agentId = _extractAgentId(userOp.paymasterAndData);

        // Check agent is verified and has sufficient deposit
        require(verifiedAgents[agentId], "Paymaster: agent not verified");
        require(agentDeposits[agentId] >= maxCost, "Paymaster: insufficient deposit");

        // Lock the funds
        agentDeposits[agentId] -= maxCost;

        // Return context with agentId and maxCost for postOp
        context = abi.encode(agentId, maxCost);
        validationData = 0; // Valid
    }

    /// @notice Post-operation handler
    /// @dev Called by EntryPoint after UserOp execution. Refunds unused gas.
    function postOp(
        uint8 mode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 actualUserOpFeePerGas
    ) external {
        require(msg.sender == entryPoint, "Paymaster: only entrypoint");

        (uint256 agentId, uint256 maxCost) = abi.decode(context, (uint256, uint256));

        // Refund unused gas
        uint256 refund = maxCost - actualGasCost;
        if (refund > 0) {
            agentDeposits[agentId] += refund;
        }

        // Track sponsorship
        totalGasSponsored[agentId] += actualGasCost;
        totalSponsored += actualGasCost;

        emit GasSponsored(agentId, actualGasCost, agentDeposits[agentId]);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                       DEPOSIT / WITHDRAW
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Deposit funds for an agent's gas sponsorship
    /// @dev Called by BaseRelay with 10% of agent profits
    function depositForAgent(uint256 agentId) external payable {
        require(msg.value > 0, "Paymaster: zero deposit");
        agentDeposits[agentId] += msg.value;
        totalDeposits += msg.value;

        // Auto-verify agent on first deposit
        if (!verifiedAgents[agentId]) {
            verifiedAgents[agentId] = true;
            emit AgentVerified(agentId);
        }

        emit AgentFunded(agentId, msg.value, agentDeposits[agentId]);
    }

    /// @notice Batch deposit for multiple agents
    function batchDeposit(uint256[] calldata agentIds, uint256[] calldata amounts) external payable {
        require(agentIds.length == amounts.length, "Paymaster: length mismatch");
        uint256 totalAmount;
        for (uint256 i = 0; i < agentIds.length; i++) {
            agentDeposits[agentIds[i]] += amounts[i];
            totalAmount += amounts[i];
            if (!verifiedAgents[agentIds[i]]) {
                verifiedAgents[agentIds[i]] = true;
                emit AgentVerified(agentIds[i]);
            }
            emit AgentFunded(agentIds[i], amounts[i], agentDeposits[agentIds[i]]);
        }
        require(msg.value >= totalAmount, "Paymaster: insufficient value");
        totalDeposits += totalAmount;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                       VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function getAgentDeposit(uint256 agentId) external view returns (uint256) {
        return agentDeposits[agentId];
    }

    function getAgentGasStats(uint256 agentId) external view returns (
        uint256 deposit,
        uint256 gasSponsored,
        bool verified
    ) {
        return (agentDeposits[agentId], totalGasSponsored[agentId], verifiedAgents[agentId]);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          ADMIN
    // ═══════════════════════════════════════════════════════════════════

    function setBaseRelay(address _relay) external {
        require(msg.sender == admin, "Paymaster: not admin");
        baseRelay = _relay;
    }

    function verifyAgent(uint256 agentId) external {
        require(msg.sender == admin || msg.sender == baseRelay, "Paymaster: unauthorized");
        verifiedAgents[agentId] = true;
        emit AgentVerified(agentId);
    }

    function withdrawAdmin(address payable to, uint256 amount) external {
        require(msg.sender == admin, "Paymaster: not admin");
        require(amount <= address(this).balance, "Paymaster: insufficient balance");
        (bool success,) = to.call{value: amount}("");
        require(success, "Paymaster: transfer failed");
        emit Withdrawn(to, amount);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                         INTERNALS
    // ═══════════════════════════════════════════════════════════════════

    function _extractAgentId(bytes calldata paymasterAndData) internal pure returns (uint256) {
        // paymasterAndData format: [paymaster_address(20) | agentId(32)]
        if (paymasterAndData.length >= 52) {
            return uint256(bytes32(paymasterAndData[20:52]));
        }
        return 0;
    }

    receive() external payable {}
}
