import { expect } from "chai"
import { BigNumber } from "ethers"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { BIG_NUMBER_1E18 } from "../../test/testUtils"
import { MULTISIG_ADDRESSES } from "../../utils/accounts"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId, ethers } = hre
  const { deploy, execute, get, getOrNull, save, read } = deployments
  const { deployer } = await getNamedAccounts()

  const result = await deploy("SimpleRewarder_celer3", {
    from: deployer,
    log: true,
    contract: "SimpleRewarder",
    args: [(await get("MiniChefV2")).address],
  })

  await save("SimpleRewarder_celer3", result)

  const PID = 4
  const lpToken = (await get("USD3Pool3LPToken")).address
  const rewardToken = (await get("celer")).address // celer token
  const rewardAdmin = deployer // celer team's multisig wallet
  const TOTAL_LM_REWARDS = BIG_NUMBER_1E18.mul(BigNumber.from(19_000))
  const rewardPerSecond = TOTAL_LM_REWARDS.div(3 * 4 * 7 * 24 * 3600) // celer reward per second

  // (IERC20 rewardToken, address owner, uint256 rewardPerSecond, IERC20 masterLpToken, uint256 pid)
  const data = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "uint256", "address", "uint256"],
    [
      rewardToken, // celer token
      rewardAdmin, // celer team's OpEx wallet
      rewardPerSecond, // 250k celer weekly
      lpToken, // master LP token
      PID, // pid
    ],
  )

  await execute(
    "MiniChefV2",
    { from: deployer, log: true },
    "add",
    1,
    lpToken,
    (
      await get("SimpleRewarder_celer3")
    ).address,
  )

  await execute(
    "SimpleRewarder_celer3",
    { from: deployer, log: true },
    "init",
    data,
  )

  await execute(
    "celer",
    { from: deployer, log: true },
    "transfer",
    (
      await get("SimpleRewarder_celer3")
    ).address,
    TOTAL_LM_REWARDS,
  )

  expect(await read("MiniChefV2", "lpToken", PID)).to.eq(lpToken)
}

export default func
func.tags = ["SimpleRewarder"]
