import { expect } from "chai"
import { BigNumber } from "ethers"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { BIG_NUMBER_1E18 } from "../../test/testUtils"
import { MULTISIG_ADDRESSES } from "../../utils/accounts"
import { CELER_MINTED } from "./200_deploy_MiniChefV2"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId, ethers } = hre
  const { deploy, execute, get, getOrNull, save, read } = deployments
  const { deployer } = await getNamedAccounts()

  const result = await deploy("SimpleRewarder_usdc", {
    from: deployer,
    log: true,
    contract: "SimpleRewarder",
    args: [(await get("MiniChefV2")).address],
  })

  // await save("SimpleRewarder_usdc", result)

  const PID = 2
  const lpToken = (await get("USDCPoolLPToken")).address
  const rewardToken = (await get("WEVMOS")).address // wevmos token
  const rewardAdmin = deployer // kinesis team's multisig wallet
  const TOTAL_LM_REWARDS = BIG_NUMBER_1E18.mul(BigNumber.from(50_000))
  const rewardPerSecond = TOTAL_LM_REWARDS.div(2 * 30 * 24 * 3600) // evmos reward per second

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
      await get("SimpleRewarder_usdc")
    ).address,
  )

  await execute(
    "SimpleRewarder_usdc",
    { from: deployer, log: true },
    "init",
    data,
  )

  expect(await read("MiniChefV2", "lpToken", PID)).to.eq(lpToken)

  await execute(
    "SimpleRewarder_usdc",
    { from: deployer, log: true },
    "transferOwnership",
    "0x05e1B9A295aDaF39132FC5bF2b0aEd9FE7C42a2C",
    false,
    false  
  )
}

export default func
func.tags = ["SimpleRewarder"]
