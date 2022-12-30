pragma solidity 0.8.6;

import "./IVault.sol";
import "./IPositionRouter.sol";
import "./IOrderBook.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDDL_GMX {
    function vault() external view returns (IVault vault);
    function positionRouter() external view returns (IPositionRouter positionRouter);
    function orderBook() external view returns (IOrderBook orderBook);
    function isLong(uint256 id) external view returns (bool);
    function USDC() external view returns(IERC20 USDC);
}
