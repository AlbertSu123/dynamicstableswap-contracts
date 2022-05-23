// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract esKNS is AccessControl, ERC20 {
    /// @dev address of the veKNS contract
    address public votingEscrow;
    /// @dev address of the esKNS unlocking contract
    address public esKNSUnlock;

    /// @dev The identifier of the role which allows accounts to mint tokens.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER");

    /// @notice Initializes this esKNS contract with the given name and symbol
    /// @dev The caller of this function will become the owner. This should be called from a EOA
    /// @param name erc20 token name
    /// @param symbol erc20 token symbol
    /// @param _votingEscrow address of the votingEscrow(veKNS) contract
    /// @param _esKNSUnlock address of the esKNSUnlock
    /// @param beneficiary address of the Minter Role
    constructor(
        string memory name,
        string memory symbol,
        address _votingEscrow,
        address _esKNSUnlock,
        address beneficiary
    ) public ERC20(name, symbol) {
        // Add beneficiary as minter
        _setupRole(MINTER_ROLE, beneficiary);
        votingEscrow = _votingEscrow;
        esKNSUnlock = _esKNSUnlock;
        emit esKNSInitialized(name, symbol, _votingEscrow, _esKNSUnlock);
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

    /// @dev Mints tokens to a recipient.
    /// This function reverts if the caller does not have the minter role.
    function mint(address _recipient, uint256 _amount) external onlyMinter {
        _mint(_recipient, _amount);
    }

    /// @dev A modifier which checks that the caller has the minter role.
    modifier onlyMinter() {
        require(hasRole(MINTER_ROLE, msg.sender), "KNS: only minter");
        _;
    }

    /// @dev Emitted when initialize is called
    event esKNSInitialized(
        string name,
        string symbol,
        address _votingEscrow,
        address _esKNSUnlock
    );
}
