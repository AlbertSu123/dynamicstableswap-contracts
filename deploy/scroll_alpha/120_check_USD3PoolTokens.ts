import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BigNumber } from "ethers"

const USD_TOKENS_ARGS: { [token: string]: any[] } = {
  DAI: ["DAI", "DAI", "18"],
  FRAX: ["FRAX", "FRAX", "18"],
  USDC: ["USD Coin", "USDC", "6"],
  USDT: ["Tether USD", "USDT", "6"],
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy, execute } = deployments
  const { deployer } = await getNamedAccounts()

  for (const token in USD_TOKENS_ARGS) {
    await deploy(token, {
      from: deployer,
      log: true,
      contract: "GenericERC20",
      args: USD_TOKENS_ARGS[token],
      skipIfAlreadyDeployed: true,
    })
    const decimals = USD_TOKENS_ARGS[token][2]
    await execute(
      token,
      { from: deployer, log: true },
      "mint",
      deployer,
      BigNumber.from(10).pow(decimals).mul(1000000),
    )
  }
}
export default func
func.tags = ["ArbUSDPoolV2Tokens"]
