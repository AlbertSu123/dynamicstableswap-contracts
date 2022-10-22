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

  const result = await deploy("SimpleRewarder_usdt", {
    from: deployer,
    log: true,
    contract: "SimpleRewarder",
    args: [(await get("MiniChefV2")).address],
    skipIfAlreadyDeployed: false,
  })

  await save("SimpleRewarder_usdt", result)

  const PID = 3
  const lpToken = (await get("USDTPoolLPToken")).address
  const rewardToken = (await get("WEVMOS")).address // celer token
  const rewardAdmin = deployer // celer team's multisig wallet
  const TOTAL_LM_REWARDS = BIG_NUMBER_1E18.mul(BigNumber.from(30_000))
  const rewardPerSecond = TOTAL_LM_REWARDS.div(2 * 4 * 7 * 24 * 3600) // celer reward per second

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
      await get("SimpleRewarder_usdt")
    ).address,
  )

  await execute(
    "SimpleRewarder_usdt",
    { from: deployer, log: true },
    "init",
    data,
  )

  expect(await read("MiniChefV2", "lpToken", PID)).to.eq(lpToken)
}

export default func
func.tags = ["SimpleRewarder"]
