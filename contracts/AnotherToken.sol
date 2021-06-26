// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract AnotherToken is ERC20('Another Token', 'ATT'), Ownable {
	event TokenBurnt(uint256 amount);

	function mint(address recipient_, uint256 amount_) public onlyOwner returns (bool) {
		uint256 balanceBefore = balanceOf(recipient_);
		_mint(recipient_, amount_);
		uint256 balanceAfter = balanceOf(recipient_);

		return balanceAfter > balanceBefore;
	}
}
