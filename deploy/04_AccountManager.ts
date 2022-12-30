import {HardhatRuntimeEnvironment} from "hardhat/types"
import {BigNumber as BN, utils} from "ethers"

async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments, getNamedAccounts, network} = hre
  const {deploy, get, execute} = deployments
  const {deployer} = await getNamedAccounts()

  const WETH = await get("WETH")
  const WBTC = await get("WBTC")
  const LINK = await get("LINK")
  const UNI = await get("UNI")
  const USDC = await get("USDC")
  const USDT = await get("USDT")
  const DAI = await get("DAI")
  const FRAX = await get("FRAX")
  const router = await get("router")
  const vault = await get("vault")
  const positionRouter = await get("positionRouter")

  const accountManagerToken = await deploy("accountManagerToken", {
    contract: "AccountManagerToken",
    from: deployer,
    log: true,
    args: [],
  })

  const accountManager = await deploy("accountManager", {
    contract: "AccountManager",
    from: deployer,
    log: true,
    args: [
      accountManagerToken.address,
      router.address,
      vault.address,
      positionRouter.address,
      [
        WETH.address, //"ETH_USD_LONG"
        WBTC.address, //"BTC_USD_LONG"
        LINK.address, //"LINK_USD_LONG"
        UNI.address, //"UNI_USD_LONG"
      ],
      [
        USDC.address,
        USDT.address,
        FRAX.address,
        DAI.address
      ],
      [
        true, //"ETH_USD_LONG"
        true, //"ETH_USD_SHORT"
      ],
      network.name == "hardhat" ? deployer : "0x40243C8EfD23a09018E624b8DF8197A48deEAc82"
    ],
  })

  await execute(
    "accountManagerToken",
    {log: true, from: deployer},
    "setAccountManager",
    accountManager.address,
  )

  }

deployment.tags = ["accountManager"]
deployment.dependencies = [
  "gmx-vault",
]

export default deployment
