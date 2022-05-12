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

  if ((await getOrNull("SimpleRewarder")) == null) {
    const result = await deploy("SimpleRewarder", {
      from: deployer,
      log: true,
      args: [(await get("MiniChefV2")).address],
      skipIfAlreadyDeployed: true,
    })

    await save("SimpleRewarder_celer", result)
    //Deploy celer token
    // Deploy token to use instead of SDL which doesn't exist on saddle
    const TOKENS_ARGS: { [token: string]: any[] } = {
      celer: ["Celer", "celer", "18"],
    }
    const celer_MINTED = 50_000_000
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
        BigNumber.from(10).pow(decimals).mul(celer_MINTED),
      )
    }
    const PID = 2
    const lpToken = (await get("KinesisKUSDMetaPoolLPToken")).address
    const rewardToken = (await get("celer")).address // celer token
    const rewardAdmin = deployer // celer team's multisig wallet
    const TOTAL_LM_REWARDS = BIG_NUMBER_1E18.mul(
      BigNumber.from(celer_MINTED).div(10),
    )
    const rewardPerSecond = TOTAL_LM_REWARDS.div(6 * 4 * 7 * 24 * 3600) // celer reward per second

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

    console.log(
      rewardToken, // celer token
      rewardAdmin, // celer team's OpEx wallet
      rewardPerSecond, // 250k celer weekly
      lpToken, // master LP token
      PID, // pid
    )

    await execute(
      "MiniChefV2",
      { from: deployer, log: true },
      "add",
      1,
      lpToken,
      (
        await get("SimpleRewarder_celer")
      ).address,
    )

    await execute(
      "SimpleRewarder_celer",
      { from: deployer, log: true },
      "init",
      data,
    )

    await execute(
      "celer",
      { from: deployer, log: true },
      "approve",
      (
        await get("SimpleRewarder_celer")
      ).address,
      TOTAL_LM_REWARDS,
    )
    await execute(
      "celer",
      { from: deployer, log: true },
      "transfer",
      (
        await get("SimpleRewarder_celer")
      ).address,
      TOTAL_LM_REWARDS,
    )
    await execute(
      "celer",
      { from: deployer, log: true },
      "approve",
      (
        await get("MiniChefV2")
      ).address,
      TOTAL_LM_REWARDS,
    )
    await execute(
      "celer",
      { from: deployer, log: true },
      "transfer",
      (
        await get("MiniChefV2")
      ).address,
      TOTAL_LM_REWARDS,
    )

    expect(await read("MiniChefV2", "lpToken", PID)).to.eq(lpToken)

    // Transfer Ownership to the saddle multisig on arbitrum
    await execute(
      "MiniChefV2",
      { from: deployer, log: true },
      "transferOwnership",
      MULTISIG_ADDRESSES[await getChainId()],
      false,
      false,
    )
  }
}
export default func
func.tags = ["SimpleRewarder"]
