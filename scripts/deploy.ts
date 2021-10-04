import { ethers } from 'hardhat';

async function main() {
	const [deployer] = await ethers.getSigners();

	console.log('Deploying from account:', deployer.address);

	const balance = await deployer.getBalance();

	console.log('Account balance:', balance.toString());

	const tokenFactory = await ethers.getContractFactory('Token');
	const token = await tokenFactory.deploy();

	console.log('Token address:', token.address);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});


// Mumbai Token address: 0x877474298CaF38Db78A282562479ceaD67c644Db
// Kovan Token address: 0x1e274493be80fE9a5fF4C3C7e246A1E12555593A