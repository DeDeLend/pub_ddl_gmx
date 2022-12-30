import { HardhatUserConfig } from "hardhat/config"
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "hardhat-docgen";
import "@atixlabs/hardhat-time-n-mine";
import "solidity-coverage";
import '@keep-network/hardhat-local-networks-config';
import 'hardhat-contract-sizer';
import "@nomiclabs/hardhat-etherscan";
import dotenv from "dotenv"

dotenv.config()


const config: HardhatUserConfig = {
  localNetworksConfig: "~/.hardhat/networks.json",
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.8.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
            details: {
              yul: true,
              yulDetails: {
                stackAllocation: true
              }
            }
          },
        },
      },
      {
        version: "0.7.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ]
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    },
    hlocal: {
      url: "http://127.0.0.1:8545",
      accounts: {
        mnemonic: "lonely view route average leave transfer second round season luggage gift ball"
      },  
      allowUnlimitedContractSize: true    
    },
    coverage: {
      url: "http://127.0.0.1:8555"
    },
  },
  etherscan: {
    apiKey: process.env.ARBITRUM_API_KEY,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: false,
  }
};

export default config;
