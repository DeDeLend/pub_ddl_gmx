import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import chai from "chai";
import { parseUnits } from "ethers/lib/utils";
import { fixture, newPriceWBTC } from "./Preparation";
import { preparation } from "./Preparation";
import { newPriceWETH } from "./Preparation";
import { BigNumber, type BigNumberish } from "ethers";


chai.use(solidity);
const { expect } = chai;

describe("AccountManager.spec.ts", async () => {
    let contracts: Awaited<ReturnType<typeof fixture>>;

    const Symbols = {
        ETH_USD_LONG: 0,
        BTC_USD_LONG: 1,
        LINK_USD_LONG: 2,
        UNI_USD_LONG: 3,
        ETH_USD_SHORT: 4,
        BTC_USD_SHORT: 5,
        LINK_USD_SHORT: 6,
        UNI_USD_SHORT: 7
    }

    const referralCode = "0x0000000000000000000000000000000000000000000000000000000000000000"
    const assetToReceive = {
        ETH: true,
        ERC20: false,
    }
    const minOut = 0
    const direction = {
        long: true,
        short: false,
    }

    const triggerAboveThreshold = {
        true: true,
        false: false,
    }

    const shouldWrap = {
        true: true,
        false: false,
    }
    beforeEach(async () => {
        contracts = await fixture();
        await preparation(contracts)

        await contracts.WETH.mintTo(
            contracts.bob.address,
            parseUnits("1000", 18),
        )

        await contracts.WBTC.mintTo(
            contracts.bob.address,
            parseUnits("1000", 8),
        )
    });

    describe("Creating Doppelganger for the user", async () => {
        it("Should create Doppelganger account for the user", async () => {
            await contracts.AccountManager.connect(contracts.liza).createDoppelgangerGMX()
            expect(await contracts.AccountManagerToken.balanceOf(contracts.liza.address)).to.be.eq(2)
        })

        it("Should revert transcation when doppelganger already exist for the address", async () => {
            await expect(contracts.AccountManager.connect(contracts.bob).createDoppelgangerGMX()).to.be.revertedWith("Doppelganger for this address already exist")
            expect(await contracts.AccountManagerToken.balanceOf(contracts.bob.address)).to.be.eq(2)
        })
    })

    describe("ETH", async () => {
        describe("Should always use USDC as colalteral for short positions", async () => {

            it("Should convert original ETH to USDC", async () => {
                const entryPrice = parseUnits("1200", 8)
                const amountIn = parseUnits("12", 18)
                const sizeDelta = parseUnits("24000", 30)

                await newPriceWETH(entryPrice, contracts)

                const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
                const bobTradingAccount = await ethers.getContractAt("Doppelganger", doppelgangerAddress)
                const keyByIndexToken = bobTradingAccount.keyByIndexToken(contracts.WETH.address, direction.short)
                const slippageToOpenShort = (await contracts.AccountManager.currentPrice(keyByIndexToken)).mul(99).div(100)

                const requestKey = await contracts.positionRouter.getRequestKey(doppelgangerAddress, 1)
                const path = [contracts.WETH.address]
                const indexToken = contracts.WETH.address
                const minExecutionFee = await contracts.positionRouter.minExecutionFee()

                await contracts.AccountManager.connect(contracts.bob).createIncreasePositionETH(
                    path,
                    indexToken,
                    amountIn,
                    minOut,
                    sizeDelta,
                    direction.short,
                    slippageToOpenShort,
                    minExecutionFee,
                    referralCode,
                    { value: amountIn.add(minExecutionFee) }
                )

                await contracts.positionRouter.connect(contracts.positionKeeper).executeIncreasePosition(requestKey, contracts.executionFeeReceiver.address)

                const expectedEntryPrice = parseUnits("1200", 30)
                const position = await contracts.vault.getPosition(doppelgangerAddress, contracts.USDC.address, contracts.WETH.address, direction.short)
                await expect(position[0]).to.be.eq(sizeDelta)
                await expect(position[2]).to.be.eq(expectedEntryPrice)
            })

            it("Should convert WBTC to USDC", async () => {

                const btcPrice = parseUnits("12000", 8)
                await newPriceWBTC(btcPrice, contracts)

                const entryPrice = parseUnits("1200", 8)
                const amountIn = parseUnits("1", 8)
                const sizeDelta = parseUnits("24000", 30)

                await newPriceWETH(entryPrice, contracts)

                const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
                const bobTradingAccount = await ethers.getContractAt("Doppelganger", doppelgangerAddress)
                const keyByIndexToken = bobTradingAccount.keyByIndexToken(contracts.WETH.address, direction.short)
                const slippageToOpenShort = (await contracts.AccountManager.currentPrice(keyByIndexToken)).mul(99).div(100)

                const requestKey = await contracts.positionRouter.getRequestKey(doppelgangerAddress, 1)
                const path = [contracts.WBTC.address]
                const indexToken = contracts.WETH.address
                const minExecutionFee = await contracts.positionRouter.minExecutionFee()

                await contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                    path,
                    indexToken,
                    amountIn,
                    minOut,
                    sizeDelta,
                    direction.short,
                    slippageToOpenShort,
                    minExecutionFee,
                    referralCode,
                    { value: (minExecutionFee) }
                )

                await contracts.positionRouter.connect(contracts.positionKeeper).executeIncreasePosition(requestKey, contracts.executionFeeReceiver.address)

                const expectedEntryPrice = parseUnits("1200", 30)
                const position = await contracts.vault.getPosition(doppelgangerAddress, contracts.USDC.address, contracts.WETH.address, direction.short)
                await expect(position[0]).to.be.eq(sizeDelta)
                await expect(position[2]).to.be.eq(expectedEntryPrice)
            })

            it("Should convert WETH to USDC", async () => {
                const entryPrice = parseUnits("1200", 8)
                const amountIn = parseUnits("12", 18)
                const sizeDelta = parseUnits("24000", 30)

                await newPriceWETH(entryPrice, contracts)

                const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
                const bobTradingAccount = await ethers.getContractAt("Doppelganger", doppelgangerAddress)
                const keyByIndexToken = bobTradingAccount.keyByIndexToken(contracts.WETH.address, direction.short)
                const slippageToOpenShort = (await contracts.AccountManager.currentPrice(keyByIndexToken)).mul(99).div(100)

                const requestKey = await contracts.positionRouter.getRequestKey(doppelgangerAddress, 1)
                const path = [contracts.WETH.address]
                const indexToken = contracts.WETH.address
                const minExecutionFee = await contracts.positionRouter.minExecutionFee()

                await contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                    path,
                    indexToken,
                    amountIn,
                    minOut,
                    sizeDelta,
                    direction.short,
                    slippageToOpenShort,
                    minExecutionFee,
                    referralCode,
                    { value: (minExecutionFee) }
                )

                await contracts.positionRouter.connect(contracts.positionKeeper).executeIncreasePosition(requestKey, contracts.executionFeeReceiver.address)

                const expectedEntryPrice = parseUnits("1200", 30)
                const position = await contracts.vault.getPosition(doppelgangerAddress, contracts.USDC.address, contracts.WETH.address, direction.short)
                await expect(position[0]).to.be.eq(sizeDelta)
                await expect(position[2]).to.be.eq(expectedEntryPrice)
            })

            it("Should convert USDT to USDC", async () => {
                const entryPrice = parseUnits("1200", 8)
                const amountIn = parseUnits("12000", 6)
                const sizeDelta = parseUnits("24000", 30)

                await newPriceWETH(entryPrice, contracts)

                const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
                const bobTradingAccount = await ethers.getContractAt("Doppelganger", doppelgangerAddress)
                const keyByIndexToken = bobTradingAccount.keyByIndexToken(contracts.WETH.address, direction.short)
                const slippageToOpenShort = (await contracts.AccountManager.currentPrice(keyByIndexToken)).mul(99).div(100)

                const requestKey = await contracts.positionRouter.getRequestKey(doppelgangerAddress, 1)
                const path = [contracts.USDT.address]
                const indexToken = contracts.WETH.address
                const minExecutionFee = await contracts.positionRouter.minExecutionFee()

                await contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                    path,
                    indexToken,
                    amountIn,
                    minOut,
                    sizeDelta,
                    direction.short,
                    slippageToOpenShort,
                    minExecutionFee,
                    referralCode,
                    { value: (minExecutionFee) }
                )

                await contracts.positionRouter.connect(contracts.positionKeeper).executeIncreasePosition(requestKey, contracts.executionFeeReceiver.address)

                const expectedEntryPrice = parseUnits("1200", 30)
                const position = await contracts.vault.getPosition(doppelgangerAddress, contracts.USDC.address, contracts.WETH.address, direction.short)
                await expect(position[0]).to.be.eq(sizeDelta)
                await expect(position[2]).to.be.eq(expectedEntryPrice)
            })


            it("Should convert FRAX to USDC", async () => {
                const entryPrice = parseUnits("1200", 8)
                const amountIn = parseUnits("12000", 18)
                const sizeDelta = parseUnits("24000", 30)

                await newPriceWETH(entryPrice, contracts)

                const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
                const bobTradingAccount = await ethers.getContractAt("Doppelganger", doppelgangerAddress)
                const keyByIndexToken = bobTradingAccount.keyByIndexToken(contracts.WETH.address, direction.short)
                const slippageToOpenShort = (await contracts.AccountManager.currentPrice(keyByIndexToken)).mul(99).div(100)

                const requestKey = await contracts.positionRouter.getRequestKey(doppelgangerAddress, 1)
                const path = [contracts.FRAX.address]
                const indexToken = contracts.WETH.address
                const minExecutionFee = await contracts.positionRouter.minExecutionFee()

                await contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                    path,
                    indexToken,
                    amountIn,
                    minOut,
                    sizeDelta,
                    direction.short,
                    slippageToOpenShort,
                    minExecutionFee,
                    referralCode,
                    { value: (minExecutionFee) }
                )

                await contracts.positionRouter.connect(contracts.positionKeeper).executeIncreasePosition(requestKey, contracts.executionFeeReceiver.address)

                const expectedEntryPrice = parseUnits("1200", 30)
                const position = await contracts.vault.getPosition(doppelgangerAddress, contracts.USDC.address, contracts.WETH.address, direction.short)
                await expect(position[0]).to.be.eq(sizeDelta)
                await expect(position[2]).to.be.eq(expectedEntryPrice)
            })

            it("Should convert DAI to USDC", async () => {
                const entryPrice = parseUnits("1200", 8)
                const amountIn = parseUnits("12000", 18)
                const sizeDelta = parseUnits("24000", 30)

                await newPriceWETH(entryPrice, contracts)

                const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
                const bobTradingAccount = await ethers.getContractAt("Doppelganger", doppelgangerAddress)
                const keyByIndexToken = bobTradingAccount.keyByIndexToken(contracts.WETH.address, direction.short)
                const slippageToOpenShort = (await contracts.AccountManager.currentPrice(keyByIndexToken)).mul(99).div(100)

                const requestKey = await contracts.positionRouter.getRequestKey(doppelgangerAddress, 1)
                const path = [contracts.DAI.address]
                const indexToken = contracts.WETH.address
                const minExecutionFee = await contracts.positionRouter.minExecutionFee()

                await contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                    path,
                    indexToken,
                    amountIn,
                    minOut,
                    sizeDelta,
                    direction.short,
                    slippageToOpenShort,
                    minExecutionFee,
                    referralCode,
                    { value: (minExecutionFee) }
                )

                await contracts.positionRouter.connect(contracts.positionKeeper).executeIncreasePosition(requestKey, contracts.executionFeeReceiver.address)

                const expectedEntryPrice = parseUnits("1200", 30)
                const position = await contracts.vault.getPosition(doppelgangerAddress, contracts.USDC.address, contracts.WETH.address, direction.short)
                await expect(position[0]).to.be.eq(sizeDelta)
                await expect(position[2]).to.be.eq(expectedEntryPrice)
            })

            it("Should revert transcation when path isn't [asset, USDC]", async () => {
                const entryPrice = parseUnits("1200", 8)
                const amountIn = parseUnits("12000", 18)
                const sizeDelta = parseUnits("24000", 30)

                await newPriceWETH(entryPrice, contracts)

                const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
                const bobTradingAccount = await ethers.getContractAt("Doppelganger", doppelgangerAddress)
                const keyByIndexToken = bobTradingAccount.keyByIndexToken(contracts.WETH.address, direction.short)
                const slippageToOpenShort = (await contracts.AccountManager.currentPrice(keyByIndexToken)).mul(99).div(100)

                const path = [contracts.DAI.address, contracts.USDT.address]
                const indexToken = contracts.WETH.address
                const minExecutionFee = await contracts.positionRouter.minExecutionFee()

                await expect(contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                    path,
                    indexToken,
                    amountIn,
                    minOut,
                    sizeDelta,
                    direction.short,
                    slippageToOpenShort,
                    minExecutionFee,
                    referralCode,
                    { value: (minExecutionFee) }
                )).to.be.revertedWith("To open the short position, you have to use USDC as collateral")
            })


            it("Should revert transcation when second asset in the path isn't USDC", async () => {
                const entryPrice = parseUnits("1200", 8)
                const amountIn = parseUnits("12", 18)
                const sizeDelta = parseUnits("24000", 30)

                await newPriceWETH(entryPrice, contracts)

                const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
                const bobTradingAccount = await ethers.getContractAt("Doppelganger", doppelgangerAddress)
                const keyByIndexToken = bobTradingAccount.keyByIndexToken(contracts.WETH.address, direction.short)
                const slippageToOpenShort = (await contracts.AccountManager.currentPrice(keyByIndexToken)).mul(99).div(100)

                const path = [contracts.WETH.address, contracts.USDT.address]
                const indexToken = contracts.WETH.address
                const minExecutionFee = await contracts.positionRouter.minExecutionFee()

                await expect(contracts.AccountManager.connect(contracts.bob).createIncreasePositionETH(
                    path,
                    indexToken,
                    amountIn,
                    minOut,
                    sizeDelta,
                    direction.short,
                    slippageToOpenShort,
                    minExecutionFee,
                    referralCode,
                    { value: amountIn.add(minExecutionFee) }
                )).to.be.revertedWith("To open the short position, you have to use USDC as collateral")
            })
        })
    })

    describe("ETH (original)", async () => {
        const params = {
            path: [] as string[],
            minExecutionFee: 0 as BigNumberish,
            doppelgangerAddress: "" as string,
            requestKey: "" as string,
            keyByIndexToken: 0 as BigNumberish,
            gmxEntryPrice: 0 as BigNumberish,
            indexToken: "" as string,
            minOut: 0 as BigNumberish,
            slippageToOpenLong: 0 as BigNumberish,
        }

        const entryPrice = parseUnits("1000", 8)
        const amountIn = parseUnits("10", 18)
        const sizeDelta = parseUnits("10000", 30)

        beforeEach(async () => {
            await newPriceWETH(entryPrice, contracts)
            params.doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
            const bobTradingAccount = await ethers.getContractAt("Doppelganger", params.doppelgangerAddress)
            const slippageToOpenLong = (await contracts.AccountManager.currentPrice(params.keyByIndexToken)).mul(101).div(100)

            params.requestKey = await contracts.positionRouter.getRequestKey(params.doppelgangerAddress, 1)
            params.keyByIndexToken = bobTradingAccount.keyByIndexToken(contracts.WETH.address, true)
            params.path = [contracts.WETH.address]
            params.indexToken = contracts.WETH.address
            params.minExecutionFee = await contracts.positionRouter.minExecutionFee()

            await contracts.AccountManager.connect(contracts.bob).createIncreasePositionETH(
                params.path,
                params.indexToken,
                amountIn,
                minOut,
                sizeDelta,
                direction.long,
                slippageToOpenLong,
                params.minExecutionFee,
                referralCode,
                { value: amountIn.add(params.minExecutionFee) }
            )

            await contracts.positionRouter.connect(contracts.positionKeeper).executeIncreasePosition(params.requestKey, contracts.executionFeeReceiver.address)

        });

        describe("createIncreasePosition / createDecreasePosition", async () => {

            it("Should increase the position", async () => {

                const expectedEntryPrice = parseUnits("1000", 30)
                const position = await contracts.vault.getPosition(params.doppelgangerAddress, contracts.WETH.address, contracts.WETH.address, direction.long)
                await expect(position[0]).to.be.eq(sizeDelta)
                await expect(position[2]).to.be.eq(expectedEntryPrice)

            })

            it("Should revert decreasePosition when user is not the owner of the erc-721 (collateral)", async () => {

                const doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
                const bobContract = await ethers.getContractAt("Doppelganger", doppelgangerAddress);
                const id = bobContract.keyByIndexToken(contracts.WETH.address, direction.long)

                await newPriceWETH(parseUnits("900", 8), contracts)

                await contracts.AccountManagerToken.connect(contracts.bob).approve(contracts.DDL_GMX.address, id)
                await contracts.DDL_GMX.connect(contracts.bob).lockCollateral(id)
                const gmx_price = await contracts.AccountManager.currentPrice(id)
                const positionInf = await contracts.vault.getPosition(doppelgangerAddress, contracts.WETH.address, contracts.WETH.address, direction.long)
                const deltaIf = await contracts.vault.getPositionDelta(doppelgangerAddress, contracts.WETH.address, contracts.WETH.address, direction.long)
                const closeValue = deltaIf[0] ? positionInf[1] : deltaIf[1]
                const minExecutionFee = await contracts.positionRouter.minExecutionFee()

                await expect(
                    contracts.AccountManager.connect(contracts.bob).createDecreasePosition(
                        [contracts.WETH.address],
                        contracts.WETH.address,
                        closeValue,
                        positionInf[0],
                        direction.long,
                        gmx_price.mul(99).div(100),
                        minOut,
                        minExecutionFee,
                        false,
                        { value: minExecutionFee })
                ).to.be.revertedWith("You are not the owner of the position")
            })

            it("Should decrease the position", async () => {

                const closePrice = parseUnits("1200", 8)
                const balanceChangesTo = parseUnits("9.983333333333333333", 18)
                await newPriceWETH(closePrice, contracts)

                const closeSizeDelta = await contracts.vault.getPosition(params.doppelgangerAddress, contracts.WETH.address, contracts.WETH.address, true)
                const deltaIf = await contracts.vault.getPositionDelta(params.doppelgangerAddress, contracts.WETH.address, contracts.WETH.address, true)
                const collateralDelta = deltaIf[0] ? closeSizeDelta[1] : deltaIf[1]

                await contracts.AccountManager.connect(contracts.bob).createDecreasePosition(
                    params.path,
                    params.indexToken,
                    collateralDelta,
                    closeSizeDelta[0],
                    direction.long,
                    closePrice,
                    minOut,
                    params.minExecutionFee,
                    assetToReceive.ETH,
                    { value: params.minExecutionFee }
                )

                await expect(() =>
                    contracts.positionRouter.connect(contracts.positionKeeper).executeDecreasePosition(params.requestKey, contracts.executionFeeReceiver.address)
                ).changeEtherBalance(contracts.bob, balanceChangesTo)
            })
        })

        describe("setPermission should work", async () => {

            it("Should revert createIncreasePositionETH when trading is off", async () => {

                await contracts.AccountManager.connect(contracts.deployer).setPermission(Symbols.ETH_USD_LONG, false)
                await expect(contracts.AccountManager.connect(contracts.bob).createIncreasePositionETH(
                    params.path,
                    params.indexToken,
                    amountIn,
                    minOut,
                    sizeDelta,
                    direction.long,
                    await contracts.AccountManager.currentPrice(params.keyByIndexToken),
                    params.minExecutionFee,
                    referralCode,
                    { value: amountIn.add(params.minExecutionFee) }
                )).to.be.revertedWith("trading on this pair is stopped")

            })

            it("Should allow decreasePosition when trading is off", async () => {
                const closePrice = parseUnits("1200", 8)
                const balanceChangesTo = parseUnits("9.983333333333333333", 18)

                await contracts.AccountManager.connect(contracts.deployer).setPermission(Symbols.ETH_USD_LONG, false)
                await newPriceWETH(closePrice, contracts)
                const closeSizeDelta = await contracts.vault.getPosition(params.doppelgangerAddress, contracts.WETH.address, contracts.WETH.address, true)
                const deltaIf = await contracts.vault.getPositionDelta(params.doppelgangerAddress, contracts.WETH.address, contracts.WETH.address, true)
                const collateralDelta = deltaIf[0] ? closeSizeDelta[1] : deltaIf[1]

                await contracts.AccountManager.connect(contracts.bob).createDecreasePosition(
                    params.path,
                    params.indexToken,
                    collateralDelta,
                    closeSizeDelta[0],
                    direction.long,
                    closePrice,
                    minOut,
                    params.minExecutionFee,
                    assetToReceive.ETH,
                    { value: params.minExecutionFee }
                )
                await expect(() =>
                    contracts.positionRouter.connect(contracts.positionKeeper).executeDecreasePosition(params.requestKey, contracts.executionFeeReceiver.address)
                ).changeEtherBalance(contracts.bob, balanceChangesTo)
            })
        })
    })

    describe("Wrapped ETH (WETH)", async () => {
        describe("setPermission should work", async () => {

            const params = {
                path: [] as string[],
                minExecutionFee: 0 as BigNumberish,
                doppelgangerAddress: "" as string,
                requestKey: "" as string,
                keyByIndexToken: 0 as BigNumberish,
                gmxEntryPrice: 0 as BigNumberish,
                indexToken: "" as string,
                minOut: 0 as BigNumberish,
                slippageToOpenLong: 0 as BigNumberish,
                collateralToken: "" as string,
                orderBookMinExecutionFee: 0 as BigNumberish,
            }

            const entryPrice = parseUnits("1000", 8)
            const amountIn = parseUnits("10", 18)
            const sizeDelta = parseUnits("100000", 30)

            beforeEach(async () => {
                await newPriceWETH(entryPrice, contracts)
                params.doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
                const bobTradingAccount = await ethers.getContractAt("Doppelganger", params.doppelgangerAddress)
                params.requestKey = await contracts.positionRouter.getRequestKey(params.doppelgangerAddress, 1)
                params.keyByIndexToken = bobTradingAccount.keyByIndexToken(contracts.WETH.address, true)
                params.path = [contracts.WETH.address]
                params.indexToken = contracts.WETH.address
                params.minExecutionFee = await contracts.positionRouter.minExecutionFee()
                params.collateralToken = contracts.WETH.address
                params.orderBookMinExecutionFee = await contracts.orderBook.minExecutionFee()


            });

            it("Should revert creaseIncreasePosition when trading is off", async () => {
                await contracts.AccountManager.connect(contracts.deployer).setPermission(Symbols.ETH_USD_LONG, false)
                await expect(contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                    params.path,
                    params.indexToken,
                    amountIn,
                    minOut,
                    sizeDelta,
                    direction.long,
                    params.slippageToOpenLong,
                    params.minExecutionFee,
                    referralCode,
                    { value: params.minExecutionFee }
                )).to.be.revertedWith("trading on this pair is stopped")
            })

            it("Should revert long when short is opened", async () => {

                const path = [contracts.USDC.address]
                const amountIn = parseUnits("10000", 6)

                await contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                    path,
                    params.indexToken,
                    amountIn,
                    minOut,
                    sizeDelta,
                    direction.short,
                    (await contracts.AccountManager.currentPrice(params.keyByIndexToken)).mul(99).div(100),
                    params.minExecutionFee,
                    referralCode,
                    { value: params.minExecutionFee }
                )
                await contracts.positionRouter.connect(contracts.positionKeeper).executeIncreasePosition(params.requestKey, contracts.executionFeeReceiver.address)

                const position = await contracts.vault.getPosition(params.doppelgangerAddress, contracts.USDC.address, contracts.WETH.address, direction.short)
                await expect(position[0]).to.be.eq(sizeDelta)

                await expect(contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                    path,
                    params.indexToken,
                    amountIn,
                    minOut,
                    sizeDelta,
                    direction.long,
                    (await contracts.AccountManager.currentPrice(params.keyByIndexToken)).mul(101).div(100),
                    params.minExecutionFee,
                    referralCode,
                    { value: params.minExecutionFee }
                )).to.be.revertedWith("You cannot open a long/short position at the same time")

            })

            it("Should revert short when long is opened", async () => {

                const path = [contracts.WETH.address]
                const usdcPath = [contracts.USDC.address]

                const amountIn = parseUnits("10", 18)

                const amountInShort = parseUnits("10000", 6)


                await contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                    path,
                    params.indexToken,
                    amountIn,
                    minOut,
                    sizeDelta,
                    direction.long,
                    (await contracts.AccountManager.currentPrice(params.keyByIndexToken)).mul(101).div(100),
                    params.minExecutionFee,
                    referralCode,
                    { value: params.minExecutionFee }
                )
                await contracts.positionRouter.connect(contracts.positionKeeper).executeIncreasePosition(params.requestKey, contracts.executionFeeReceiver.address)

                const position = await contracts.vault.getPosition(params.doppelgangerAddress, contracts.WETH.address, contracts.WETH.address, direction.long)
                await expect(position[0]).to.be.eq(sizeDelta)

                await expect(contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                    usdcPath,
                    params.indexToken,
                    amountInShort,
                    minOut,
                    sizeDelta,
                    direction.short,
                    (await contracts.AccountManager.currentPrice(params.keyByIndexToken)).mul(99).div(100),
                    params.minExecutionFee,
                    referralCode,
                    { value: params.minExecutionFee }
                )).to.be.revertedWith("You cannot open a long/short position at the same time")

            })
        })

        describe("Deposit / Withdraw Margin from the position", async () => {
            const params = {
                path: [] as string[],
                minExecutionFee: 0 as BigNumberish,
                doppelgangerAddress: "" as string,
                requestKey: "" as string,
                keyByIndexToken: 0 as BigNumberish,
                gmxEntryPrice: 0 as BigNumberish,
                indexToken: "" as string,
                minOut: 0 as BigNumberish,
                slippageToOpenLong: 0 as BigNumberish,
            }

            const entryPrice = parseUnits("1000", 8)
            const amountIn = parseUnits("10", 18)
            const sizeDelta = parseUnits("100000", 30)

            beforeEach(async () => {
                await newPriceWETH(entryPrice, contracts)
                params.doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
                const bobTradingAccount = await ethers.getContractAt("Doppelganger", params.doppelgangerAddress)
                const gmxEntryPrice = await contracts.AccountManager.currentPrice(params.keyByIndexToken)
                const slippageToOpenLong = gmxEntryPrice.mul(101).div(100)

                params.requestKey = await contracts.positionRouter.getRequestKey(params.doppelgangerAddress, 1)
                params.keyByIndexToken = bobTradingAccount.keyByIndexToken(contracts.WETH.address, true)
                params.path = [contracts.WETH.address]
                params.indexToken = contracts.WETH.address
                params.minExecutionFee = await contracts.positionRouter.minExecutionFee()

                await contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                    params.path,
                    params.indexToken,
                    amountIn,
                    minOut,
                    sizeDelta,
                    direction.long,
                    slippageToOpenLong,
                    params.minExecutionFee,
                    referralCode,
                    { value: params.minExecutionFee }
                )
                await contracts.positionRouter.connect(contracts.positionKeeper).executeIncreasePosition(params.requestKey, contracts.executionFeeReceiver.address)
            });


            it("Should withdraw collateral from the position", async () => {

                const closePrice = parseUnits("1200", 8)
                const shouldReceive = parseUnits("0.416666666666666666", 18)
                await newPriceWETH(closePrice, contracts)
                const slippageToCloseLong = closePrice.mul(99).div(100)
                const collateralToWithdraw = parseUnits("500", 30)
                await contracts.positionRouter.connect(contracts.positionKeeper).executeDecreasePosition(params.requestKey, contracts.executionFeeReceiver.address)

                await contracts.AccountManager.connect(contracts.bob).createDecreasePosition(
                    params.path,
                    params.indexToken,
                    collateralToWithdraw,
                    minOut,
                    direction.long,
                    closePrice.mul(99).div(100),
                    slippageToCloseLong,
                    params.minExecutionFee,
                    assetToReceive.ERC20,
                    { value: params.minExecutionFee })

                await expect(() =>
                    contracts.positionRouter.connect(contracts.positionKeeper).executeDecreasePosition(params.requestKey, contracts.executionFeeReceiver.address)
                ).changeTokenBalance(contracts.WETH, contracts.bob, shouldReceive)
            })


            it("Should add collateral to the position", async () => {

                const oldCollateral = await contracts.vault.getPosition(params.doppelgangerAddress, contracts.WETH.address, contracts.WETH.address, true)
                const addMargin = parseUnits("1", 18)
                const requestKey2 = await contracts.positionRouter.getRequestKey(params.doppelgangerAddress, 2)
                await contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                    params.path,
                    params.indexToken,
                    addMargin,
                    minOut,
                    0,
                    direction.long,
                    (await contracts.AccountManager.currentPrice(params.keyByIndexToken)).mul(101).div(100),
                    params.minExecutionFee,
                    referralCode,
                    { value: params.minExecutionFee }
                )
                await contracts.positionRouter.connect(contracts.positionKeeper).executeIncreasePosition(requestKey2, contracts.executionFeeReceiver.address)
                const collateral = await contracts.vault.getPosition(params.doppelgangerAddress, contracts.WETH.address, contracts.WETH.address, true)

                const currentCollateral = {
                    newCollateral: collateral[1],
                    oldCollateral: oldCollateral[1]
                }
                const newCollateral = parseUnits("10895", 30)
                await expect(currentCollateral.newCollateral).to.be.eq(newCollateral)
            })
        })

        describe("createIncreasePosition / createDecreasePosition ", async () => {
            const params = {
                path: [] as string[],
                minExecutionFee: 0 as BigNumberish,
                doppelgangerAddress: "" as string,
                requestKey: "" as string,
                keyByIndexToken: 0 as BigNumberish,
                gmxEntryPrice: 0 as BigNumberish,
                indexToken: "" as string,
                minOut: 0 as BigNumberish,
                slippageToOpenLong: 0 as BigNumberish,
            }

            const entryPrice = parseUnits("1000", 8)
            const amountIn = parseUnits("10", 18)
            const sizeDelta = parseUnits("10000", 30)

            beforeEach(async () => {
                await newPriceWETH(entryPrice, contracts)
                params.doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)
                const bobTradingAccount = await ethers.getContractAt("Doppelganger", params.doppelgangerAddress)
                const gmxEntryPrice = await contracts.AccountManager.currentPrice(params.keyByIndexToken)
                const slippageToOpenLong = gmxEntryPrice.mul(101).div(100)

                params.requestKey = await contracts.positionRouter.getRequestKey(params.doppelgangerAddress, 1)
                params.keyByIndexToken = bobTradingAccount.keyByIndexToken(contracts.WETH.address, true)
                params.path = [contracts.WETH.address]
                params.indexToken = contracts.WETH.address
                params.minExecutionFee = await contracts.positionRouter.minExecutionFee()

                await contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                    params.path,
                    params.indexToken,
                    amountIn,
                    minOut,
                    sizeDelta,
                    direction.long,
                    slippageToOpenLong,
                    params.minExecutionFee,
                    referralCode,
                    { value: params.minExecutionFee }
                )
                await contracts.positionRouter.connect(contracts.positionKeeper).executeIncreasePosition(params.requestKey, contracts.executionFeeReceiver.address)
            });

            it("Should increase the positon", async () => {

                const expectedEntryPrice = parseUnits("1000", 30)
                const position = await contracts.vault.getPosition(params.doppelgangerAddress, contracts.WETH.address, contracts.WETH.address, direction.long)
                await expect(position[0]).to.be.eq(sizeDelta)
                await expect(position[2]).to.be.eq(expectedEntryPrice)

            })

            it("Should decrease the position", async () => {

                const closePrice = parseUnits("1200", 8)
                const shouldReceive = parseUnits("9.983333333333333333", 18)
                await newPriceWETH(closePrice, contracts)
                const closeSizeDelta = await contracts.vault.getPosition(params.doppelgangerAddress, contracts.WETH.address, contracts.WETH.address, true)
                const deltaIf = await contracts.vault.getPositionDelta(params.doppelgangerAddress, contracts.WETH.address, contracts.WETH.address, true)
                const collateralDelta = deltaIf[0] ? closeSizeDelta[1] : deltaIf[1]

                await contracts.AccountManager.connect(contracts.bob).createDecreasePosition(
                    params.path,
                    params.indexToken,
                    collateralDelta,
                    closeSizeDelta[0],
                    direction.long,
                    closePrice,
                    minOut,
                    params.minExecutionFee,
                    assetToReceive.ERC20,
                    { value: params.minExecutionFee }
                )
                await expect(() =>
                    contracts.positionRouter.connect(contracts.positionKeeper).executeDecreasePosition(params.requestKey, contracts.executionFeeReceiver.address)
                ).changeTokenBalance(contracts.WETH, contracts.bob, shouldReceive)
            })
        })

        describe("Swap for createIncreasePosition should work  ", async () => {

            const params = {
                usdc_to_weth_path: [] as string[],
                usdt_to_weth_path: [] as string[],
                frax_to_weth_path: [] as string[],
                weth_to_usdc_path: [] as string[],
                usdc_path: [] as string[],
                weth_to_usdt_path: [] as string[],
                minExecutionFee: parseUnits("0.0005", 18) as BigNumber,
                doppelgangerAddress: "" as string,
                requestKey: "" as string,
                keyByIndexTokenLong: 0 as BigNumberish,
                keyByIndexTokenShort: 0 as BigNumberish,
                gmxEntryPrice: 0 as BigNumberish,
                indexToken: "" as string,
                minOut: 0 as BigNumberish,
                slippageToOpenLong: 0 as BigNumberish,
            }

            const entryPrice = parseUnits("1000", 8)
            const wethAmountIn = parseUnits("10", 18)
            const usdcAmountIn = parseUnits("10000", 6)

            const sizeDelta = parseUnits("10000", 30)

            beforeEach(async () => {
                await newPriceWETH(entryPrice, contracts)
                params.doppelgangerAddress = await contracts.AccountManager.doppelgangerMap(contracts.bob.address)

                params.usdc_to_weth_path = [contracts.USDC.address, contracts.WETH.address]
                params.usdc_path = [contracts.USDC.address]
                params.weth_to_usdc_path = [contracts.WETH.address, contracts.USDC.address]
                params.indexToken = contracts.WETH.address
                params.minExecutionFee = await contracts.positionRouter.minExecutionFee()
            })

            it("Should open ETH-LONG by using USDC", async () => {

                const expectedEntryPrice = parseUnits("1000", 30)
                const price = await contracts.AccountManager.currentPrice(params.keyByIndexTokenLong)
                await expect(() =>
                    contracts.AccountManager.connect(contracts.bob).createIncreasePosition(
                        params.usdc_to_weth_path,
                        params.indexToken,
                        usdcAmountIn,
                        minOut,
                        sizeDelta,
                        direction.long,
                        price,
                        params.minExecutionFee,
                        referralCode,
                        { value: params.minExecutionFee }
                    )).changeTokenBalance(contracts.USDC, contracts.bob, usdcAmountIn.mul(-1))

                const indexIncrease = await contracts.positionRouter.increasePositionsIndex(params.doppelgangerAddress)
                params.requestKey = await contracts.positionRouter.getRequestKey(params.doppelgangerAddress, indexIncrease)

                await contracts.positionRouter.connect(contracts.positionKeeper).executeIncreasePosition(params.requestKey, contracts.executionFeeReceiver.address)

                const position = await contracts.vault.getPosition(params.doppelgangerAddress, contracts.WETH.address, contracts.WETH.address, direction.long)
                await expect(position[0]).to.be.eq(sizeDelta)
                await expect(position[2]).to.be.eq(expectedEntryPrice)

            })
        })
    })
})

