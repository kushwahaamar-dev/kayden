// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title AgentHavenTBA — ERC-6551 Token Bound Account
/// @notice Each AI agent iNFT gets a dedicated smart contract wallet (TBA).
///         This account can hold assets, execute DeFi operations, and receive earnings.
///         Ownership is derived from the NFT owner — whoever holds the NFT controls this account.
/// @dev Implements ERC-6551 Account interface with multicall support.

interface IERC6551Registry {
    function createAccount(
        address implementation,
        bytes32 salt,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) external returns (address);

    function account(
        address implementation,
        bytes32 salt,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) external view returns (address);
}

contract AgentHavenTBA {
    // ═══════════════════════════════════════════════════════════════════
    //                           STORAGE
    // ═══════════════════════════════════════════════════════════════════

    uint256 public state;
    address public nftContract;
    uint256 public tokenId;
    uint256 public chainId;
    address public baseRelay;

    // ═══════════════════════════════════════════════════════════════════
    //                           EVENTS
    // ═══════════════════════════════════════════════════════════════════

    event Executed(address indexed target, uint256 value, bytes data, uint256 newState);
    event EtherReceived(address indexed sender, uint256 amount);

    // ═══════════════════════════════════════════════════════════════════
    //                           ERRORS
    // ═══════════════════════════════════════════════════════════════════

    error NotAuthorized();
    error ExecutionFailed();

    // ═══════════════════════════════════════════════════════════════════
    //                         INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Initialize the TBA with its parent NFT context
    function initialize(
        address _nftContract,
        uint256 _tokenId,
        uint256 _chainId,
        address _baseRelay
    ) external {
        require(nftContract == address(0), "TBA: already initialized");
        nftContract = _nftContract;
        tokenId = _tokenId;
        chainId = _chainId;
        baseRelay = _baseRelay;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                         EXECUTE
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Execute a call from this TBA — only NFT owner or BaseRelay can call
    /// @param target The contract to call
    /// @param value ETH value to send
    /// @param data Calldata for the target
    /// @return result The return data from the call
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable returns (bytes memory result) {
        if (!_isAuthorized(msg.sender)) revert NotAuthorized();

        state++;

        bool success;
        (success, result) = target.call{value: value}(data);
        if (!success) revert ExecutionFailed();

        emit Executed(target, value, data, state);
    }

    /// @notice Batch execute multiple calls atomically
    /// @param targets Array of target addresses
    /// @param values Array of ETH values
    /// @param calldatas Array of calldata
    function multicall(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas
    ) external payable returns (bytes[] memory results) {
        if (!_isAuthorized(msg.sender)) revert NotAuthorized();
        require(
            targets.length == values.length && values.length == calldatas.length,
            "TBA: array length mismatch"
        );

        results = new bytes[](targets.length);
        for (uint256 i = 0; i < targets.length; i++) {
            state++;
            bool success;
            (success, results[i]) = targets[i].call{value: values[i]}(calldatas[i]);
            if (!success) revert ExecutionFailed();
            emit Executed(targets[i], values[i], calldatas[i], state);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //                       ERC-6551 INTERFACE
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Returns the NFT that owns this account
    function token() external view returns (uint256 _chainId, address _tokenContract, uint256 _tokenId) {
        return (chainId, nftContract, tokenId);
    }

    /// @notice Returns the current owner of the parent NFT
    function owner() public view returns (address) {
        (bool success, bytes memory data) = nftContract.staticcall(
            abi.encodeWithSignature("ownerOf(uint256)", tokenId)
        );
        if (!success) return address(0);
        return abi.decode(data, (address));
    }

    /// @notice ERC-165 support
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x6551beef || // ERC-6551 Account
            interfaceId == 0x01ffc9a7;   // ERC-165
    }

    /// @notice Check if an address is valid signer for this account
    function isValidSigner(address signer, bytes calldata) external view returns (bytes4) {
        if (_isAuthorized(signer)) {
            return 0x523e3260; // IERC6551Account.isValidSigner.selector
        }
        return 0x00000000;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                         INTERNALS
    // ═══════════════════════════════════════════════════════════════════

    function _isAuthorized(address caller) internal view returns (bool) {
        return caller == owner() || caller == baseRelay;
    }

    // Accept ETH
    receive() external payable {
        emit EtherReceived(msg.sender, msg.value);
    }

    fallback() external payable {}
}

/// @title AgentHavenTBARegistry — Deploys Token Bound Accounts for agent iNFTs
contract AgentHavenTBARegistry {
    address public implementation;
    address public nftContract;
    address public baseRelay;
    address public admin;

    mapping(uint256 => address) public accounts;

    event AccountCreated(uint256 indexed tokenId, address indexed account);

    constructor(address _implementation, address _nftContract, address _baseRelay) {
        implementation = _implementation;
        nftContract = _nftContract;
        baseRelay = _baseRelay;
        admin = msg.sender;
    }

    /// @notice Create a TBA for a specific agent tokenId using CREATE2
    function createAccount(uint256 tokenId) external returns (address account) {
        require(accounts[tokenId] == address(0), "TBARegistry: already exists");

        bytes32 salt = keccak256(abi.encodePacked(block.chainid, nftContract, tokenId));
        bytes memory bytecode = abi.encodePacked(
            type(AgentHavenTBA).creationCode
        );

        assembly {
            account := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        require(account != address(0), "TBARegistry: deploy failed");

        AgentHavenTBA(payable(account)).initialize(nftContract, tokenId, block.chainid, baseRelay);
        accounts[tokenId] = account;

        // Register on the NFT contract
        (bool success,) = nftContract.call(
            abi.encodeWithSignature("setBoundAccount(uint256,address)", tokenId, account)
        );
        require(success, "TBARegistry: setBoundAccount failed");

        emit AccountCreated(tokenId, account);
    }

    function getAccount(uint256 tokenId) external view returns (address) {
        return accounts[tokenId];
    }
}
