import { HardhatRuntimeEnvironment } from "hardhat/types"

async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const { deployments, getNamedAccounts, network } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  
  switch (network.name) {
    case "arbitrum_ddl":
    case "arb_ddl":
      return
    case "hardhat":
    case "localhost":
    case "hlocal":
    case "hoffice":
      await deploy("USDCPriceFeed", {
        contract: "PriceFeed",
        from: deployer,
        log: true,
        args: [],
      })
      await deploy("USDTPriceFeed", {
        contract: "PriceFeed",
        from: deployer,
        log: true,
        args: [],
      })
      await deploy("FRAXPriceFeed", {
        contract: "PriceFeed",
        from: deployer,
        log: true,
        args: [],
      })
      await deploy("DAIPriceFeed", {
        contract: "PriceFeed",
        from: deployer,
        log: true,
        args: [],
      })
      await deploy("WETHPriceFeed", {
        contract: "PriceFeed",
        from: deployer,
        log: true,
        args: [],
      })
      await deploy("WBTCPriceFeed", {
        contract: "PriceFeed",
        from: deployer,
        log: true,
        args: [],
      })
      await deploy("LINKPriceFeed", {
        contract: "PriceFeed",
        from: deployer,
        log: true,
        args: [],
      })
      await deploy("UNIPriceFeed", {
        contract: "PriceFeed",
        from: deployer,
        log: true,
        args: [],
      })
      break
    default:
      throw new Error("Unsupported network: " + network.name)
  }
}
deployment.tags = ["gmx-price_feed"]
deployment.dependencies = ["tokens"]
export default deployment