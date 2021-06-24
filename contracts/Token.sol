pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract Token is ERC20, Ownable {
	event TokenBurnt(uint256 amount);

	constructor() ERC20('Test Token', 'TT') {
		// 1,000,000, just for testing purposes, should replace with a mint/block function
		_mint(msg.sender, 10**6); 
	}

	function transfer(address recipient, uint256 amount) public override returns (bool) {
		require(recipient != address(this));
		return super.transfer(recipient, amount);
	}

	function mint(address recipient_, uint256 amount_) public onlyOwner returns (bool) {
		uint256 balanceBefore = balanceOf(recipient_);
		_mint(recipient_, amount_);
		uint256 balanceAfter = balanceOf(recipient_);

		return balanceAfter > balanceBefore;
	}

	function burn(uint256 amount_) public onlyOwner {
		_burn(msg.sender, amount_);
		emit TokenBurnt(amount_);
	}
}
