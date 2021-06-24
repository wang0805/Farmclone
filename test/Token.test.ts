import { BigNumber } from '@ethersproject/bignumber';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Token } from '../types/Token';

describe('Token', function () {
	let token: Token;
	let owner: SignerWithAddress;
	let addrOne: SignerWithAddress;

	beforeEach(async function () {
		[owner, addrOne] = await ethers.getSigners();
		const factory = await ethers.getContractFactory('Token');
		token = (await factory.deploy()) as Token;
	});

	// these tests aren't necessary, just for demonstrative purposes
	describe('inheritance tests', function () {
		it('has the right name and symbol', async function () {
			expect(await token.name()).to.equal('Test Token');
			expect(await token.symbol()).to.equal('TT');
		});

		it('it restricts access to onlyOwner functions', async function () {
			await expect(token.connect(addrOne).burn(1_000)).to.be.revertedWith(
				'Ownable: caller is not the owner',
			);
		});
	});

	it('mints 1,000,000 tokens to the owner of the contract', async function () {
		const balance = await token.balanceOf(owner.address);
		expect(balance).to.equal(BigNumber.from(1_000_000));
	});

	it('transfers tokens', async function () {
		const addrOneStart = await token.balanceOf(addrOne.address);
		expect(addrOneStart).to.equal(0);

		const transferTx = await token.transfer(addrOne.address, BigNumber.from(1_000));
		await transferTx.wait();

		const addrOneEnd = await token.balanceOf(addrOne.address);
		expect(addrOneEnd).to.equal(BigNumber.from(1_000));

		const ownerBalance = await token.balanceOf(owner.address);
		expect(ownerBalance).to.equal(BigNumber.from(999_000));
	});

	it('allows owner to mint tokens', async function () {
		const mintTx = await token.mint(addrOne.address, BigNumber.from(1_000));
		await mintTx.wait();

		const balance = await token.balanceOf(addrOne.address);
		expect(balance).to.equal(BigNumber.from(1_000));

		const supply = await token.totalSupply();
		expect(supply).to.equal(BigNumber.from(1_001_000));
	});

	it('allows owner to burn tokens', async function () {
		const burnTx = await token.burn(1_000);
		expect(burnTx).to.emit(token, 'TokenBurnt').withArgs(1_000);
		await burnTx.wait();
		const supply = await token.totalSupply();
		expect(supply).to.equal(BigNumber.from(999_000));
	});
});
