import {HardhatRuntimeEnvironment} from "hardhat/types"
import {BigNumber as BN, utils} from "ethers"

async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments, getNamedAccounts, network} = hre
  const {deploy, get, execute} = deployments
  const {deployer} = await getNamedAccounts()
  const USDC = await get("USDC")
  const WETH = await get("WETH")
  const WBTC = await get("WBTC")
  const LINK = await get("LINK")
  const UNI = await get("UNI")
  const positionRouter = await get("positionRouter")
  const vault = await get("vault")
  const accountManager = await get("accountManager")
  const accountManagerToken = await get("accountManagerToken")

  let ddl_gmx = await deploy("DDL_GMX", {
    contract: "DDL_GMX",
    from: deployer,
    log: true,
    args: [
      positionRouter.address,
      accountManager.address,
      vault.address,
      accountManagerToken.address,
      USDC.address,
      network.name == "hardhat" ? 50e6 : 0,
      5000,
      6,
      WETH.address,
      network.name == "hardhat" ? 3 : 0,
    ],
  })

  await execute(
    "accountManager",
    {log: true, from: deployer},
    "setDDL_GMX",
    ddl_gmx.address,
  )

}

deployment.tags = ["ddl_gmx"]
deployment.dependencies = [
  "accountManager",
  "gmx-vault",
]

export default deployment
