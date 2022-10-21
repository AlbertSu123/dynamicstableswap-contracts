import { BigNumber } from "ethers"
import { BIG_NUMBER_1E18 } from "../../test/testUtils"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { MiniChefV2 } from "../../build/typechain"
import { MULTISIG_ADDRESSES } from "../../utils/accounts"
import { ethers } from "hardhat"

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
      args: [(await get("KNS")).address],
    })

    const minichef: MiniChefV2 = await ethers.getContract("MiniChefV2")

    const batchCall = [
      await minichef.populateTransaction.setSaddlePerSecond(0),
      await minichef.populateTransaction.add(
        1,
        "0x0000000000000000000000000000000000000000", // blank lp token to enforce totalAllocPoint != 0
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
func.tags = ["MiniChef"]
