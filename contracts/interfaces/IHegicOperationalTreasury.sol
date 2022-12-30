pragma solidity 0.8.6;

interface IHegicOperationalTreasury {
    enum LockedLiquidityState {Unlocked, Locked}

    function lockedLiquidity(uint256 id)
        external
        view
        returns (
            LockedLiquidityState state,
            address strategy,
            uint128 negativepnl,
            uint128 positivepnl,
            uint32 expiration
        );
}
