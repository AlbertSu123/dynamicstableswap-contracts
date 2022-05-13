import { expect } from "chai"
import { BigNumber } from "ethers"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { BIG_NUMBER_1E18 } from "../../test/testUtils"
import { ZERO_ADDRESS } from "../../test/testUtils"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId, ethers } = hre
  const { deploy, execute, get, getOrNull, save, read } = deployments
  const { deployer } = await getNamedAccounts()

  if ((await getOrNull("SimpleRewarder")) == null) {
    const result = await deploy("SimpleRewarder", {
      from: deployer,
      log: true,
      args: [(await get("MiniChefV2")).address],
      skipIfAlreadyDeployed: true,
    })

    await save("SimpleRewarder_SPA", result)

    const PID = 2
    const lpToken = (await get("kinesisNomadUSDPoolLPToken")).address
    const rewardToken = (await get("SPA")).address // SPA token
    const rewardAdmin = deployer // SPA team's multisig wallet
    const TOTAL_LM_REWARDS = BigNumber.from(0)
    const rewardPerSecond = TOTAL_LM_REWARDS.div(6 * 4 * 7 * 24 * 3600) // SPA reward per second

    await execute(
      "MiniChefV2",
      { from: deployer, log: true },
      "add",
      0,
      lpToken,
      (
        await get("SimpleRewarder_SPA")
      ).address,
    )

    // Ensure pid is correct
    expect(await read("MiniChefV2", "lpToken", PID)).to.eq(lpToken)

    // (IERC20 rewardToken, address owner, uint256 rewardPerSecond, IERC20 masterLpToken, uint256 pid)
    const data = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "address", "uint256"],
      [
        rewardToken, // SPA token
        rewardAdmin, // SPA team's OpEx wallet
        rewardPerSecond, // 250k SPA weekly
        lpToken, // master LP token
        PID, // pid
      ],
    )

    await execute(
      "SimpleRewarder_SPA",
      { from: deployer, log: true },
      "init",
      data,
    )

    // Transfer 1 month worth of LM rewards to MiniChefV2
    await execute(
      "SPA",
      { from: deployer, log: true },
      "transfer",
      (
        await get("SimpleRewarder_SPA")
      ).address,
      TOTAL_LM_REWARDS,
    )
  }
}
export default func
func.tags = ["SimpleRewarder"]
