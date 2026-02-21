// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title DeFiModules — Modular DeFi Protocol Integrations
/// @notice Library of DeFi actions: Aave v3 supply/withdraw, Compound supply, Uniswap v4 swap.
///         Used by BaseRelay to execute strategy decisions made by 0G AI inference.
/// @dev Each function is designed to be called via delegatecall from the agent's TBA.

// ═══════════════════════════════════════════════════════════════════
//                    EXTERNAL PROTOCOL INTERFACES
// ═══════════════════════════════════════════════════════════════════

interface IAaveV3Pool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    );
}

interface ICompoundComet {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

interface IUniswapV4Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

// ═══════════════════════════════════════════════════════════════════
//                         DEFI MODULES
// ═══════════════════════════════════════════════════════════════════

contract DeFiModules {
    // ── Protocol Addresses (Base Sepolia testnet) ─────────────────
    // These are set during deployment and can be updated by admin
    address public aavePool;
    address public compoundComet;
    address public uniswapRouter;
    address public admin;

    // ── Events ────────────────────────────────────────────────────
    event AaveSupplied(address indexed asset, uint256 amount, address indexed onBehalfOf);
    event AaveWithdrawn(address indexed asset, uint256 amount, address indexed to);
    event CompoundSupplied(address indexed asset, uint256 amount);
    event CompoundWithdrawn(address indexed asset, uint256 amount);
    event UniswapSwapped(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    constructor(address _aavePool, address _compoundComet, address _uniswapRouter) {
        aavePool = _aavePool;
        compoundComet = _compoundComet;
        uniswapRouter = _uniswapRouter;
        admin = msg.sender;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                       AAVE V3 MODULE
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Supply assets to Aave V3 lending pool
    /// @param asset The ERC-20 token to supply
    /// @param amount Amount to supply
    /// @param onBehalfOf Address to credit the supply (the agent's TBA)
    function supplyToAave(address asset, uint256 amount, address onBehalfOf) external returns (bool) {
        IERC20(asset).approve(aavePool, amount);
        IAaveV3Pool(aavePool).supply(asset, amount, onBehalfOf, 0);
        emit AaveSupplied(asset, amount, onBehalfOf);
        return true;
    }

    /// @notice Withdraw assets from Aave V3
    /// @param asset The ERC-20 token to withdraw
    /// @param amount Amount to withdraw (type(uint256).max for all)
    /// @param to Recipient address
    function withdrawFromAave(address asset, uint256 amount, address to) external returns (uint256 withdrawn) {
        withdrawn = IAaveV3Pool(aavePool).withdraw(asset, amount, to);
        emit AaveWithdrawn(asset, withdrawn, to);
    }

    /// @notice Get Aave position data for an account
    function getAavePosition(address user) external view returns (
        uint256 totalCollateral,
        uint256 totalDebt,
        uint256 availableBorrows,
        uint256 healthFactor
    ) {
        (totalCollateral, totalDebt, availableBorrows,,, healthFactor) =
            IAaveV3Pool(aavePool).getUserAccountData(user);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                     COMPOUND V3 MODULE
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Supply assets to Compound V3 (Comet)
    function supplyToCompound(address asset, uint256 amount) external returns (bool) {
        IERC20(asset).approve(compoundComet, amount);
        ICompoundComet(compoundComet).supply(asset, amount);
        emit CompoundSupplied(asset, amount);
        return true;
    }

    /// @notice Withdraw assets from Compound V3
    function withdrawFromCompound(address asset, uint256 amount) external returns (bool) {
        ICompoundComet(compoundComet).withdraw(asset, amount);
        emit CompoundWithdrawn(asset, amount);
        return true;
    }

    /// @notice Get Compound balance
    function getCompoundBalance(address account) external view returns (uint256) {
        return ICompoundComet(compoundComet).balanceOf(account);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                     UNISWAP V4 MODULE
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Swap tokens on Uniswap V4
    /// @param tokenIn Input token address
    /// @param tokenOut Output token address
    /// @param amountIn Amount of input tokens
    /// @param fee Pool fee tier (500, 3000, or 10000)
    /// @param minOut Minimum output amount (slippage protection)
    function swapOnUniswap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee,
        uint256 minOut
    ) external returns (uint256 amountOut) {
        IERC20(tokenIn).approve(uniswapRouter, amountIn);

        amountOut = IUniswapV4Router(uniswapRouter).exactInputSingle(
            IUniswapV4Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );

        emit UniswapSwapped(tokenIn, tokenOut, amountIn, amountOut);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          ADMIN
    // ═══════════════════════════════════════════════════════════════════

    function updateProtocols(address _aave, address _compound, address _uniswap) external {
        require(msg.sender == admin, "DeFi: not admin");
        if (_aave != address(0)) aavePool = _aave;
        if (_compound != address(0)) compoundComet = _compound;
        if (_uniswap != address(0)) uniswapRouter = _uniswap;
    }
}
