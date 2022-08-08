import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { ethers } from "hardhat"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save } = deployments
  const { deployer } = await getNamedAccounts()

  // Manually check if the pool is already deployed
  const KinesisNomad3pool = await getOrNull("KinesisNomad3pool")
  if (KinesisNomad3pool) {
    log(`reusing "Evmos3poolTokens" at ${KinesisNomad3pool.address}`)
    const pool = await ethers.getContractAt("SwapFlashLoan", (await get("KinesisNomad3pool")).address)
    await pool.pause()
  } else {
  }
}
export default func
func.tags = ["KinesisNomad3pool"]
func.dependencies = ["SwapUtils", "SwapFlashLoan", "Evmos3poolTokens"]
