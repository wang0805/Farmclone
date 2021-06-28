import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { MasterChef } from '../types/MasterChef';
import { Token } from '../types/Token';
import { AnotherToken } from '../types/AnotherToken';

describe('MasterChef', function () {
	let token: Token;
	let poolToken: AnotherToken;
	let chef: MasterChef;
	let owner: SignerWithAddress;
	let devAddr: SignerWithAddress;
	let feeAddr: SignerWithAddress;
	let userAddr: SignerWithAddress;

	beforeEach(async function () {
		[owner, devAddr, feeAddr, userAddr] = await ethers.getSigners();
		const tokenFactory = await ethers.getContractFactory('Token');
		token = (await tokenFactory.deploy()) as Token;
		const anotherTokenFactory = await ethers.getContractFactory('AnotherToken');
		poolToken = (await anotherTokenFactory.deploy()) as Token;
		const chefFactory = await ethers.getContractFactory('MasterChef');
		chef = (await chefFactory.deploy(
			token.address,
			devAddr.address,
			feeAddr.address,
			0,
		)) as MasterChef;
		const tx = await token.transferOwnership(chef.address);
		await tx.wait();

		// add nativeToken to reward pools with 50x multiplier and 0% deposit fee
		// since this is first pool pid will be '0'
		const addTokenTx = await chef.add(50, token.address, 0);
		await addTokenTx.wait();

		// add non-native token (e.g. LINK, USDC, etc.) to reward pool with 10x multiplier and 4% deposit fee
		// since this is the second pool it will be pid '1'
		const addPoolTx = await chef.add(10, poolToken.address, 400);
		await addPoolTx.wait();

		// mint non-native token for user
		const mintTx = await poolToken.mint(userAddr.address, 1_000);
		await mintTx.wait();
	});

	// Goose MasterChef works, again these tests are merely demonstrative
	it('adds a pool correctly', async function () {
		const poolLength = await chef.poolLength();
		expect(poolLength).to.equal(2);

		const poolInfo = await chef.poolInfo(1);
		expect(poolInfo.allocPoint).to.equal(50);
		expect(poolInfo.depositFeeBP).to.equal(400);
		expect(poolInfo.lpToken).to.equal(poolToken.address);
		console.log(poolInfo);
	});

	it('handles deposits and collects a fee', async function () {
		// this is the basic ERC20 token -> contract flow
		// first user approve chef spending user poolTokens
		const approveTx = await poolToken.connect(userAddr).approve(chef.address, 1_000);
		await approveTx.wait();

		// then the actual deposit is made via smart contract calling ERC20 token's transfer
		const depositTx = await chef.connect(userAddr).deposit(0, 1_000);
		await depositTx.wait();

		// "setting unlimited spending" is done via doing Math.pow(2, 256) - 1 which is the max for uint256
		// in Solidity it would be 2**256 - 1 or uint256(-1), overflows handles it

		// checks fee collected and sent to fee address
		const userPoolTokens = await chef.userInfo(1, userAddr.address);
		expect(userPoolTokens.amount).to.equal(960);
		const depositedFee = await poolToken.balanceOf(feeAddr.address);
		expect(depositedFee).to.equal(40);
	});
});
