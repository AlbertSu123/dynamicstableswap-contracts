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

    //Deploy SPA token
    // Deploy token to use instead of SDL which doesn't exist on saddle
    const TOKENS_ARGS: { [token: string]: any[] } = {
      SPA: ["SPA", "SPA", "18"],
    }
    const SPA_MINTED = 50_000_000
    for (const token in TOKENS_ARGS) {
      await deploy(token, {
        from: deployer,
        log: true,
        contract: "GenericERC20",
        args: TOKENS_ARGS[token],
        skipIfAlreadyDeployed: true,
      })
      // If it's on hardhat, mint test tokens
      const decimals = TOKENS_ARGS[token][2]
      await execute(
        token,
        { from: deployer, log: true },
        "mint",
        deployer,
        BigNumber.from(10).pow(decimals).mul(SPA_MINTED),
      )
    }

    const PID = 2
    const lpToken = (await get("SaddleArbUSDSMetaPoolLPToken")).address
    const rewardToken = (await get("SPA")).address // SPA token
    const rewardAdmin = deployer // SPA team's multisig wallet
    const TOTAL_LM_REWARDS = BIG_NUMBER_1E18.mul(
      BigNumber.from(SPA_MINTED).div(10),
    )
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
  }
}
export default func
func.tags = ["SimpleRewarder"]
