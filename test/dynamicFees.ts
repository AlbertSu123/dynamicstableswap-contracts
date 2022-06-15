import chai from "chai"
import { solidity } from "ethereum-waffle"
import { BigNumber, Signer } from "ethers"
import { deployments } from "hardhat"
import {
  GenericERC20,
  LPToken,
  Swap,
  SwapUtils,
  TestSwapReturnValues,
} from "../build/typechain/"
import {
  asyncForEach,
  forceAdvanceOneBlock,
  getCurrentBlockTimestamp,
  getUserTokenBalance,
  getUserTokenBalances,
  MAX_UINT256,
  setNextTimestamp,
  setTimestamp,
  TIME,
  ZERO_ADDRESS,
} from "./testUtils"

chai.use(solidity)
const { expect } = chai

describe("Swap", async () => {
  let signers: Array<Signer>
  let swap: Swap
  let testSwapReturnValues: TestSwapReturnValues
  let swapUtils: SwapUtils
  let firstToken: GenericERC20
  let secondToken: GenericERC20
  let swapToken: LPToken
  let owner: Signer
  let user1: Signer
  let user2: Signer
  let ownerAddress: string
  let user1Address: string
  let user2Address: string
  let swapStorage: {
    initialA: BigNumber
    futureA: BigNumber
    initialATime: BigNumber
    futureATime: BigNumber
    swapFee: BigNumber
    adminFee: BigNumber
    lpToken: string
  }

  // Test Values
  const INITIAL_A_VALUE = 50
  const SWAP_FEE = 1e7
  const LP_TOKEN_NAME = "Test LP Token Name"
  const LP_TOKEN_SYMBOL = "TESTLP"

  const setupTest = deployments.createFixture(
    async ({ deployments, ethers }) => {
      const { get } = deployments
      await deployments.fixture() // ensure you start from a fresh deployments

      signers = await ethers.getSigners()
      owner = signers[0]
      user1 = signers[1]
      user2 = signers[2]
      ownerAddress = await owner.getAddress()
      user1Address = await user1.getAddress()
      user2Address = await user2.getAddress()

      // Deploy dummy tokens
      const erc20Factory = await ethers.getContractFactory("GenericERC20")

      firstToken = (await erc20Factory.deploy(
        "First Token",
        "FIRST",
        "18",
      )) as GenericERC20

      secondToken = (await erc20Factory.deploy(
        "Second Token",
        "SECOND",
        "18",
      )) as GenericERC20

      // Mint dummy tokens
      await asyncForEach([owner, user1, user2], async (signer) => {
        const address = await signer.getAddress()
        await firstToken.mint(address, String(1e20))
        await secondToken.mint(address, String(1e20))
      })

      // Get Swap contract
      swap = await ethers.getContract("Swap")

      await swap.initialize(
        [firstToken.address, secondToken.address],
        [18, 18],
        LP_TOKEN_NAME,
        LP_TOKEN_SYMBOL,
        INITIAL_A_VALUE,
        SWAP_FEE,
        0,
        (
          await get("LPToken")
        ).address,
      )

      expect(await swap.getVirtualPrice()).to.be.eq(0)

      swapStorage = await swap.swapStorage()

      swapToken = (await ethers.getContractAt(
        "LPToken",
        swapStorage.lpToken,
      )) as LPToken

      const testSwapReturnValuesFactory = await ethers.getContractFactory(
        "TestSwapReturnValues",
      )
      testSwapReturnValues = (await testSwapReturnValuesFactory.deploy(
        swap.address,
        swapToken.address,
        2,
      )) as TestSwapReturnValues

      await asyncForEach([owner, user1, user2], async (signer) => {
        await firstToken.connect(signer).approve(swap.address, MAX_UINT256)
        await secondToken.connect(signer).approve(swap.address, MAX_UINT256)
        await swapToken.connect(signer).approve(swap.address, MAX_UINT256)
      })

      await swap.addLiquidity([String(1e18), String(1e18)], 0, MAX_UINT256)

      expect(await firstToken.balanceOf(swap.address)).to.eq(String(1e18))
      expect(await secondToken.balanceOf(swap.address)).to.eq(String(1e18))
    },
  )

  beforeEach(async () => {
    await setupTest()
  })

  describe("swapStorage", () => {
    describe("fee", async () => {
      it("Returns correct fee value", async () => {
        expect((await swap.swapStorage()).swapFee).to.eq(SWAP_FEE)
      })
    })
  })

  describe("swap", () => {
    it("Reverts with 'Token index out of range'", async () => {
      await expect(swap.calculateSwap(0, 9, String(1e17))).to.be.revertedWith(
        "Token index out of range",
      )
    })

    it("Succeeds with expected swap amounts", async () => {
      // User 1 calculates how much token to receive
      const calculatedSwapReturn = await swap.calculateSwap(0, 1, String(1e17))
      expect(calculatedSwapReturn).to.eq(BigNumber.from("99702611562565289"))

      const [tokenFromBalanceBefore, tokenToBalanceBefore] =
        await getUserTokenBalances(user1, [firstToken, secondToken])

      // User 1 successfully initiates swap
      await swap
        .connect(user1)
        .swap(0, 1, String(1e17), calculatedSwapReturn, MAX_UINT256)

      // Check the sent and received amounts are as expected
      const [tokenFromBalanceAfter, tokenToBalanceAfter] =
        await getUserTokenBalances(user1, [firstToken, secondToken])
      expect(tokenFromBalanceBefore.sub(tokenFromBalanceAfter)).to.eq(
        BigNumber.from(String(1e17)),
      )
      expect(tokenToBalanceAfter.sub(tokenToBalanceBefore)).to.eq(
        calculatedSwapReturn,
      )
    })

    it("Reverts when minDy (minimum amount token to receive) is not reached due to front running", async () => {
      // User 1 calculates how much token to receive
      const calculatedSwapReturn = await swap.calculateSwap(0, 1, String(1e17))
      expect(calculatedSwapReturn).to.eq(BigNumber.from("99702611562565289"))

      // User 2 swaps before User 1 does
      await swap.connect(user2).swap(0, 1, String(1e17), 0, MAX_UINT256)

      // User 1 initiates swap
      await expect(
        swap
          .connect(user1)
          .swap(0, 1, String(1e17), calculatedSwapReturn, MAX_UINT256),
      ).to.be.reverted
    })

    it("Succeeds when using lower minDy even when transaction is front-ran", async () => {
      // User 1 calculates how much token to receive with 1% slippage
      const calculatedSwapReturn = await swap.calculateSwap(0, 1, String(1e17))
      expect(calculatedSwapReturn).to.eq(BigNumber.from("99702611562565289"))

      const [tokenFromBalanceBefore, tokenToBalanceBefore] =
        await getUserTokenBalances(user1, [firstToken, secondToken])

      const calculatedSwapReturnWithNegativeSlippage = calculatedSwapReturn
        .mul(99)
        .div(100)

      // User 2 swaps before User 1 does
      await swap.connect(user2).swap(0, 1, String(1e17), 0, MAX_UINT256)

      // User 1 successfully initiates swap with 1% slippage from initial calculated amount
      await swap
        .connect(user1)
        .swap(
          0,
          1,
          String(1e17),
          calculatedSwapReturnWithNegativeSlippage,
          MAX_UINT256,
        )

      // Check the sent and received amounts are as expected
      const [tokenFromBalanceAfter, tokenToBalanceAfter] =
        await getUserTokenBalances(user1, [firstToken, secondToken])

      expect(tokenFromBalanceBefore.sub(tokenFromBalanceAfter)).to.eq(
        BigNumber.from(String(1e17)),
      )

      const actualReceivedAmount = tokenToBalanceAfter.sub(tokenToBalanceBefore)

      expect(actualReceivedAmount).to.eq(BigNumber.from("99286252365528551"))
      expect(actualReceivedAmount).to.gt(
        calculatedSwapReturnWithNegativeSlippage,
      )
      expect(actualReceivedAmount).to.lt(calculatedSwapReturn)
    })

    it("Returns correct amount of received token", async () => {
      await firstToken.mint(testSwapReturnValues.address, String(1e20))
      await secondToken.mint(testSwapReturnValues.address, String(1e20))
      await testSwapReturnValues.test_addLiquidity(
        [String(1e18), String(2e18)],
        0,
      )
      await testSwapReturnValues.test_swap(0, 1, String(1e18), 0)
    })
  })


  describe("setSwapFee", () => {
    it("Emits NewSwapFee event", async () => {
      await expect(swap.setSwapFee(BigNumber.from(1e8))).to.emit(
        swap,
        "NewSwapFee",
      )
    })

    it("Reverts when called by non-owners", async () => {
      await expect(swap.connect(user1).setSwapFee(0)).to.be.reverted
      await expect(swap.connect(user2).setSwapFee(BigNumber.from(1e8))).to.be
        .reverted
    })

    it("Reverts when fee is higher than the limit", async () => {
      await expect(swap.setSwapFee(BigNumber.from(1e8).add(1))).to.be.reverted
    })

    it("Succeeds when fee is within the limit", async () => {
      await swap.setSwapFee(BigNumber.from(1e8))
      expect((await swap.swapStorage()).swapFee).to.eq(BigNumber.from(1e8))
    })
  })

  describe("withdrawAdminFees", () => {
    it("Reverts when called by non-owners", async () => {
      await expect(swap.connect(user1).withdrawAdminFees()).to.be.reverted
      await expect(swap.connect(user2).withdrawAdminFees()).to.be.reverted
    })

    it("Succeeds when there are no fees withdrawn", async () => {
      // Sets adminFee to 1% of the swap fees
      await swap.setAdminFee(BigNumber.from(10 ** 8))

      const [firstTokenBefore, secondTokenBefore] = await getUserTokenBalances(
        owner,
        [firstToken, secondToken],
      )

      await swap.withdrawAdminFees()

      const [firstTokenAfter, secondTokenAfter] = await getUserTokenBalances(
        owner,
        [firstToken, secondToken],
      )

      expect(firstTokenBefore).to.eq(firstTokenAfter)
      expect(secondTokenBefore).to.eq(secondTokenAfter)
    })

    it("Succeeds with expected amount of fees withdrawn", async () => {
      // Sets adminFee to 1% of the swap fees
      await swap.setAdminFee(BigNumber.from(10 ** 8))
      await swap.connect(user1).swap(0, 1, String(1e17), 0, MAX_UINT256)
      await swap.connect(user1).swap(1, 0, String(1e17), 0, MAX_UINT256)

      expect(await swap.getAdminBalance(0)).to.eq(String(1001973776101))
      expect(await swap.getAdminBalance(1)).to.eq(String(998024139765))

      const [firstTokenBefore, secondTokenBefore] = await getUserTokenBalances(
        owner,
        [firstToken, secondToken],
      )

      await swap.withdrawAdminFees()

      const [firstTokenAfter, secondTokenAfter] = await getUserTokenBalances(
        owner,
        [firstToken, secondToken],
      )

      expect(firstTokenAfter.sub(firstTokenBefore)).to.eq(String(1001973776101))
      expect(secondTokenAfter.sub(secondTokenBefore)).to.eq(
        String(998024139765),
      )
    })

    it("Withdrawing admin fees has no impact on users' withdrawal", async () => {
      // Sets adminFee to 1% of the swap fees
      await swap.setAdminFee(BigNumber.from(10 ** 8))
      await swap
        .connect(user1)
        .addLiquidity([String(1e18), String(1e18)], 0, MAX_UINT256)

      for (let i = 0; i < 10; i++) {
        await swap.connect(user2).swap(0, 1, String(1e17), 0, MAX_UINT256)
        await swap.connect(user2).swap(1, 0, String(1e17), 0, MAX_UINT256)
      }

      await swap.withdrawAdminFees()

      const [firstTokenBefore, secondTokenBefore] = await getUserTokenBalances(
        user1,
        [firstToken, secondToken],
      )

      const user1LPTokenBalance = await swapToken.balanceOf(user1Address)
      await swapToken.connect(user1).approve(swap.address, user1LPTokenBalance)
      await swap
        .connect(user1)
        .removeLiquidity(user1LPTokenBalance, [0, 0], MAX_UINT256)

      const [firstTokenAfter, secondTokenAfter] = await getUserTokenBalances(
        user1,
        [firstToken, secondToken],
      )

      expect(firstTokenAfter.sub(firstTokenBefore)).to.eq(
        BigNumber.from("1000009516257264879"),
      )

      expect(secondTokenAfter.sub(secondTokenBefore)).to.eq(
        BigNumber.from("1000980987206499309"),
      )
    })
  })
})
