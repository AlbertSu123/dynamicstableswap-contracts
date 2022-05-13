import hre from "hardhat"
const { ethers } = hre

async function main() {
  const CONTRACT_NAME = "MiniChefV2"
  const CONTRACT_ADDRESS = "0x875376973B386eaf2cEedf6A2F452B96eE2fa810"
  const minichef = await ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)
  console.log(await minichef.rewarder(0))
  console.log(await minichef.rewarder(1))
  console.log(await minichef.rewarder(2))
  await mintLPTokens()
}

async function mintLPTokens() {
    
}

main().catch((error) => {
  throw error
})
