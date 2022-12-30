import { HardhatRuntimeEnvironment } from "hardhat/types"

async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const { deployments, getNamedAccounts, network } = hre
  const { deploy, getArtifact, save } = deployments
  const { deployer } = await getNamedAccounts()

  switch (network.name) {
    case "arbitrum_ddl":
    case "arb_ddl":
      save("USDC", {
        address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
        abi: await getArtifact("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20").then((x) => x.abi),
      })
      save("USDT", {
        address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        abi: await getArtifact("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20").then((x) => x.abi),
      })
      save("DAI", {
        address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
        abi: await getArtifact("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20").then((x) => x.abi),
      })
      save("FRAX", {
        address: "0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F",
        abi: await getArtifact("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20").then((x) => x.abi),
      })
      save("WETH", {
        address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        abi: await getArtifact("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20").then((x) => x.abi),
      })
      save("WBTC", {
        address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
        abi: await getArtifact("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20").then((x) => x.abi),
      })
      save("LINK", {
        address: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
        abi: await getArtifact("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20").then((x) => x.abi),
      })
      save("UNI", {
        address: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
        abi: await getArtifact("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20").then((x) => x.abi),
      })
      return
    case "hardhat":
    case "localhost":
    case "hlocal":
    case "hoffice":
      await deploy("USDC", {
        contract: "ERC20Mock",
        from: deployer,
        log: true,
        args: ["USDC (Mock)", "USDC", 6],
      })

      await deploy("USDT", {
        contract: "ERC20Mock",
        from: deployer,
        log: true,
        args: ["USDT (Mock)", "USDT", 6],
      })

      await deploy("DAI", {
        contract: "ERC20Mock",
        from: deployer,
        log: true,
        args: ["DAI (Mock)", "DAI", 18],
      })

      await deploy("FRAX", {
        contract: "ERC20Mock",
        from: deployer,
        log: true,
        args: ["FRAX (Mock)", "FRAX", 18],
      })

      await deploy("WBTC", {
        contract: "ERC20Mock",
        from: deployer,
        log: true,
        args: ["WBTC (Mock)", "WBTC", 8],
      })

      await deploy("LINK", {
        contract: "ERC20Mock",
        from: deployer,
        log: true,
        args: ["LINK (Mock)", "LINK", 18],
      })

      await deploy("UNI", {
        contract: "ERC20Mock",
        from: deployer,
        log: true,
        args: ["UNI (Mock)", "UNI", 18],
      })

      await deploy("WETH", {
        contract: "WETHMock",
        from: deployer,
        log: true,
        args: [],
      })
      break
    default:
      throw new Error("Unsupported network: " + network.name)
  }
}

deployment.tags = ["tokens"]
export default deployment
