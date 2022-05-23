// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @dev we want esKNS to be an ERC20Upgradable and burnable
contract esKNS is ERC20BurnableUpgradeable, OwnableUpgradeable {
    address public votingEscrow;
    address public esKNSUnlock;

    /// @notice Initializes this esKNS contract with the given name and symbol
    /// @dev The caller of this function will become the owner. This should be called from a EOA
    /// @param _votingEscrow address of the votingEscrow(veKNS) contract
    /// @param _esKNSUnlock address of the esKNSUnlock
    function initialize(
        string memory name,
        string memory symbol,
        address _votingEscrow,
        address _esKNSUnlock
    ) external initializer returns (bool) {
        __Context_init_unchained();
        __ERC20_init_unchained(name, symbol);
        __Ownable_init_unchained();
        votingEscrow = _votingEscrow;
        esKNSUnlock = _esKNSUnlock;
        emit esKNSInitialized(name, symbol, _votingEscrow, _esKNSUnlock);
        return true;
    }

    /// @dev disable token transfers except for votingEscrow and esKNSVestingContract
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount); // Call parent hook - required
        require(
            to == votingEscrow || to == esKNSUnlock,
            "Must transfer to veKNS or esKNSUnlock contract"
        );
    }

    /// @dev Emitted when initialize is called
    event esKNSInitialized(
        string name,
        string symbol,
        address _votingEscrow,
        address _esKNSUnlock
    );
}