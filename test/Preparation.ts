import { ethers, deployments } from "hardhat";
import { BigNumber, BigNumber as BN } from "ethers"
import { ERC20Mock as ERC20 } from "../typechain-types/contracts/Mocks/ERC20Mock";
import { ERC721 } from "../typechain-types/@openzeppelin/contracts/token/ERC721/ERC721";
import { DDL } from "../typechain-types/contracts/DDL";
import { PoolDDL } from "../typechain-types/contracts/PoolDDL";
import { AccountManager } from "../typechain-types/contracts/AccountManager";
import { Timelock } from "../typechain-types/contracts/gmx/peripherals/Timelock";
import { USDG } from "../typechain-types/contracts/gmx/tokens/USDG";
import { OrderBook } from "../typechain-types/contracts/gmx/core/OrderBook";
import { Vault } from "../typechain-types/contracts/gmx/core/Vault";
import { VaultPriceFeed } from "../typechain-types/contracts/gmx/core/VaultPriceFeed";
import { VaultErrorController } from "../typechain-types/contracts/gmx/core/VaultErrorController";
import { PositionRouter } from "../typechain-types/contracts/gmx/core/PositionRouter";
import { Router } from "../typechain-types/contracts/gmx/core/Router";
import { PriceFeed } from "../typechain-types/contracts/gmx/oracle/PriceFeed";
import { errors } from "./GmxErrors";
import { parseUnits } from "ethers/lib/utils";

export const fixture = deployments.createFixture(async ({ deployments }) => {
    await deployments.fixture(["ddl-pool"])

    const [
        deployer,
        alice,
        wallet,
        liquidator,
        bob,
        jon,
        liza,
        coverAddress,
        positionKeeper,
        executionFeeReceiver,
        executor
    ] = await ethers.getSigners()
    return {
        deployer,
        alice,
        bob,
        jon,
        liza,
        wallet,
        liquidator,
        coverAddress,
        positionKeeper,
        executionFeeReceiver,
        executor,
        positionRouter: (await ethers.getContract("positionRouter")) as PositionRouter,
        USDCPriceFeed: (await ethers.getContract("USDCPriceFeed")) as PriceFeed,
        USDTPriceFeed: (await ethers.getContract("USDTPriceFeed")) as PriceFeed,
        FRAXPriceFeed: (await ethers.getContract("FRAXPriceFeed")) as PriceFeed,
        DAIPriceFeed: (await ethers.getContract("DAIPriceFeed")) as PriceFeed,
        WETHPriceFeed: (await ethers.getContract("WETHPriceFeed")) as PriceFeed,
        WBTCPriceFeed: (await ethers.getContract("WBTCPriceFeed")) as PriceFeed,
        LINKPriceFeed: (await ethers.getContract("LINKPriceFeed")) as PriceFeed,
        UNIPriceFeed: (await ethers.getContract("UNIPriceFeed")) as PriceFeed,
        vault: (await ethers.getContract("vault")) as Vault,
        vaultPriceFeed: (await ethers.getContract("vaultPriceFeed")) as VaultPriceFeed,
        vaultErrorController: (await ethers.getContract("vaultErrorController")) as VaultErrorController,
        router: (await ethers.getContract("router")) as Router,
        orderBook: (await ethers.getContract("orderBook")) as OrderBook,
        usdg: (await ethers.getContract("usdg")) as USDG,
        timelock: (await ethers.getContract("timelock")) as Timelock,
        USDC: (await ethers.getContract("USDC")) as ERC20,
        USDT: (await ethers.getContract("USDT")) as ERC20,
        FRAX: (await ethers.getContract("FRAX")) as ERC20,
        DAI: (await ethers.getContract("DAI")) as ERC20,
        WETH: (await ethers.getContract("WETH")) as ERC20,
        WBTC: (await ethers.getContract("WBTC")) as ERC20,
        LINK: (await ethers.getContract("LINK")) as ERC20,
        UNI: (await ethers.getContract("UNI")) as ERC20,
        DDL_GMX: (await ethers.getContract("DDL_GMX")) as DDL,
        AccountManager: (await ethers.getContract("accountManager")) as AccountManager,
        AccountManagerToken: (await ethers.getContract("accountManagerToken")) as ERC721,
        PoolDDL: (await ethers.getContract("DDL_POOL")) as PoolDDL
    }
})


export async function preparation(contracts: Awaited<ReturnType<typeof fixture>>) {
    const {
        deployer,
        alice,
        bob,
        positionRouter,
        liquidator,
        USDC,
        USDT,
        FRAX,
        DAI,
        WETH,
        WBTC,
        LINK,
        UNI,
        vault,
        router,
        orderBook,
        usdg,
        timelock,
        wallet,
        AccountManager,
        PoolDDL,
        coverAddress,
        positionKeeper,
        vaultPriceFeed,
        USDCPriceFeed,
        USDTPriceFeed,
        FRAXPriceFeed,
        DAIPriceFeed,
        WETHPriceFeed,
        WBTCPriceFeed,
        LINKPriceFeed,
        UNIPriceFeed,
        vaultErrorController,
        executor
    } = contracts
    await newPriceUSDC(1e8, contracts)
    await newPriceUSDT(1e8, contracts)
    await newPriceFRAX(1e8, contracts)
    await newPriceDAI(1e8, contracts)
    await newPriceWETH(parseUnits("1000", 8), contracts)
    await newPriceWBTC(parseUnits("20000", 8), contracts)
    await newPriceLINK(parseUnits("5.95", 8), contracts)
    await newPriceUNI(parseUnits("8", 8), contracts)

    await vault.setTokenConfig(USDC.address, 6, 10000, 75, 0, true, false)
    await vault.setTokenConfig(USDT.address, 6, 10000, 75, 0, true, false)
    await vault.setTokenConfig(FRAX.address, 18, 10000, 75, 0, true, false)
    await vault.setTokenConfig(DAI.address, 18, 10000, 75, 0, true, false)
    await vault.setTokenConfig(WETH.address, 18, 10000, 75, 0, false, true)
    await vault.setTokenConfig(WBTC.address, 8, 10000, 75, 0, false, true)
    await vault.setTokenConfig(LINK.address, 18, 10000, 75, 0, false, true)
    await vault.setTokenConfig(UNI.address, 18, 10000, 75, 0, false, true)

    await vaultPriceFeed.setTokenConfig(USDC.address, USDCPriceFeed.address, 8, false)
    await vaultPriceFeed.setTokenConfig(USDT.address, USDTPriceFeed.address, 8, false)
    await vaultPriceFeed.setTokenConfig(FRAX.address, FRAXPriceFeed.address, 8, false)
    await vaultPriceFeed.setTokenConfig(DAI.address, DAIPriceFeed.address, 8, false)
    await vaultPriceFeed.setTokenConfig(WETH.address, WETHPriceFeed.address, 8, false)
    await vaultPriceFeed.setTokenConfig(WBTC.address, WBTCPriceFeed.address, 8, false)
    await vaultPriceFeed.setTokenConfig(LINK.address, LINKPriceFeed.address, 8, false)
    await vaultPriceFeed.setTokenConfig(UNI.address, UNIPriceFeed.address, 8, false)

    await vaultPriceFeed.setPriceSampleSpace(1)

    let count = ethers.utils.parseUnits("20000000000", 18)
    let approveAmount = ethers.constants.MaxUint256

    await WETH.mintTo(alice.address, count)
    await USDC.mintTo(alice.address, count)
    await USDT.mintTo(alice.address, count)
    await FRAX.mintTo(alice.address, count)
    await DAI.mintTo(alice.address, count)
    await USDC.mintTo(bob.address, count)
    await USDT.mintTo(bob.address, count)
    await FRAX.mintTo(bob.address, count)
    await DAI.mintTo(bob.address, count)

    await WBTC.mintTo(alice.address, count)
    await LINK.mintTo(alice.address, count)
    await UNI.mintTo(alice.address, count)

    await USDC.mintTo(coverAddress.address, count)
    await USDT.mintTo(coverAddress.address, count)
    await FRAX.mintTo(coverAddress.address, count)
    await DAI.mintTo(coverAddress.address, count)
    await WETH.mintTo(coverAddress.address, count)
    await WBTC.mintTo(coverAddress.address, count)
    await LINK.mintTo(coverAddress.address, count)
    await UNI.mintTo(coverAddress.address, count)

    await USDC.connect(alice).transfer(vault.address, count.div(10))
    await vault.connect(alice).directPoolDeposit(USDC.address)
    await USDT.connect(alice).transfer(vault.address, count.div(10))
    await vault.connect(alice).directPoolDeposit(USDT.address)
    await FRAX.connect(alice).transfer(vault.address, count.div(10))
    await vault.connect(alice).directPoolDeposit(FRAX.address)
    await DAI.connect(alice).transfer(vault.address, count.div(10))
    await vault.connect(alice).directPoolDeposit(DAI.address)
    await WETH.connect(alice).transfer(vault.address, count.div(10))
    await vault.connect(alice).directPoolDeposit(WETH.address)
    await WBTC.connect(alice).transfer(vault.address, count.div(10))
    await vault.connect(alice).directPoolDeposit(WBTC.address)
    await LINK.connect(alice).transfer(vault.address, count.div(10))
    await vault.connect(alice).directPoolDeposit(LINK.address)
    await UNI.connect(alice).transfer(vault.address, count.div(10))
    await vault.connect(alice).directPoolDeposit(UNI.address)

    await USDC.connect(alice).approve(router.address, approveAmount)
    await USDT.connect(alice).approve(router.address, approveAmount)
    await FRAX.connect(alice).approve(router.address, approveAmount)
    await DAI.connect(alice).approve(router.address, approveAmount)

    await USDC.connect(bob).approve(router.address, approveAmount)
    await USDT.connect(bob).approve(router.address, approveAmount)
    await FRAX.connect(bob).approve(router.address, approveAmount)
    await DAI.connect(bob).approve(router.address, approveAmount)

    await WETH.connect(alice).approve(router.address, approveAmount)
    await WBTC.connect(alice).approve(router.address, approveAmount)
    await LINK.connect(alice).approve(router.address, approveAmount)
    await UNI.connect(alice).approve(router.address, approveAmount)

    await USDC.connect(alice).approve(AccountManager.address, approveAmount)
    await USDT.connect(alice).approve(AccountManager.address, approveAmount)
    await FRAX.connect(alice).approve(AccountManager.address, approveAmount)
    await DAI.connect(alice).approve(AccountManager.address, approveAmount)
    await USDC.connect(bob).approve(AccountManager.address, approveAmount)
    await USDT.connect(bob).approve(AccountManager.address, approveAmount)
    await FRAX.connect(bob).approve(AccountManager.address, approveAmount)
    await DAI.connect(bob).approve(AccountManager.address, approveAmount)
    await WETH.connect(alice).approve(AccountManager.address, approveAmount)
    await WBTC.connect(alice).approve(AccountManager.address, approveAmount)
    await LINK.connect(alice).approve(AccountManager.address, approveAmount)
    await UNI.connect(alice).approve(AccountManager.address, approveAmount)

    await USDC.connect(coverAddress).approve(AccountManager.address, approveAmount)
    await USDT.connect(coverAddress).approve(AccountManager.address, approveAmount)
    await FRAX.connect(coverAddress).approve(AccountManager.address, approveAmount)
    await DAI.connect(coverAddress).approve(AccountManager.address, approveAmount)


    let firstValue = BN.from("30000000000000000000000")
    let secondValue = BN.from("29000000000000000000000")
    await router.connect(alice).swap([USDC.address, usdg.address], firstValue, secondValue, alice.address)
    await router.connect(alice).swap([USDT.address, usdg.address], firstValue, secondValue, alice.address)
    await router.connect(alice).swap([FRAX.address, usdg.address], firstValue, secondValue, alice.address)
    await router.connect(alice).swap([DAI.address, usdg.address], firstValue, secondValue, alice.address)
    await router.connect(alice).swap([WETH.address, usdg.address], firstValue, secondValue, alice.address)
    await router.connect(alice).swap([WBTC.address, usdg.address], firstValue, secondValue, alice.address)
    await router.connect(alice).swap([LINK.address, usdg.address], firstValue, secondValue, alice.address)
    await router.connect(alice).swap([UNI.address, usdg.address], firstValue, secondValue, alice.address)
    await router.connect(alice).approvePlugin(orderBook.address)
    await router.connect(alice).approvePlugin(positionRouter.address)
    await router.connect(deployer).approvePlugin(positionRouter.address)
    await router.connect(deployer).approvePlugin(AccountManager.address)
    await router.addPlugin(positionRouter.address)
    await router.addPlugin(AccountManager.address)

    await vault.setGov(deployer.address)
    await vault.connect(deployer).setErrorController(vaultErrorController.address)
    await vaultErrorController.setErrors(vault.address, errors)
    await vault.setIsLeverageEnabled(true)
    await vault.connect(deployer).setGov(timelock.address)

    await timelock.connect(wallet).setShouldToggleIsLeverageEnabled(true, { gasLimit: 1000000 })
    await timelock.connect(wallet).setInPrivateLiquidationMode(vault.address, false, { gasLimit: 1000000 })
    await timelock.connect(wallet).setLiquidator(vault.address, liquidator.address, true, { gasLimit: 1000000 })
    await timelock.connect(wallet).setContractHandler(positionRouter.address, true, { gasLimit: 1000000 })

    await positionRouter.setPositionKeeper(deployer.address, true)
    await positionRouter.setPositionKeeper(positionKeeper.address, true)
    await positionRouter.setCallbackGasLimit(10000000)
    await positionRouter.setDelayValues(0, 300, 500)

    await USDC.mintTo(bob.address, count)
    await USDT.mintTo(bob.address, count)
    await FRAX.mintTo(bob.address, count)
    await DAI.mintTo(bob.address, count)
    await WETH.mintTo(bob.address, count)
    await WBTC.mintTo(bob.address, count)
    await LINK.mintTo(bob.address, count)
    await UNI.mintTo(bob.address, count)

    await USDC.connect(bob).approve(AccountManager.address, approveAmount)
    await USDT.connect(bob).approve(AccountManager.address, approveAmount)
    await FRAX.connect(bob).approve(AccountManager.address, approveAmount)
    await DAI.connect(bob).approve(AccountManager.address, approveAmount)
    await WETH.connect(bob).approve(AccountManager.address, approveAmount)
    await WBTC.connect(bob).approve(AccountManager.address, approveAmount)
    await LINK.connect(bob).approve(AccountManager.address, approveAmount)
    await UNI.connect(bob).approve(AccountManager.address, approveAmount)

    await USDC.connect(alice).approve(PoolDDL.address, approveAmount);
    await USDT.connect(alice).approve(PoolDDL.address, approveAmount);
    await FRAX.connect(alice).approve(PoolDDL.address, approveAmount);
    await DAI.connect(alice).approve(PoolDDL.address, approveAmount);
    await USDC.connect(bob).approve(PoolDDL.address, approveAmount);
    await USDT.connect(bob).approve(PoolDDL.address, approveAmount);
    await FRAX.connect(bob).approve(PoolDDL.address, approveAmount);
    await DAI.connect(bob).approve(PoolDDL.address, approveAmount);

    await PoolDDL.connect(alice).provideFrom(ethers.utils.parseUnits("10000000", 6), 0)
    await AccountManager.connect(bob).createDoppelgangerGMX()
    let doppelgangerAddress = await AccountManager.doppelgangerMap(bob.address)
    let bobContract = await ethers.getContractAt("Doppelganger", doppelgangerAddress);
    await bobContract.approveAll(approveAmount)
}

export async function newPriceUSDC(
    price: number,
    contracts: Awaited<ReturnType<typeof fixture>>,
) {
    for (let i = 0; i < 3; i++) await contracts.USDCPriceFeed.setLatestAnswer(price)
}

export async function newPriceUSDT(
    price: number,
    contracts: Awaited<ReturnType<typeof fixture>>,
) {
    for (let i = 0; i < 3; i++) await contracts.USDTPriceFeed.setLatestAnswer(price)
}

export async function newPriceFRAX(
    price: number,
    contracts: Awaited<ReturnType<typeof fixture>>,
) {
    for (let i = 0; i < 3; i++) await contracts.FRAXPriceFeed.setLatestAnswer(price)
}

export async function newPriceDAI(
    price: number,
    contracts: Awaited<ReturnType<typeof fixture>>,
) {
    for (let i = 0; i < 3; i++) await contracts.DAIPriceFeed.setLatestAnswer(price)
}

export async function newPriceWETH(
    price: BigNumber,
    contracts: Awaited<ReturnType<typeof fixture>>,
) {
    for (let i = 0; i < 3; i++) await contracts.WETHPriceFeed.setLatestAnswer(price)
}

export async function newPriceWBTC(
    price: BigNumber,
    contracts: Awaited<ReturnType<typeof fixture>>,
) {
    for (let i = 0; i < 3; i++) await contracts.WBTCPriceFeed.setLatestAnswer(price)
}

export async function newPriceLINK(
    price: BigNumber,
    contracts: Awaited<ReturnType<typeof fixture>>,
) {
    for (let i = 0; i < 3; i++) await contracts.LINKPriceFeed.setLatestAnswer(price)
}

export async function newPriceUNI(
    price: BigNumber,
    contracts: Awaited<ReturnType<typeof fixture>>,
) {
    for (let i = 0; i < 3; i++) await contracts.UNIPriceFeed.setLatestAnswer(price)
}