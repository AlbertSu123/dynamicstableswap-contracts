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
    // Deploy retroactive vesting contract for airdrops
    await deploy("MiniChefV2", {
      from: deployer,
      log: true,
      skipIfAlreadyDeployed: true,
      args: ["0x0000000000000000000000000000000000000000"],
    })

    const minichef: MiniChefV2 = await ethers.getContract("MiniChefV2")

    const batchCall = [
      await minichef.populateTransaction.setSaddlePerSecond(0),
      await minichef.populateTransaction.add(
        1,
        "0x0000000000000000000000000000000000000000", // blank lp token to enforce totalAllocPoint != 0
        "0x0000000000000000000000000000000000000000",
      ),
      await minichef.populateTransaction.add(
        0,
        (
          await get("USD3PoolLP1Token")
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

    //Deploy celer token
    // Deploy token to use instead of SDL which doesn't exist on saddle
    const TOKENS_ARGS: { [token: string]: any[] } = {
      celer: ["Celer", "celer", "18"],
    }
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
        BigNumber.from(10).pow(decimals).mul(CELER_MINTED),
      )
    }
  }
}

export const CELER_MINTED = 99_000
export default func
func.tags = ["MiniChef"]
