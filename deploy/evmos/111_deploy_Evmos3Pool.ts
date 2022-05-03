import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save } = deployments
  const { deployer } = await getNamedAccounts()

  // Manually check if the pool is already deployed
  const kinesisEvmos3pool = await getOrNull("kinesisEvmos3pool")
  if (kinesisEvmos3pool) {
    log(`reusing "Evmos3poolTokens" at ${kinesisEvmos3pool.address}`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      "0xE03494D0033687543a80c9B1ca7D6237F2EA8BD8",
      "0x51e44FfaD5C2B122C8b635671FCC8139dc636E82",
      "0x7FF4a56B32ee13D7D4D405887E0eA37d61Ed919e",
    ]
    const TOKEN_DECIMALS = [18, 6, 6]
    const LP_TOKEN_NAME = "kinesis 3pool"
    const LP_TOKEN_SYMBOL = "kinesisEvmosUSD"
    const INITIAL_A = 400
    const SWAP_FEE = 4e6 // 4bps
    const ADMIN_FEE = 0

    await execute(
      "SwapFlashLoan",
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

    await save("kinesisEvmos3pool", {
      abi: (await get("SwapFlashLoan")).abi,
      address: (await get("SwapFlashLoan")).address,
    })

    const lpTokenAddress = (await read("kinesisEvmos3pool", "swapStorage"))
      .lpToken
    log(`kinesis Evmos USD Pool LP Token at ${lpTokenAddress}`)

    await save("kinesisEvmos3poolLPToken", {
      abi: (await get("LPToken")).abi, // LPToken ABI
      address: lpTokenAddress,
    })
  }
}
export default func
func.tags = ["kinesisEvmos3pool"]
func.dependencies = ["SwapUtils", "SwapFlashLoan", "Evmos3poolTokens"]
