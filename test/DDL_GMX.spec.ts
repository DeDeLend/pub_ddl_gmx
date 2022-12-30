import { ethers, timeAndMine } from "hardhat";
import { solidity } from "ethereum-waffle";
import chai from "chai";
import { parseUnits } from "ethers/lib/utils";
import { newPriceLINK, newPriceUNI, newPriceWBTC, newPriceWETH } from "./Preparation";
import { preparation } from "./Preparation";
import { fixture } from "./Preparation";

chai.use(solidity);
const { expect } = chai;

describe("DDL_GMX.ts", async () => {

    const direction = {
        long: true,
        short: false,
    }

    const minOut = 0
    const referralCode = "0x0000000000000000000000000000000000000000000000000000000000000000"


    describe("General Functionality", async () => {
        let contracts: Awaited<ReturnType<typeof fixture>>;

        beforeEach(async () => {
            contracts = await fixture();
            await preparation(contracts)
            const usdcPath = [contracts.USDC.address]
            const ethIndexToken = contracts.WETH.address
            const usdcAmountIn = parseUnits("10000", 6)
            const sizeDelta = parseUnits("10000", 30)
            const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
            const bobContract = await ethers.getContractAt("Doppelganger", doppelgangerAddress);
            await bobContract.approveAll("1000000000000000000000000")
            const id = await bobContract.keyByIndexToken(contracts.WETH.address, direction.short)
            const gmx_price = await contracts.AccountManager.currentPrice(id)
            const minExecutionFee = await contracts.positionRouter.minExecutionFee()
            await contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                usdcPath,
                ethIndexToken,
                usdcAmountIn,
                minOut,
                sizeDelta,
                direction.short,
                gmx_price,
                minExecutionFee,
                referralCode,
                { value: minExecutionFee }
            )
            const indexIncrease = await contracts.positionRouter.increasePositionsIndex(doppelgangerAddress)
            const requestKey = await contracts.positionRouter.getRequestKey(doppelgangerAddress, indexIncrease)
            await contracts.positionRouter.connect(contracts.positionKeeper).executeIncreasePosition(requestKey, contracts.executionFeeReceiver.address)
            await newPriceWETH(parseUnits("900", 8), contracts)
        });

        it("Should set new interest rate", async () => {
            const {
                deployer,
                DDL_GMX,
            } = contracts
            await DDL_GMX.connect(deployer).setInterestRate(parseUnits("100", 30))
            expect(await DDL_GMX.interestRate()).to.be.eq(parseUnits("100", 30))
        })


        it("Should revert borrow when amount is less than min.borrow size", async () => {
            const {
                bob,
                DDL_GMX,
                AccountManager,
                WETH,
                AccountManagerToken,
            } = contracts
            const amountToBorrow = parseUnits("49", 6)
            const doppelgangerAddress = await AccountManager.doppelgangerMap(bob.address)
            const bobContract = await ethers.getContractAt("Doppelganger", doppelgangerAddress);
            const id = bobContract.keyByIndexToken(WETH.address, direction.short)

            await AccountManagerToken.connect(bob).approve(DDL_GMX.address, id)
            await DDL_GMX.connect(bob).lockCollateral(id)
            await expect(DDL_GMX.connect(bob).borrow(id, amountToBorrow)).to.be.revertedWith("amount less minBorrowLimit")
        })


        it("Should revert borrow when the borrow size exceeds max.borrow limit", async () => {
            const {
                bob,
                DDL_GMX,
                AccountManager,
                WETH,
                AccountManagerToken,
            } = contracts
            const maxBorrowLimit = parseUnits("500", 6)
            const amountToBorrow = parseUnits("501", 6)
            const doppelgangerAddress = await AccountManager.doppelgangerMap(bob.address)
            const bobContract = await ethers.getContractAt("Doppelganger", doppelgangerAddress);
            const id = bobContract.keyByIndexToken(WETH.address, direction.short)

            await AccountManagerToken.connect(bob).approve(DDL_GMX.address, id)
            await DDL_GMX.connect(bob).lockCollateral(id)

            expect(await DDL_GMX.maxBorrowLimit(id)).to.be.eq(maxBorrowLimit)
            await expect(DDL_GMX.connect(bob).borrow(id, amountToBorrow)).to.be.revertedWith("borrow is too big")
        })

        it("Should revert borrow when intinsic values of the collateral is negative", async () => {
            const {
                bob,
                DDL_GMX,
                AccountManager,
                WETH,
                AccountManagerToken,
            } = contracts
            const maxBorrowLimit = parseUnits("0", 6)
            const amountToBorrow = parseUnits("100", 6)
            const doppelgangerAddress = await AccountManager.doppelgangerMap(bob.address)
            const bobContract = await ethers.getContractAt("Doppelganger", doppelgangerAddress);
            const id = bobContract.keyByIndexToken(WETH.address, direction.short)

            await newPriceWETH(parseUnits("1200", 8), contracts)

            await AccountManagerToken.connect(bob).approve(DDL_GMX.address, id)
            await DDL_GMX.connect(bob).lockCollateral(id)

            expect(await DDL_GMX.maxBorrowLimit(id)).to.be.eq(maxBorrowLimit)
            await expect(DDL_GMX.connect(bob).borrow(id, amountToBorrow)).to.be.revertedWith("borrow is too big")
        })

        it("Should revert borrow when intinsic values of the collateral = 0", async () => {
            const {
                bob,
                DDL_GMX,
                AccountManager,
                WETH,
                AccountManagerToken,
            } = contracts
            const maxBorrowLimit = parseUnits("0", 6)
            const amountToBorrow = parseUnits("100", 6)
            const doppelgangerAddress = await AccountManager.doppelgangerMap(bob.address)
            const bobContract = await ethers.getContractAt("Doppelganger", doppelgangerAddress);
            const id = bobContract.keyByIndexToken(WETH.address, direction.short)

            await newPriceWETH(parseUnits("1000", 8), contracts)

            await AccountManagerToken.connect(bob).approve(DDL_GMX.address, id)
            await DDL_GMX.connect(bob).lockCollateral(id)

            expect(await DDL_GMX.maxBorrowLimit(id)).to.be.eq(maxBorrowLimit)
            await expect(DDL_GMX.connect(bob).borrow(id, amountToBorrow)).to.be.revertedWith("borrow is too big")
        })


        it("Should charge correct interest fee from the user", async () => {
            const {
                USDC,
                bob,
                DDL_GMX,
                AccountManager,
                WETH,
                AccountManagerToken,
                PoolDDL,
            } = contracts
            const amountToBorrow = parseUnits("500", 6)
            const fees = parseUnits("50", 6)
            const doppelgangerAddress = await AccountManager.doppelgangerMap(bob.address)
            const bobContract = await ethers.getContractAt("Doppelganger", doppelgangerAddress);
            const id = bobContract.keyByIndexToken(WETH.address, direction.short)

            await AccountManagerToken.connect(bob).approve(DDL_GMX.address, id)
            await DDL_GMX.connect(bob).lockCollateral(id)
            await DDL_GMX.connect(bob).borrow(id, amountToBorrow)
            await timeAndMine.setTimeIncrease("365d")
            await USDC.connect(bob).approve(DDL_GMX.address, ethers.constants.MaxUint256)

            await expect(() =>
                DDL_GMX.connect(bob).repay(id, amountToBorrow),
            ).changeTokenBalances(
                USDC,
                [bob, PoolDDL],
                [-500e6, 500e6],
            )
            await expect(() =>
                DDL_GMX.connect(bob).repay(id, fees),
            ).changeTokenBalances(
                USDC,
                [bob, PoolDDL],
                [-50e6, 50e6],
            )
        })

    })

    describe("Should correct liquidate ETH-SHORT position", async () => {
        let contracts: Awaited<ReturnType<typeof fixture>>;

        beforeEach(async () => {
            contracts = await fixture();
            await preparation(contracts)
            await newPriceWETH(parseUnits("1000", 8), contracts)
            const usdcPath = [contracts.USDC.address]
            const ethIndexToken = contracts.WETH.address
            const usdcAmountIn = parseUnits("10000", 6)
            const sizeDelta = parseUnits("10000", 30)
            const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
            const bobContract = await ethers.getContractAt("Doppelganger", doppelgangerAddress);
            await bobContract.approveAll("1000000000000000000000000")
            const id = await bobContract.keyByIndexToken(contracts.WETH.address, direction.short)
            const gmx_price = await contracts.AccountManager.currentPrice(id)
            const minExecutionFee = await contracts.positionRouter.minExecutionFee()
            await contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                usdcPath,
                ethIndexToken,
                usdcAmountIn,
                minOut,
                sizeDelta,
                direction.short,
                gmx_price,
                minExecutionFee,
                referralCode,
                { value: minExecutionFee }
            )
            const indexIncrease = await contracts.positionRouter.increasePositionsIndex(doppelgangerAddress)
            const requestKey = await contracts.positionRouter.getRequestKey(doppelgangerAddress, indexIncrease)
            await contracts.positionRouter.connect(contracts.positionKeeper).executeIncreasePosition(requestKey, contracts.executionFeeReceiver.address)
            await newPriceWETH(parseUnits("900", 8), contracts)
        });

        it("Should close the loan by the Border Price", async () => {

            await contracts.DDL_GMX.setBorderPriceCoef(2, contracts.WETH.address)
            const minExecutionFee = await contracts.positionRouter.minExecutionFee()
            const amountToBorrow = parseUnits("50", 6)
            const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
            const bobContract = await ethers.getContractAt("Doppelganger", doppelgangerAddress);
            const id = await bobContract.keyByIndexToken(contracts.WETH.address, direction.short)

            await contracts.AccountManagerToken.connect(contracts.bob).approve(contracts.DDL_GMX.address, id)
            await contracts.DDL_GMX.connect(contracts.bob).lockCollateral(id)
            await contracts.DDL_GMX.connect(contracts.bob).borrow(id, amountToBorrow)

            const expectedPrice = parseUnits("980", 8)
            expect(await contracts.DDL_GMX.currentTriggerPrice(id)).to.be.eq(expectedPrice)
            await newPriceWETH(parseUnits("981", 8), contracts)

            const liqRevenue = parseUnits("5", 6)
            const poolRevenue = parseUnits("50", 6)
            const userCollateralAndProfits = parseUnits("10115", 6)

            await contracts.DDL_GMX.connect(contracts.alice).liquidateByBorderPrice(id, { value: minExecutionFee })
            const indexDecrease = await contracts.positionRouter.decreasePositionsIndex(doppelgangerAddress)
            const requestKey = await contracts.positionRouter.getRequestKey(doppelgangerAddress, indexDecrease)
            await expect(() =>
                contracts.positionRouter.connect(contracts.positionKeeper).executeDecreasePosition(requestKey, contracts.executionFeeReceiver.address)
            ).changeTokenBalances(
                contracts.USDC,
                [contracts.alice, contracts.PoolDDL, contracts.bob],
                [liqRevenue, poolRevenue, userCollateralAndProfits],
            )
            expect(await contracts.AccountManagerToken.ownerOf(id)).to.be.eq(contracts.bob.address)
        })


        it("Should liquidate the loan", async () => {

            await newPriceWETH(parseUnits("800", 8), contracts)

            const minExecutionFee = await contracts.positionRouter.minExecutionFee()
            const amountToBorrow = parseUnits("1000", 6)
            const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
            const bobContract = await ethers.getContractAt("Doppelganger", doppelgangerAddress);
            const id = bobContract.keyByIndexToken(contracts.WETH.address, direction.short)

            await contracts.AccountManagerToken.connect(contracts.bob).approve(contracts.DDL_GMX.address, id)
            await contracts.DDL_GMX.connect(contracts.bob).lockCollateral(id)
            await contracts.DDL_GMX.connect(contracts.bob).borrow(id, amountToBorrow)

            const expectedLiqPrice = parseUnits("880", 8)
            expect(await contracts.DDL_GMX.liqPrice(id)).to.be.eq(expectedLiqPrice)

            await newPriceWETH(parseUnits("881", 8), contracts)
            const liqRevenue = parseUnits("19", 6)
            const poolRevenue = parseUnits("1171", 6)
            const userCollateralAndProfits = parseUnits("9980", 6)

            await contracts.DDL_GMX.connect(contracts.alice).liquidate(id, { value: minExecutionFee })
            const indexDecrease = await contracts.positionRouter.decreasePositionsIndex(doppelgangerAddress)
            const requestKey = await contracts.positionRouter.getRequestKey(doppelgangerAddress, indexDecrease)

            await expect(() =>
                contracts.positionRouter.connect(contracts.positionKeeper).executeDecreasePosition(requestKey, contracts.executionFeeReceiver.address)
            ).changeTokenBalances(
                contracts.USDC,
                [contracts.alice, contracts.PoolDDL, contracts.bob],
                [liqRevenue, poolRevenue, userCollateralAndProfits],
            )
            expect(await contracts.AccountManagerToken.ownerOf(id)).to.be.eq(contracts.bob.address)
        })

        it("Should liquidate the loan when the position is in loss", async () => {

            await newPriceWETH(parseUnits("800", 8), contracts)

            const minExecutionFee = await contracts.positionRouter.minExecutionFee()
            const amountToBorrow = parseUnits("1000", 6)
            const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
            const bobContract = await ethers.getContractAt("Doppelganger", doppelgangerAddress);
            const id = bobContract.keyByIndexToken(contracts.WETH.address, direction.short)

            await contracts.AccountManagerToken.connect(contracts.bob).approve(contracts.DDL_GMX.address, id)
            await contracts.DDL_GMX.connect(contracts.bob).lockCollateral(id)
            await contracts.DDL_GMX.connect(contracts.bob).borrow(id, amountToBorrow)

            await newPriceWETH(parseUnits("1100", 8), contracts)
            const liqRevenue = parseUnits("0", 6)
            const poolRevenue = parseUnits("1000", 6)
            const userCollateralAndProfits = parseUnits("7980", 6)

            await contracts.DDL_GMX.connect(contracts.alice).liquidate(id, { value: minExecutionFee })
            const indexDecrease = await contracts.positionRouter.decreasePositionsIndex(doppelgangerAddress)
            const requestKey = await contracts.positionRouter.getRequestKey(doppelgangerAddress, indexDecrease)

            await expect(() =>
                contracts.positionRouter.connect(contracts.positionKeeper).executeDecreasePosition(requestKey, contracts.executionFeeReceiver.address)
            ).changeTokenBalances(
                contracts.USDC,
                [contracts.alice, contracts.PoolDDL, contracts.bob],
                [liqRevenue, poolRevenue, userCollateralAndProfits],
            )
            expect(await contracts.AccountManagerToken.ownerOf(id)).to.be.eq(contracts.bob.address)
        })

    })


    describe("Should correct liquidate ETH-LONG position", async () => {
        let contracts: Awaited<ReturnType<typeof fixture>>;

        beforeEach(async () => {
            contracts = await fixture();
            await newPriceWETH(parseUnits("1000", 8), contracts)
            await preparation(contracts)

            const wethPath = [contracts.WETH.address]
            const ethIndexToken = contracts.WETH.address
            const ethAmountIn = parseUnits("2", 18)
            const sizeDelta = parseUnits("2000", 30)
            const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
            const bobContract = await ethers.getContractAt("Doppelganger", doppelgangerAddress);
            await bobContract.approveAll("1000000000000000000000000")
            const id = await bobContract.keyByIndexToken(contracts.WETH.address, direction.long)
            const gmx_price = await contracts.AccountManager.currentPrice(id)
            const minExecutionFee = await contracts.positionRouter.minExecutionFee()

            await contracts.AccountManager.connect(contracts.bob).createIncreasePositionETH(
                wethPath,
                ethIndexToken,
                ethAmountIn,
                0,
                sizeDelta,
                direction.long,
                gmx_price.mul(101).div(100),
                minExecutionFee,
                referralCode,
                { value: ethAmountIn.add(minExecutionFee) }
            )

            const indexIncrease = await contracts.positionRouter.increasePositionsIndex(doppelgangerAddress)
            const requestKey = await contracts.positionRouter.getRequestKey(doppelgangerAddress, indexIncrease)
            await contracts.positionRouter.connect(contracts.positionKeeper).executeIncreasePosition(requestKey, contracts.executionFeeReceiver.address)
            await newPriceWETH(parseUnits("1500", 8), contracts)
        });


        it("Should close the loan by the Border Price", async () => {

            await contracts.DDL_GMX.setBorderPriceCoef(4, contracts.WETH.address)

            const minExecutionFee = await contracts.positionRouter.minExecutionFee()
            const amountToBorrow = parseUnits("50", 6)
            const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
            const bobContract = await ethers.getContractAt("Doppelganger", doppelgangerAddress);
            const id = await bobContract.keyByIndexToken(contracts.WETH.address, direction.long)

            await contracts.AccountManagerToken.connect(contracts.bob).approve(contracts.DDL_GMX.address, id)
            await contracts.DDL_GMX.connect(contracts.bob).lockCollateral(id)
            await contracts.DDL_GMX.connect(contracts.bob).borrow(id, amountToBorrow)

            await newPriceWETH(parseUnits("1040", 8), contracts)

            const liqRevenue = parseUnits("5", 6)
            const poolRevenue = parseUnits("50", 6)
            const userCollateralAndProfits = parseUnits("2014.771999", 6)

            await contracts.DDL_GMX.connect(contracts.alice).liquidateByBorderPrice(id, { value: minExecutionFee })
            const indexDecrease = await contracts.positionRouter.decreasePositionsIndex(doppelgangerAddress)
            const requestKey = await contracts.positionRouter.getRequestKey(doppelgangerAddress, indexDecrease)
            await expect(() =>
                contracts.positionRouter.connect(contracts.positionKeeper).executeDecreasePosition(requestKey, contracts.executionFeeReceiver.address)
            ).changeTokenBalances(
                contracts.USDC,
                [contracts.alice, contracts.PoolDDL, contracts.bob],
                [liqRevenue, poolRevenue, userCollateralAndProfits],
            )
            expect(await contracts.AccountManagerToken.ownerOf(id)).to.be.eq(contracts.bob.address)
        })


        it("Should liquidate the loan", async () => {

            await newPriceWETH(parseUnits("1500", 8), contracts)

            const minExecutionFee = await contracts.positionRouter.minExecutionFee()
            const amountToBorrow = parseUnits("500", 6)
            const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
            const bobContract = await ethers.getContractAt("Doppelganger", doppelgangerAddress);
            const id = bobContract.keyByIndexToken(contracts.WETH.address, direction.long)

            await contracts.AccountManagerToken.connect(contracts.bob).approve(contracts.DDL_GMX.address, id)
            await contracts.DDL_GMX.connect(contracts.bob).lockCollateral(id)
            await contracts.DDL_GMX.connect(contracts.bob).borrow(id, amountToBorrow)

            const expectedLiqPrice = parseUnits("1300", 8)
            expect(await contracts.DDL_GMX.liqPrice(id)).to.be.eq(expectedLiqPrice)

            await newPriceWETH(parseUnits("1300", 8), contracts)
            const liqRevenue = parseUnits("10", 6)
            const poolRevenue = parseUnits("590", 6)
            const userCollateralAndProfits = parseUnits("1988.211999", 6)

            await contracts.DDL_GMX.connect(contracts.alice).liquidate(id, { value: minExecutionFee })
            const indexDecrease = await contracts.positionRouter.decreasePositionsIndex(doppelgangerAddress)
            const requestKey = await contracts.positionRouter.getRequestKey(doppelgangerAddress, indexDecrease)
            await expect(() =>
                contracts.positionRouter.connect(contracts.positionKeeper).executeDecreasePosition(requestKey, contracts.executionFeeReceiver.address)
            ).changeTokenBalances(
                contracts.USDC,
                [contracts.alice, contracts.PoolDDL, contracts.bob],
                [liqRevenue, poolRevenue, userCollateralAndProfits],
            )
            expect(await contracts.AccountManagerToken.ownerOf(id)).to.be.eq(contracts.bob.address)

        })
    })

    describe("Should correct calculate Border Price for each asset", async () => {
        let contracts: Awaited<ReturnType<typeof fixture>>;

        beforeEach(async () => {
            contracts = await fixture();
            await preparation(contracts)

            await contracts.DDL_GMX.setBorderPriceCoef(3, contracts.WETH.address)


            await newPriceWETH(parseUnits("1000", 8), contracts)
            const minExecutionFee = await contracts.positionRouter.minExecutionFee()
            const usdcPath = [contracts.USDC.address]
            const ethIndexToken = contracts.WETH.address
            const usdcAmountIn = parseUnits("10000", 6)
            const sizeDelta = parseUnits("10000", 30)
            const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
            const bobContract = await ethers.getContractAt("Doppelganger", doppelgangerAddress);
            await bobContract.approveAll("1000000000000000000000000")
            const ethShortId = await bobContract.keyByIndexToken(contracts.WETH.address, direction.short)
            const ethlongIdPrice = await contracts.AccountManager.currentPrice(ethShortId)
            await contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                usdcPath,
                ethIndexToken,
                usdcAmountIn,
                minOut,
                sizeDelta,
                direction.short,
                ethlongIdPrice,
                minExecutionFee,
                referralCode,
                { value: minExecutionFee }
            )
            const ethIndexIncrease = await contracts.positionRouter.increasePositionsIndex(doppelgangerAddress)
            const ethRequestKey = await contracts.positionRouter.getRequestKey(doppelgangerAddress, ethIndexIncrease)
            await contracts.positionRouter.connect(contracts.positionKeeper).executeIncreasePosition(ethRequestKey, contracts.executionFeeReceiver.address)
            await newPriceWETH(parseUnits("900", 8), contracts)

        });


        it("ETH", async () => {

            const amountToBorrow = parseUnits("50", 6)
            const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
            const bobContract = await ethers.getContractAt("Doppelganger", doppelgangerAddress);
            const id = await bobContract.keyByIndexToken(contracts.WETH.address, direction.short)

            await contracts.AccountManagerToken.connect(contracts.bob).approve(contracts.DDL_GMX.address, id)
            await contracts.DDL_GMX.connect(contracts.bob).lockCollateral(id)
            await contracts.DDL_GMX.connect(contracts.bob).borrow(id, amountToBorrow)

            const expectedPrice = parseUnits("970", 8)
            expect(await contracts.DDL_GMX.borderPrice(id)).to.be.eq(expectedPrice)

        })
    })
})