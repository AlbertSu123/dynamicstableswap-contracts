import { BIG_NUMBER_1E18 } from "../../test/testUtils"
import { BigNumber } from "ethers"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { MiniChefV2 } from "../../build/typechain"
import { ethers } from "hardhat"
import { MULTISIG_ADDRESSES } from "../../utils/accounts"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { deploy, get, execute, getOrNull, log } = deployments
  const { deployer } = await getNamedAccounts()

  const miniChef = await getOrNull("MiniChefV2")
  if (miniChef) {
    log(`Reusing MiniChefV2 at ${miniChef.address}`)
  } else {
    // Deploy token to use instead of SDL which doesn't exist on saddle
    const TOKENS_ARGS: { [token: string]: any[] } = {
      KNS: ["KNS", "KNS", "18"],
    }
    const KNS_MINTED = 50_000_000
    for (const token in TOKENS_ARGS) {
      await deploy(token, {
        from: deployer,
        log: true,
        contract: "GenericERC20",
        args: TOKENS_ARGS[token],
        skipIfAlreadyDeployed: true,
      })
      const decimals = TOKENS_ARGS[token][2]
      await execute(
        token,
        { from: deployer, log: true },
        "mint",
        deployer,
        BigNumber.from(10).pow(decimals).mul(KNS_MINTED),
      )
    }

    // Deploy retroactive vesting contract for airdrops
    await deploy("MiniChefV2", {
      from: deployer,
      log: true,
      skipIfAlreadyDeployed: true,
      args: [(await get("KNS")).address],
    })

    const minichef: MiniChefV2 = await ethers.getContract("MiniChefV2")

    // Total LM rewards is 30,000,000 but only 12,500,000 is allocated in the beginning
    // Aribtrum's portion is 5_000_000
    const TOTAL_LM_REWARDS = BIG_NUMBER_1E18.mul(KNS_MINTED).div(10)
    // 6 months (24 weeks)
    const lmRewardsPerSecond = TOTAL_LM_REWARDS.div(6 * 4 * 7 * 24 * 3600)

    const batchCall = [
      await minichef.populateTransaction.setSaddlePerSecond(lmRewardsPerSecond),
      await minichef.populateTransaction.add(
        1,
        "0x0000000000000000000000000000000000000000", // blank lp token to enforce totalAllocPoint != 0
        "0x0000000000000000000000000000000000000000",
      ),
      await minichef.populateTransaction.add(
        0,
        (
          await get("KinesisKUSDMetaPoolLPToken")
        ).address, // arbUSD pool
        "0x0000000000000000000000000000000000000000",
      ),
    ]

    const batchCallData = batchCall.map((x) => x.data)

    // Send batch call
    await execute(
      "MiniChefV2",
      { from: deployer, log: true },
      "batch",
      batchCallData,
      false,
    )
  }
}
export default func
func.tags = ["MiniChef"]
