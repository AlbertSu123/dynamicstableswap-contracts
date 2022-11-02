import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { MULTISIG_ADDRESSES } from "../../utils/accounts"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save, deploy } = deployments
  const { deployer } = await getNamedAccounts()

  // Manually check if the pool is already deployed
  const DAIPool = await getOrNull("DAIPool")
  if (DAIPool) {
    log(`reusing "DAIPool" at ${DAIPool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      "0x4A2a90D444DbB7163B5861b772f882BbA394Ca67", //axlDAI
      "0x940dAAbA3F713abFabD79CdD991466fe698CBe54", //ceDAI
      "0xd567B3d7B8FE3C79a1AD8dA978812cfC4Fa05e75", //gDAI
    ]
    const TOKEN_DECIMALS = [18, 18, 18]
    const LP_TOKEN_NAME = "Kinesis axlDAI/ceDAI/gDAI"
    const LP_TOKEN_SYMBOL = "DAIPool"
    const INITIAL_A = 200
    const SWAP_FEE = 4e6 // 4bps
    const ADMIN_FEE = 0

    await deploy("DAIPool", {
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
      "DAIPool",
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

    const lpTokenAddress = (await read("DAIPool", "swapStorage")).lpToken
    log(`DAIPool LP Token at ${lpTokenAddress}`)

    await save("DAIPoolLPToken", {
      abi: (await get("LPToken")).abi, // LPToken ABI
      address: lpTokenAddress,
    })
  }
}
export default func
func.tags = ["DAIPool"]
func.dependencies = ["SwapUtils", "SwapFlashLoan", "ArbUSDPoolV2Tokens"]
