import {HardhatRuntimeEnvironment} from "hardhat/types"

async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments, getNamedAccounts, network} = hre
  const {deploy, get, execute} = deployments
  const {deployer} = await getNamedAccounts()
  const ddl_gmx = await get("DDL_GMX")
  const USDC = await get("USDC")

  let ddl_pool = await deploy("DDL_POOL", {
    contract: "PoolDDL",
    from: deployer,
    // gasLimit: network.name == "arbitrum_ddl" ? "250000000" : undefined,
    log: true,
    args: [
      USDC.address,
      ddl_gmx.address,
    ],
  })

  await execute(
    "DDL_GMX",
    {log: true, from: deployer},
    "setPool",
    ddl_pool.address,
  )

}

deployment.tags = ["ddl-pool"]
deployment.dependencies = [
  "ddl_gmx",
]

export default deployment
