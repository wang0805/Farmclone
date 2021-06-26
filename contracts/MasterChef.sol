// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import 'hardhat/console.sol'; // lets us console.log in here

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';

import './Token.sol';

contract MasterChef is Ownable, ReentrancyGuard {
	using SafeMath for uint256;
	using SafeERC20 for IERC20;

	// Info of each user.
	struct UserInfo {
		uint256 amount; // How many LP tokens the user has provided.
		uint256 rewardDebt; // Reward debt. See explanation below.
		//
		// We do some fancy math here. Basically, any point in time, the amount of TOKENs
		// entitled to a user but is pending to be distributed is:
		//
		//   pending reward = (user.amount * pool.accTokensPerShare) - user.rewardDebt
		//
		// Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
		//   1. The pool's `accTokensPerShare` (and `lastRewardBlock`) gets updated.
		//   2. User receives the pending reward sent to his/her address.
		//   3. User's `amount` gets updated.
		//   4. User's `rewardDebt` gets updated.
	}

	// Info of each pool.
	struct PoolInfo {
		IERC20 lpToken; // Address of LP token contract.
		uint256 allocPoint; // How many allocation points assigned to this pool. TOKENs to distribute per block.
		uint256 lastRewardBlock; // Last block number that TOKENs distribution occurs.
		uint256 accTokensPerShare; // Accumulated TOKENs per share, times 1e18. See below.
		uint16 depositFeeBP; // Deposit fee in basis points
	}

	Token public token;
	address public devAddress;
	address public feeAddress;

	uint256 public tokensPerBlock = 1 ether; // tokens created per block.

	PoolInfo[] public poolInfo; // Info of each pool.
	mapping(IERC20 => bool) public poolExistence; // Whether a pool exists.
	mapping(uint256 => mapping(address => UserInfo)) public userInfo; // Info of each user that stakes LP tokens.
	uint256 public totalAllocPoint = 0; // Total allocation points. Must be the sum of all allocation points in all pools.
	uint256 public startBlock; // The block number when token mining starts.

	event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
	event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
	event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
	event SetFeeAddress(address indexed user, address indexed newAddress);
	event SetDevAddress(address indexed user, address indexed newAddress);
	event UpdateEmissionRate(address indexed user, uint256 tokensPerBlock);

	constructor(
		Token _token,
		address _devAddress,
		address _feeAddress,
		uint256 _startBlock
	) {
		console.log('Block number:', block.number);
		token = _token;
		devAddress = _devAddress;
		feeAddress = _feeAddress;
		startBlock = _startBlock;
	}

	function poolLength() external view returns (uint256) {
		return poolInfo.length;
	}

	// Add a new lp to the pool. Can only be called by the owner.
	function add(
		uint256 _allocPoint,
		IERC20 _lpToken,
		uint16 _depositFeeBP
	) external onlyOwner {
		require(poolExistence[_lpToken] == false, 'nonDuplicated: duplicated');
		require(_depositFeeBP <= 10000, 'add: invalid deposit fee basis points');
		uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
		totalAllocPoint = totalAllocPoint.add(_allocPoint);
		poolExistence[_lpToken] = true;
		poolInfo.push(
			PoolInfo({
				lpToken: _lpToken,
				allocPoint: _allocPoint,
				lastRewardBlock: lastRewardBlock,
				accTokensPerShare: 0,
				depositFeeBP: _depositFeeBP
			})
		);
	}

	// Update the given pool's token allocation point and deposit fee. Can only be called by the owner.
	function set(
		uint256 _pid,
		uint256 _allocPoint,
		uint16 _depositFeeBP
	) external onlyOwner {
		require(_depositFeeBP <= 10000, 'set: invalid deposit fee basis points');
		totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
		poolInfo[_pid].allocPoint = _allocPoint;
		poolInfo[_pid].depositFeeBP = _depositFeeBP;
	}

	// Return reward multiplier over the given _from to _to block.
	function getMultiplier(uint256 _from, uint256 _to) public pure returns (uint256) {
		return _to.sub(_from);
	}

	// View function to see pending TOKENs on frontend.
	function pendingTokens(uint256 _pid, address _user) external view returns (uint256) {
		PoolInfo storage pool = poolInfo[_pid];
		UserInfo storage user = userInfo[_pid][_user];
		uint256 accTokensPerShare = pool.accTokensPerShare;
		uint256 lpSupply = pool.lpToken.balanceOf(address(this));
		if (block.number > pool.lastRewardBlock && lpSupply != 0) {
			uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
			uint256 tokenReward = multiplier.mul(tokensPerBlock).mul(pool.allocPoint).div(
				totalAllocPoint
			);
			accTokensPerShare = accTokensPerShare.add(tokenReward.mul(1e18).div(lpSupply));
		}
		return user.amount.mul(accTokensPerShare).div(1e18).sub(user.rewardDebt);
	}

	// Update reward variables for all pools. Be careful of gas spending!
	function massUpdatePools() public {
		uint256 length = poolInfo.length;
		for (uint256 pid = 0; pid < length; ++pid) {
			updatePool(pid);
		}
	}

	// Update reward variables of the given pool to be up-to-date.
	function updatePool(uint256 _pid) public {
		PoolInfo storage pool = poolInfo[_pid];
		if (block.number <= pool.lastRewardBlock) {
			return;
		}
		uint256 lpSupply = pool.lpToken.balanceOf(address(this));
		if (lpSupply == 0 || pool.allocPoint == 0) {
			pool.lastRewardBlock = block.number;
			return;
		}
		uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
		uint256 tokenReward = multiplier.mul(tokensPerBlock).mul(pool.allocPoint).div(
			totalAllocPoint
		);
		token.mint(devAddress, tokenReward.div(10)); // extra 10% of all tokens minted go to devAddress
		token.mint(address(this), tokenReward);
		pool.accTokensPerShare = pool.accTokensPerShare.add(tokenReward.mul(1e18).div(lpSupply));
		pool.lastRewardBlock = block.number;
	}

	// Deposit LP tokens to MasterChef for token allocation.
	function deposit(uint256 _pid, uint256 _amount) public nonReentrant {
		PoolInfo storage pool = poolInfo[_pid];
		UserInfo storage user = userInfo[_pid][msg.sender];
		updatePool(_pid);
		if (user.amount > 0) {
			uint256 pending = user.amount.mul(pool.accTokensPerShare).div(1e18).sub(
				user.rewardDebt
			);
			if (pending > 0) {
				safeTokenTransfer(msg.sender, pending);
			}
		}
		if (_amount > 0) {
			pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
			if (pool.depositFeeBP > 0) {
				uint256 depositFee = _amount.mul(pool.depositFeeBP).div(10000);
				pool.lpToken.safeTransfer(feeAddress, depositFee);
				user.amount = user.amount.add(_amount).sub(depositFee);
			} else {
				user.amount = user.amount.add(_amount);
			}
		}
		user.rewardDebt = user.amount.mul(pool.accTokensPerShare).div(1e18);
		emit Deposit(msg.sender, _pid, _amount);
	}

	// Withdraw LP tokens from MasterChef.
	function withdraw(uint256 _pid, uint256 _amount) public nonReentrant {
		PoolInfo storage pool = poolInfo[_pid];
		UserInfo storage user = userInfo[_pid][msg.sender];
		require(user.amount >= _amount, 'withdraw: not good');
		updatePool(_pid);
		uint256 pending = user.amount.mul(pool.accTokensPerShare).div(1e18).sub(user.rewardDebt);
		if (pending > 0) {
			safeTokenTransfer(msg.sender, pending);
		}
		if (_amount > 0) {
			user.amount = user.amount.sub(_amount);
			pool.lpToken.safeTransfer(address(msg.sender), _amount);
		}
		user.rewardDebt = user.amount.mul(pool.accTokensPerShare).div(1e18);
		emit Withdraw(msg.sender, _pid, _amount);
	}

	// Withdraw without caring about rewards. EMERGENCY ONLY.
	function emergencyWithdraw(uint256 _pid) public nonReentrant {
		PoolInfo storage pool = poolInfo[_pid];
		UserInfo storage user = userInfo[_pid][msg.sender];
		uint256 amount = user.amount;
		user.amount = 0;
		user.rewardDebt = 0;
		pool.lpToken.safeTransfer(address(msg.sender), amount);
		emit EmergencyWithdraw(msg.sender, _pid, amount);
	}

	// Safe token transfer function, just in case if rounding error causes pool to not have enough tokens.
	function safeTokenTransfer(address _to, uint256 _amount) internal {
		uint256 tokenBal = token.balanceOf(address(this));
		bool transferSuccess = false;
		if (_amount > tokenBal) {
			transferSuccess = token.transfer(_to, tokenBal);
		} else {
			transferSuccess = token.transfer(_to, _amount);
		}
		require(transferSuccess, 'safetokenTransfer: Transfer failed');
	}

	// Update dev address by the previous dev.
	function setDevAddress(address _devAddress) external onlyOwner {
		devAddress = _devAddress;
		emit SetDevAddress(msg.sender, _devAddress);
	}

	function setFeeAddress(address _feeAddress) external onlyOwner {
		feeAddress = _feeAddress;
		emit SetFeeAddress(msg.sender, _feeAddress);
	}

	function updateEmissionRate(uint256 _tokensPerBlock) external onlyOwner {
		massUpdatePools();
		tokensPerBlock = _tokensPerBlock;
		emit UpdateEmissionRate(msg.sender, _tokensPerBlock);
	}

	// Only update before start of farm
	function updateStartBlock(uint256 _startBlock) external onlyOwner {
		require(startBlock > block.number, 'Farm already started');
		startBlock = _startBlock;
	}
}
