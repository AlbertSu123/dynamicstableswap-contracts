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

  await execute(
    "SimpleRewarder_usdc",
    { from: deployer, log: true },
    "transferOwnership",
    "0x05e1B9A295aDaF39132FC5bF2b0aEd9FE7C42a2C",
    false,
    false  
  )

  await execute(
    "SimpleRewarder_usdt",
    { from: deployer, log: true },
    "transferOwnership",
    "0x05e1B9A295aDaF39132FC5bF2b0aEd9FE7C42a2C",
    false,
    false  
  )
  
  await execute(
    "SimpleRewarder_dai",
    { from: deployer, log: true },
    "transferOwnership",
    "0x05e1B9A295aDaF39132FC5bF2b0aEd9FE7C42a2C",
    false,
    false  
  )
}

export default func
func.tags = ["SimpleRewarder"]
