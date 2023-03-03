import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-web3"
import "@nomiclabs/hardhat-etherscan"
import "@typechain/hardhat"
import "hardhat-gas-reporter"
import "solidity-coverage"
import "hardhat-deploy"
import "hardhat-spdx-license-identifier"

import { HardhatUserConfig, task } from "hardhat/config"
import dotenv from "dotenv"
import { ALCHEMY_BASE_URL, CHAIN_ID } from "./utils/network"
import { PROD_DEPLOYER_ADDRESS } from "./utils/accounts"
import { Deployment } from "hardhat-deploy/dist/types"

dotenv.config()

if (process.env.HARDHAT_FORK) {
  process.env["HARDHAT_DEPLOY_FORK"] = process.env.HARDHAT_FORK
}

let config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    neon_evm_devnet: {
      url: "https://devnet.neonevm.org",
      chainId: 245022926,
      deploy: ["./deploy/neon_evm_devnet/"],
    },
    aurora_testnet: {
      url: "https://testnet.aurora.dev/",
      chainId: 1313161555,
      deploy: ["./deploy/aurora_testnet/"],
    },
    mantle_testnet: {
      url: "https://rpc.testnet.mantle.xyz",
      chainId: 5001,
      deploy: ["./deploy/mantle_testnet/"],
    },
    scroll_alpha: {
      url: "https://alpha-rpc.scroll.io/l2",
      chainId: 534353,
      deploy: ["./deploy/scroll_alpha/"],
    },
    goerli: {
      url: "https://goerli.infura.io/v3/e1d8c78f9f6f487f935f7a41e7e9d33a",
      chainId: 5,
      deploy: ["./deploy/goerli/"],
    },
    sepolia: {
      url: "https://sepolia.infura.io/v3/e1d8c78f9f6f487f935f7a41e7e9d33a",
      chainId: 11155111,
      deploy: ["./deploy/sepolia/"],
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./build/artifacts",
    cache: "./build/cache",
  },
  solidity: {
    compilers: [
      {
        version: "0.8.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
          },
        },
      },
      {
        version: "0.5.16",
      },
    ],
    overrides: {
      "contracts/helper/Multicall3.sol": {
        version: "0.8.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000000,
          },
        },
      },
    },
  },
  typechain: {
    outDir: "./build/typechain/",
    target: "ethers-v5",
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 21,
  },
  mocha: {
    timeout: 200000,
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
      1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
      42161: 0, // use the same address on arbitrum mainnet
      10: 0, // use the same address on optimism mainnet
      250: 0, // use the same address on fantom mainnet
      9000: 0, // use the same address on evmos testnet
      9001: 0, // use the same address on evmos mainnnet
      3: 0, // use the same address on ropsten
      1313161555: 0,
      245022926: 0,
      5001: 0,
      534353: 0,
      5: 0,
      11155111: 0,
    },
    libraryDeployer: {
      default: 1, // use a different account for deploying libraries on the hardhat network
      1: 0, // use the same address as the main deployer on mainnet
      42161: 0, // use the same address on arbitrum mainnet
      10: 0, // use the same address on optimism mainnet
      250: 0, // use the same address on fantom mainnet
      9000: 0, // use the same address on evmos testnet
      9001: 0, // use the same address on evmos mainnnet
      3: 0, // use the same address on ropsten
      1313161555: 0,
      245022926: 0,
      5001: 0,
      534353: 0,
      5: 0,
      11155111: 0,
    },
  },
  spdxLicenseIdentifier: {
    overwrite: false,
    runOnCompile: true,
  },
}

if (process.env.ETHERSCAN_API) {
  config = { ...config, etherscan: { apiKey: process.env.ETHERSCAN_API } }
}

if (process.env.ACCOUNT_PRIVATE_KEYS) {
  config.networks = {
    ...config.networks,
    aurora_testnet: {
      ...config.networks?.aurora_testnet,
      accounts: JSON.parse(process.env.ACCOUNT_PRIVATE_KEYS),
    },
    neon_evm_devnet: {
      ...config.networks?.neon_evm_devnet,
      accounts: JSON.parse(process.env.ACCOUNT_PRIVATE_KEYS),
    },
    mantle_testnet: {
      ...config.networks?.mantle_testnet,
      accounts: JSON.parse(process.env.ACCOUNT_PRIVATE_KEYS),
    },
    scroll_alpha: {
      ...config.networks?.scroll_alpha,
      accounts: JSON.parse(process.env.ACCOUNT_PRIVATE_KEYS),
    },
    goerli: {
      ...config.networks?.goerli,
      accounts: JSON.parse(process.env.ACCOUNT_PRIVATE_KEYS),
    },
    sepolia: {
      ...config.networks?.sepolia,
      accounts: JSON.parse(process.env.ACCOUNT_PRIVATE_KEYS),
    },
  }
}

if (process.env.FORK_MAINNET === "true" && config.networks) {
  console.log("FORK_MAINNET is set to true")
  config = {
    ...config,
    networks: {
      ...config.networks,
      hardhat: {
        ...config.networks.hardhat,
        forking: {
          url: process.env.ALCHEMY_API_KEY
            ? ALCHEMY_BASE_URL[CHAIN_ID.MAINNET] + process.env.ALCHEMY_API_KEY
            : throwAPIKeyNotFoundError(),
        },
        chainId: 1,
      },
    },
    namedAccounts: {
      ...config.namedAccounts,
      deployer: {
        1: PROD_DEPLOYER_ADDRESS,
      },
    },
    external: {
      deployments: {
        localhost: ["deployments/mainnet"],
      },
    },
  }
}

function throwAPIKeyNotFoundError(): string {
  throw Error("ALCHEMY_API_KEY environment variable is not set")
  return ""
}

// Override the default deploy task
task("deploy", async (taskArgs, hre, runSuper) => {
  const { all } = hre.deployments
  /*
   * Pre-deployment actions
   */

  // Load exiting deployments
  const existingDeployments: { [p: string]: Deployment } = await all()
  // Create hard copy of existing deployment name to address mapping
  const existingDeploymentToAddressMap: { [p: string]: string } = Object.keys(
    existingDeployments,
  ).reduce((acc: { [p: string]: string }, key) => {
    acc[key] = existingDeployments[key].address
    return acc
  }, {})

  /*
   * Run super task
   */
  await runSuper(taskArgs)

  /*
   * Post-deployment actions
   */
  const updatedDeployments: { [p: string]: Deployment } = await all()

  // Filter out any existing deployments that have not changed
  const newDeployments: { [p: string]: Deployment } = Object.keys(
    updatedDeployments,
  ).reduce((acc: { [p: string]: Deployment }, key) => {
    if (
      !existingDeploymentToAddressMap.hasOwnProperty(key) ||
      existingDeploymentToAddressMap[key] !== updatedDeployments[key].address
    ) {
      acc[key] = updatedDeployments[key]
    }
    return acc
  }, {})

  // Print the new deployments to the console
  if (Object.keys(newDeployments).length > 0) {
    console.log("\nNew deployments:")
    console.table(
      Object.keys(newDeployments).map((k) => [k, newDeployments[k].address]),
    )
  } else {
    console.warn("\nNo new deployments found")
  }
})

export default config
