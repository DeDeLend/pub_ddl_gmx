import { HardhatRuntimeEnvironment } from "hardhat/types"


async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const { deployments, getNamedAccounts, network } = hre
  const { deploy, get, execute, save, getArtifact } = deployments
  const { deployer, alice0 } = await getNamedAccounts()

  switch (network.name) {
    case "arbitrum_ddl":
    case "arb_ddl":
      save("router", {
        address: "0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064",
        abi: await getArtifact("Router").then((x) => x.abi),
      })
      save("orderBook", {
        address: "0x09f77e8a13de9a35a7231028187e9fd5db8a2acb",
        abi: await getArtifact("OrderBook").then((x) => x.abi),
      })
      save("positionRouter", {
        address: "0xb87a436B93fFE9D75c5cFA7bAcFff96430b09868",
        abi: await getArtifact("PositionRouter").then((x) => x.abi),
      })
      save("vault", {
        address: "0x489ee077994B6658eAfA855C308275EAd8097C4A",
        abi: await getArtifact("Vault").then((x) => x.abi),
      })
      return
    case "hardhat":
    case "localhost":
    case "hlocal":
    case "hoffice":
      const USDC = await get("USDC")
      const USDCPriceFeed = await get("USDCPriceFeed")
      const USDT = await get("USDT")
      const USDTPriceFeed = await get("USDTPriceFeed")
      const FRAX = await get("FRAX")
      const FRAXPriceFeed = await get("FRAXPriceFeed")
      const DAI = await get("DAI")
      const DAIPriceFeed = await get("DAIPriceFeed")
      const WETH = await get("WETH")
      const WETHPriceFeed = await get("WETHPriceFeed")
      const WBTC = await get("WBTC")
      const WBTCPriceFeed = await get("WBTCPriceFeed")
      const LINK = await get("LINK")
      const LINKPriceFeed = await get("LINKPriceFeed")
      const UNI = await get("UNI")
      const UNIPriceFeed = await get("UNIPriceFeed")

      const vault = await deploy("vault", {
        contract: "Vault",
        from: deployer,
        log: true,
        args: [],
      })

      await execute(
        "vault",
        { log: true, from: deployer },
        "setIsLeverageEnabled",
        false,
      )

      const usdg = await deploy("usdg", {
        contract: "USDG",
        from: deployer,
        log: true,
        args: [vault.address],
      })

      const router = await deploy("router", {
        contract: "Router",
        from: deployer,
        log: true,
        args: [vault.address, usdg.address, WETH.address],
      })

      const vaultPriceFeed = await deploy("vaultPriceFeed", {
        contract: "VaultPriceFeed",
        from: deployer,
        log: true,
        args: [],
      })

      await execute(
        "vault",
        { log: true, from: deployer },
        "initialize",
        router.address, // router
        usdg.address, // usdg
        vaultPriceFeed.address, // priceFeed
        "5000000000000000000000000000000", // liquidationFeeUsd
        600, // fundingRateFactor
        600, // stableFundingRateFactor
      )

      const distributor0 = await deploy("distributor0", {
        contract: "TimeDistributor",
        from: deployer,
        log: true,
        args: [],
      })

      const yieldTracker0 = await deploy("yieldTracker0", {
        contract: "YieldTracker",
        from: deployer,
        log: true,
        args: [usdg.address],
      })

      await execute(
        "yieldTracker0",
        { log: true, from: deployer },
        "setDistributor",
        distributor0.address,
      )

      await execute(
        "distributor0",
        { log: true, from: deployer },
        "setDistribution",
        [yieldTracker0.address],
        [1000],
        [WETH.address]
      )

      await execute(
        "WETH",
        { log: true, from: deployer },
        "mintTo",
        distributor0.address,
        5000,
      )

      await execute(
        "usdg",
        { log: true, from: deployer },
        "setYieldTrackers",
        [yieldTracker0.address],
      )

      await execute(
        "vaultPriceFeed",
        { log: true, from: deployer },
        "setTokenConfig",
        WETH.address,
        WETHPriceFeed.address,
        8,
        false,
      )

      await execute(
        "vaultPriceFeed",
        { log: true, from: deployer },
        "setTokenConfig",
        USDC.address,
        USDCPriceFeed.address,
        8,
        false,
      )

      await execute(
        "vaultPriceFeed",
        { log: true, from: deployer },
        "setTokenConfig",
        USDT.address,
        USDTPriceFeed.address,
        8,
        false,
      )

      await execute(
        "vaultPriceFeed",
        { log: true, from: deployer },
        "setTokenConfig",
        FRAX.address,
        FRAXPriceFeed.address,
        8,
        false,
      )

      await execute(
        "vaultPriceFeed",
        { log: true, from: deployer },
        "setTokenConfig",
        DAI.address,
        DAIPriceFeed.address,
        8,
        false,
      )

      await execute(
        "vaultPriceFeed",
        { log: true, from: deployer },
        "setTokenConfig",
        WBTC.address,
        WBTCPriceFeed.address,
        8,
        false,
      )

      await execute(
        "vaultPriceFeed",
        { log: true, from: deployer },
        "setTokenConfig",
        LINK.address,
        LINKPriceFeed.address,
        8,
        false,
      )

      await execute(
        "vaultPriceFeed",
        { log: true, from: deployer },
        "setTokenConfig",
        UNI.address,
        UNIPriceFeed.address,
        8,
        false,
      )

      const orderBook = await deploy("orderBook", {
        contract: "OrderBook",
        from: deployer,
        log: true,
        args: [],
      })

      const minExecutionFee = 500000;

      await execute(
        "orderBook",
        { log: true, from: deployer },
        "initialize",
        router.address,
        vault.address,
        WETH.address,
        usdg.address,
        minExecutionFee,
        "5000000000000000000000000000000",
      )

      await execute(
        "router",
        { log: true, from: deployer },
        "addPlugin",
        orderBook.address
      )

      const glp = await deploy("glp", {
        contract: "GLP",
        from: deployer,
        log: true,
        args: [],
      })

      const shortsTracker = await deploy("shortsTracker", {
        contract: "ShortsTracker",
        from: deployer,
        log: true,
        args: [vault.address],
      })
      
      await execute(
        "shortsTracker",
        { log: true, from: deployer },
        "setIsGlobalShortDataReady",
        true
      )

      const glpManager = await deploy("glpManager", {
        contract: "GlpManager",
        from: deployer,
        log: true,
        args: [vault.address, usdg.address, glp.address, shortsTracker.address, 24 * 60 * 60],
      })

      const positionRouter = await deploy("positionRouter", {
        contract: "PositionRouter",
        from: deployer,
        log: true,
        args: [vault.address, router.address, WETH.address, shortsTracker.address, 50, 4000],
      })

      await execute(
        "shortsTracker",
        { log: true, from: deployer },
        "setHandler",
        positionRouter.address, 
        true
      )

      const wallet = {
        hardhat: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        hlocal: "0x3C5FEDeB736BD540Bc29183220FA717c50C7643c",
      }[hre.network.name] || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"

      await deploy("timelock", {
        contract: "Timelock",
        from: deployer,
        log: true,
        args: [
          wallet,
          3600 * 4,
          "0x0000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000",
          "1000000000000000000000",
          10,
          100
        ],
      })

      await deploy("vaultErrorController", {
        contract: "VaultErrorController",
        from: deployer,
        log: true,
        args: [],
      })

      await deploy("reader", {
        contract: "Reader",
        from: deployer,
        log: true,
        args: [],
      })

      break
    default:
        throw new Error("Unsupported network: " + network.name)
    }
}
deployment.tags = ["gmx-vault"]
deployment.dependencies = [
  "tokens",
  "gmx-price_feed",
]

export default deployment

