import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { MULTISIG_ADDRESSES } from "../../utils/accounts"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save, deploy } = deployments
  const { deployer } = await getNamedAccounts()

  // Manually check if the pool is already deployed
  const USDTPool = await getOrNull("USDTPool")
  if (USDTPool) {
    log(`reusing "USDTPool" at ${USDTPool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      "0xe01C6D4987Fc8dCE22988DADa92d56dA701d0Fe0", //axlUSDT
      "0xb72A7567847abA28A2819B855D7fE679D4f59846", //ceUSDT
      "0xecEEEfCEE421D8062EF8d6b4D814efe4dc898265", //gUSDT
    ]
    const TOKEN_DECIMALS = [6, 6, 6]
    const LP_TOKEN_NAME = "Kinesis axlUSDT/ceUSDT/gUSDT"
    const LP_TOKEN_SYMBOL = "USDTPool"
    const INITIAL_A = 200
    const SWAP_FEE = 4e6 // 4bps
    const ADMIN_FEE = 0

    await deploy("USDTPool", {
      from: deployer,
      log: true,
      contract: "SwapFlashLoan",
      libraries: {
        SwapUtils: (await get("SwapUtils")).address,
        AmplificationUtils: (await get("AmplificationUtils")).address,
      },
      skipIfAlreadyDeployed: true,
    })

    await execute(
      "USDTPool",
      { from: deployer, log: true },
      "initialize",
      TOKEN_ADDRESSES,
      TOKEN_DECIMALS,
      LP_TOKEN_NAME,
      LP_TOKEN_SYMBOL,
      INITIAL_A,
      SWAP_FEE,
      ADMIN_FEE,
      (
        await get("LPToken")
      ).address,
    )

    const lpTokenAddress = (await read("USDTPool", "swapStorage")).lpToken
    log(`USDTPool LP Token at ${lpTokenAddress}`)

    await save("USDTPoolLPToken", {
      abi: (await get("LPToken")).abi, // LPToken ABI
      address: lpTokenAddress,
    })
  }
}
export default func
func.tags = ["USDTPool"]
func.dependencies = ["SwapUtils", "SwapFlashLoan", "ArbUSDPoolV2Tokens"]
