import '@typechain/hardhat';
import '@nomiclabs/hardhat-waffle';
import dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/types';
import { task } from 'hardhat/config';

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (_args, hre) => {
	const accounts = await hre.ethers.getSigners();

	accounts.forEach(({ address }) => console.log(address));
});

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
			// dah! India!
			url: process.env.MUMBAI_INFURA_URL,
			accounts: [`0x${process.env.MUMBAI_PRIVATE_KEY}`],
		},
	},
};

export default config;
