import '@typechain/hardhat';
import '@nomiclabs/hardhat-waffle';
import dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/types';
import { task } from 'hardhat/config';
// import { Ownable } from './types/Ownable';

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (_args, hre) => {
	const accounts = await hre.ethers.getSigners();

	accounts.forEach(({ address }) => console.log(address));
});

// just an example of how to interact with an existing contract
// task('owner', "get contract's owner")
// 	.addParam('address', 'contract address')
// 	.setAction(async ({ address }, hre) => {
// 		const ownableFactory = await hre.ethers.getContractAt('Ownable', address);
// 		const ownable = ownableFactory.attach(address) as Ownable;

// 		const owner = await ownable.owner();
// 		console.log('Owner:', owner.toString());
// 	});

// Go to https://hardhat.org/config/ to learn more
const config: HardhatUserConfig = {
	solidity: '0.8.4',
	typechain: {
		outDir: 'types',
		target: 'ethers-v5',
		alwaysGenerateOverloads: false,
	},
	networks: {
		mumbai: {
			url: process.env.MUMBAI_INFURA_URL,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
		kovan: {
			url: process.env.KOVAN_INFURA_URL,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
	},
};

export default config;

//npx hardhat run scripts/deploy.ts --network mumbai
