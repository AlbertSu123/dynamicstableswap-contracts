import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { MULTISIG_ADDRESSES } from "../../utils/accounts"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save, deploy } = deployments
  const { deployer } = await getNamedAccounts()

  // Manually check if the pool is already deployed
  const kinesisNomadUSDPool = await getOrNull("kinesisNomadUSDPool")
  if (kinesisNomadUSDPool) {
    log(`reusing "kinesisNomadUSDPool" at ${kinesisNomadUSDPool.address}`)
  } else {
    // Constructor arguments
    // TODO: Replace with correct addresses
    const TOKEN_ADDRESSES = [
      (await get("FRAX")).address,
      (await get("USDC")).address,
      (await get("USDT")).address,
    ]
    const TOKEN_DECIMALS = [18, 6, 6]
    const LP_TOKEN_NAME = "Kinesis FRAX/USDC/USDT"
    const LP_TOKEN_SYMBOL = "kinesisNomadUSDPool"
    const INITIAL_A = 200
    const SWAP_FEE = 4e6 // 4bps
    const ADMIN_FEE = 0

    await deploy("kinesisNomadUSDPool", {
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
      "kinesisNomadUSDPool",
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

    const lpTokenAddress = (await read("kinesisNomadUSDPool", "swapStorage"))
      .lpToken
    log(`Kinesis Nomad USD Pool LP Token at ${lpTokenAddress}`)

    await save("kinesisNomadUSDPoolLPToken", {
      abi: (await get("LPToken")).abi, // LPToken ABI
      address: lpTokenAddress,
    })

    await execute(
      "kinesisNomadUSDPool",
      { from: deployer, log: true },
      "transferOwnership",
      MULTISIG_ADDRESSES[await getChainId()],
    )
  }
}
export default func
func.tags = ["kinesisNomadUSDPool"]
func.dependencies = ["SwapUtils", "SwapFlashLoan", "ArbUSDPoolV2Tokens"]
