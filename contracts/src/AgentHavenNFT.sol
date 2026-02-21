// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IAgentHavenNFT} from "./interfaces/IAgentHaven.sol";

/// @title AgentHavenNFT — ERC-7857 iNFT Factory
/// @notice Mints AI agent NFTs with on-chain brain metadata stored via 0G.
///         Each agent has a permanent identity (iNFT) with strategy config,
///         heartbeat interval, and links to its Token Bound Account.
/// @dev Implements ERC-721 with ERC-7857 extensions for AI-native NFTs.
///      The iNFT standard allows the NFT to carry executable intelligence metadata.

contract AgentHavenNFT is IAgentHavenNFT {
    // ═══════════════════════════════════════════════════════════════════
    //                           STORAGE
    // ═══════════════════════════════════════════════════════════════════

    string public name = "AgentHaven iNFT";
    string public symbol = "AGENT";

    uint256 private _tokenIdCounter;
    address public owner;
    address public tbaRegistry;
    address public baseRelay;

    mapping(uint256 => AgentConfig) private _agents;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // ERC-7857 iNFT metadata — maps tokenId to AI model/strategy descriptor
    mapping(uint256 => bytes) private _iNFTData;

    // ═══════════════════════════════════════════════════════════════════
    //                           EVENTS (ERC-721)
    // ═══════════════════════════════════════════════════════════════════

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    // ═══════════════════════════════════════════════════════════════════
    //                           MODIFIERS
    // ═══════════════════════════════════════════════════════════════════

    modifier onlyOwner() {
        require(msg.sender == owner, "AgentHavenNFT: not owner");
        _;
    }

    modifier onlyTokenOwner(uint256 tokenId) {
        require(_owners[tokenId] == msg.sender, "AgentHavenNFT: not token owner");
        _;
    }

    modifier onlyAuthorized(uint256 tokenId) {
        require(
            msg.sender == _owners[tokenId] ||
            msg.sender == baseRelay ||
            msg.sender == _agents[tokenId].boundAccount,
            "AgentHavenNFT: unauthorized"
        );
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    constructor() {
        owner = msg.sender;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                        ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function setTBARegistry(address _registry) external onlyOwner {
        tbaRegistry = _registry;
    }

    function setBaseRelay(address _relay) external onlyOwner {
        baseRelay = _relay;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                        CORE — MINT AGENT
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Mints a new AI agent iNFT with strategy config stored on 0G
    /// @param _name Human-readable agent name
    /// @param _strategyHash 0G storage hash pointing to the agent's strategy/brain
    /// @param _heartbeatInterval Seconds between autonomous heartbeat actions
    /// @return tokenId The newly minted token ID
    function mintAgent(
        string calldata _name,
        string calldata _strategyHash,
        uint256 _heartbeatInterval
    ) external override returns (uint256 tokenId) {
        require(_heartbeatInterval >= 30, "AgentHavenNFT: interval too short");
        require(bytes(_name).length > 0, "AgentHavenNFT: empty name");
        require(bytes(_strategyHash).length > 0, "AgentHavenNFT: empty strategy");

        tokenId = ++_tokenIdCounter;

        _owners[tokenId] = msg.sender;
        _balances[msg.sender]++;

        _agents[tokenId] = AgentConfig({
            name: _name,
            strategyHash: _strategyHash,
            heartbeatInterval: _heartbeatInterval,
            boundAccount: address(0), // Set after TBA deployment
            totalEarnings: 0,
            totalActions: 0,
            active: true
        });

        // Store ERC-7857 iNFT data — serialized strategy descriptor
        _iNFTData[tokenId] = abi.encode(_strategyHash, _heartbeatInterval, block.timestamp);

        emit Transfer(address(0), msg.sender, tokenId);
        emit AgentCreated(tokenId, msg.sender, _name, _strategyHash);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                        AGENT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    function setBoundAccount(uint256 tokenId, address tba) external {
        require(
            msg.sender == owner || msg.sender == tbaRegistry,
            "AgentHavenNFT: unauthorized TBA set"
        );
        _agents[tokenId].boundAccount = tba;
    }

    function getAgentConfig(uint256 tokenId) external view override returns (AgentConfig memory) {
        require(_owners[tokenId] != address(0), "AgentHavenNFT: nonexistent");
        return _agents[tokenId];
    }

    function updateStrategy(uint256 tokenId, string calldata newStrategyHash) external override onlyTokenOwner(tokenId) {
        _agents[tokenId].strategyHash = newStrategyHash;
        _iNFTData[tokenId] = abi.encode(newStrategyHash, _agents[tokenId].heartbeatInterval, block.timestamp);
        emit AgentConfigUpdated(tokenId, newStrategyHash);
    }

    function deactivateAgent(uint256 tokenId) external override onlyTokenOwner(tokenId) {
        _agents[tokenId].active = false;
        emit AgentDeactivated(tokenId);
    }

    /// @notice Records an action execution — called by BaseRelay
    function recordAction(uint256 tokenId, uint256 earnings) external {
        require(msg.sender == baseRelay, "AgentHavenNFT: only relay");
        _agents[tokenId].totalActions++;
        _agents[tokenId].totalEarnings += earnings;
    }

    function totalAgents() external view override returns (uint256) {
        return _tokenIdCounter;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                         ERC-7857 iNFT
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Returns the AI model/brain data associated with this iNFT
    function getINFTData(uint256 tokenId) external view returns (bytes memory) {
        require(_owners[tokenId] != address(0), "AgentHavenNFT: nonexistent");
        return _iNFTData[tokenId];
    }

    /// @notice ERC-7857 supportsInterface check
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x80ac58cd || // ERC-721
            interfaceId == 0x5b5e139f || // ERC-721Metadata
            interfaceId == 0x01ffc9a7 || // ERC-165
            interfaceId == 0x7857beef;   // ERC-7857 iNFT (custom)
    }

    // ═══════════════════════════════════════════════════════════════════
    //                         ERC-721 CORE
    // ═══════════════════════════════════════════════════════════════════

    function balanceOf(address _owner) external view returns (uint256) {
        require(_owner != address(0), "AgentHavenNFT: zero address");
        return _balances[_owner];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "AgentHavenNFT: nonexistent");
        return tokenOwner;
    }

    function approve(address to, uint256 tokenId) external {
        address tokenOwner = _owners[tokenId];
        require(msg.sender == tokenOwner || _operatorApprovals[tokenOwner][msg.sender], "AgentHavenNFT: unauthorized");
        _tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId) external {
        require(_owners[tokenId] == from, "AgentHavenNFT: not owner");
        require(
            msg.sender == from ||
            _tokenApprovals[tokenId] == msg.sender ||
            _operatorApprovals[from][msg.sender],
            "AgentHavenNFT: unauthorized"
        );
        require(to != address(0), "AgentHavenNFT: zero address");

        _tokenApprovals[tokenId] = address(0);
        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "AgentHavenNFT: nonexistent");
        AgentConfig memory config = _agents[tokenId];
        // Returns a data URI with agent metadata for on-chain rendering
        return string(abi.encodePacked(
            "data:application/json;utf8,{\"name\":\"", config.name,
            "\",\"description\":\"AgentHaven Autonomous AI Agent iNFT\",",
            "\"strategy\":\"", config.strategyHash,
            "\",\"heartbeat\":", _uint2str(config.heartbeatInterval),
            ",\"actions\":", _uint2str(config.totalActions),
            ",\"active\":", config.active ? "true" : "false", "}"
        ));
    }

    function _uint2str(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
