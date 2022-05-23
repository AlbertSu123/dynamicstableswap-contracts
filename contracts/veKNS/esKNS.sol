// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @dev we want esKNS to be an ERC20Upgradable and burnable
 */
contract esKNS is ERC20BurnableUpgradeable, OwnableUpgradeable {
    address public votingEscrow;
    address public esKNSUnlock;

    /**
     * @notice Initializes this esKNS contract with the given name and symbol
     * @dev The caller of this function will become the owner. This should be called from a EOA
     * @param _votingEscrow address of the votingEscrow(veKNS) contract
     * @param _esKNSUnlock address of the esKNSUnlock
     */
    function initialize(address _votingEscrow, address _esKNSUnlock)
        external
        initializer
        returns (bool)
    {
        __Context_init_unchained();
        __ERC20_init_unchained("esKNS", "esKNS");
        __Ownable_init_unchained();
        votingEscrow = _votingEscrow;
        esKNSUnlock = _esKNSUnlock;
        return true;
    }

    /**
     * @dev disable token transfers except for votingEscrow and esKNSVestingContract
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount); // Call parent hook
        require(
            to == votingEscrow || to == esKNSUnlock,
            "Must transfer to veKNS or esKNSUnlock contract"
        );
    }
}
