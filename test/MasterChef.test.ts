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

		// mint poolToken for user
		const mintTx = await poolToken.mint(userAddr.address, 1_000);
		await mintTx.wait();

		// add poolToken to reward pools with 4% deposit fee, this will be pid 0
		const addTx = await chef.add(50, poolToken.address, 400);
		await addTx.wait();
	});

	it('adds a pool correctly', async function () {
		const poolLength = await chef.poolLength();
		expect(poolLength).to.equal(1);
	});

	// Goose MasterChef has been established to work at this point, these tests are merely demonstrative
	it('handles deposits and collects a fee', async function () {
		// user approve chef spending user poolTokens
		const approveTx = await poolToken.connect(userAddr).approve(chef.address, 1_000);
		await approveTx.wait();

		const depositTx = await chef.connect(userAddr).deposit(0, 1_000);
		await depositTx.wait();

		const userPoolTokens = await chef.userInfo(0, userAddr.address);
		expect(userPoolTokens.amount).to.equal(960);

		// fee collected and sent to fee address
		const depositedFee = await poolToken.balanceOf(feeAddr.address);
		expect(depositedFee).to.equal(40);
	});
});
