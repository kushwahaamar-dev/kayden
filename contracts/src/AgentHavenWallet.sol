// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title AgentHavenWallet — ERC-4337 Account Abstraction Wallet
/// @notice Smart contract wallet compatible with ERC-4337 EntryPoint v0.7.
///         Supports UserOperation validation, signature verification, and
///         self-funding via the AgentHaven paymaster.
/// @dev Designed for AI agents to autonomously execute transactions via bundlers.

interface IEntryPoint {
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

    function getNonce(address sender, uint192 key) external view returns (uint256);
    function handleOps(PackedUserOperation[] calldata ops, address payable beneficiary) external;
    function depositTo(address account) external payable;
    function getDepositInfo(address account) external view returns (uint256 deposit, bool staked, uint112 stake, uint32 unstakeDelaySec, uint64 withdrawTime);
}

contract AgentHavenWallet {
    // ═══════════════════════════════════════════════════════════════════
    //                           STORAGE
    // ═══════════════════════════════════════════════════════════════════

    address public owner;
    address public entryPoint;
    address public agentTBA;       // The TBA this wallet serves
    uint256 public nonce;

    // ═══════════════════════════════════════════════════════════════════
    //                           EVENTS
    // ═══════════════════════════════════════════════════════════════════

    event WalletExecuted(address indexed target, uint256 value, bytes data);
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);

    // ═══════════════════════════════════════════════════════════════════
    //                           ERRORS
    // ═══════════════════════════════════════════════════════════════════

    error OnlyEntryPoint();
    error OnlyOwner();
    error InvalidSignature();
    error ExecutionFailed();

    // ═══════════════════════════════════════════════════════════════════
    //                         MODIFIERS
    // ═══════════════════════════════════════════════════════════════════

    modifier onlyEntryPoint() {
        if (msg.sender != entryPoint) revert OnlyEntryPoint();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner && msg.sender != entryPoint) revert OnlyOwner();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                         CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    /// @param _entryPoint ERC-4337 EntryPoint v0.7 address
    /// @param _owner The wallet owner (agent deployer)
    /// @param _agentTBA Associated Token Bound Account
    constructor(address _entryPoint, address _owner, address _agentTBA) {
        entryPoint = _entryPoint;
        owner = _owner;
        agentTBA = _agentTBA;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                    ERC-4337 VALIDATION
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Validates a UserOperation before execution
    /// @dev Called by EntryPoint to verify the operation is authorized
    /// @param userOp The packed user operation
    /// @param userOpHash Hash of the user operation
    /// @param missingAccountFunds Funds the account must deposit
    /// @return validationData 0 for success, 1 for failure
    function validateUserOp(
        IEntryPoint.PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external onlyEntryPoint returns (uint256 validationData) {
        // Verify signature: recover signer from userOpHash
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", userOpHash)
        );

        (bytes32 r, bytes32 s, uint8 v) = _splitSignature(userOp.signature);
        address recovered = ecrecover(ethSignedHash, v, r, s);

        if (recovered != owner) {
            return 1; // SIG_VALIDATION_FAILED
        }

        // Fund the entrypoint if needed
        if (missingAccountFunds > 0) {
            (bool success,) = payable(entryPoint).call{value: missingAccountFunds}("");
            require(success, "AgentWallet: prefund failed");
        }

        return 0; // SIG_VALIDATION_SUCCESS
    }

    // ═══════════════════════════════════════════════════════════════════
    //                       EXECUTION
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Execute a single call
    function execute(address target, uint256 value, bytes calldata data) external onlyOwner returns (bytes memory result) {
        bool success;
        (success, result) = target.call{value: value}(data);
        if (!success) revert ExecutionFailed();
        emit WalletExecuted(target, value, data);
    }

    /// @notice Execute a batch of calls
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas
    ) external onlyOwner returns (bytes[] memory results) {
        require(targets.length == values.length && values.length == calldatas.length, "AgentWallet: length mismatch");
        results = new bytes[](targets.length);
        for (uint256 i = 0; i < targets.length; i++) {
            bool success;
            (success, results[i]) = targets[i].call{value: values[i]}(calldatas[i]);
            if (!success) revert ExecutionFailed();
            emit WalletExecuted(targets[i], values[i], calldatas[i]);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //                       ADMIN
    // ═══════════════════════════════════════════════════════════════════

    function changeOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "AgentWallet: zero address");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                       INTERNALS
    // ═══════════════════════════════════════════════════════════════════

    function _splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "AgentWallet: invalid sig length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    /// @notice ERC-165 support
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC-165
            interfaceId == 0x4337beef;   // ERC-4337 Account
    }

    // Accept ETH
    receive() external payable {}
    fallback() external payable {}
}
