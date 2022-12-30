pragma solidity 0.8.6;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

interface IHegicStrategy {
    function exercise(uint256 optionID) external;

    function profitOf(uint256 optionID) external view returns (uint256 amount);

    function priceProvider() external view returns (AggregatorV3Interface priceProvider);

    function strategyData(uint256 id) external view returns (uint128 amount, uint128 strike);
}
