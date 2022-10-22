import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { MULTISIG_ADDRESSES } from "../../utils/accounts"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save, deploy } = deployments
  const { deployer } = await getNamedAccounts()

  // Manually check if the pool is already deployed
  const USDCPool = await getOrNull("USDCPool")
  if (USDCPool) {
    log(`reusing "USDCPool" at ${USDCPool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      "0x15C3Eb3B621d1Bff62CbA1c9536B7c1AE9149b57", //axlUSDC
      "0xe46910336479F254723710D57e7b683F3315b22B", //ceUSDC
      "0x5FD55A1B9FC24967C4dB09C513C3BA0DFa7FF687", //gUSDC
    ]
    const TOKEN_DECIMALS = [6, 6, 6]
    const LP_TOKEN_NAME = "Kinesis axlUSDC/ceUSDC/gUSDC"
    const LP_TOKEN_SYMBOL = "USDCPool"
    const INITIAL_A = 200
    const SWAP_FEE = 4e6 // 4bps
    const ADMIN_FEE = 0

    await deploy("USDCPool", {
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
      "USDCPool",
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

    const lpTokenAddress = (await read("USDCPool", "swapStorage")).lpToken
    log(`USDCPool LP Token at ${lpTokenAddress}`)

    await save("USDCPoolLPToken", {
      abi: (await get("LPToken")).abi, // LPToken ABI
      address: lpTokenAddress,
    })
  }
}
export default func
func.tags = ["USDCPool"]
func.dependencies = ["SwapUtils", "SwapFlashLoan", "ArbUSDPoolV2Tokens"]
