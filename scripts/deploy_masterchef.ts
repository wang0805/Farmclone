import { ethers } from 'hardhat';
import { start } from 'repl';

async function main() {
	const [deployer] = await ethers.getSigners();

    console.log('Deploying from account:', deployer.address);
    
    // let token = "0x877474298CaF38Db78A282562479ceaD67c644Db"
    let token = '0x1e274493be80fE9a5fF4C3C7e246A1E12555593A'
    let dev_add = deployer.address
    let feeAddress = deployer.address
    let startBlock = 20010000
    // let kovanDai = '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa'
    // let kovanLink = '0xa36085f69e2889c224210f603d836748e7dc0088'

	const masterchefFactory = await ethers.getContractFactory('MasterChef');
    const masterchef = await masterchefFactory.deploy(token, dev_add, feeAddress, startBlock);
    console.log(`masterchef address: ${masterchef.address}`)
    await masterchef.add(10, token, 400)
        .then(() => {
            console.log("success");
       
        })
    await masterchef.poolLength()
        .then((result: number) => { console.log(ethers.BigNumber.from(result)); console.log(result.toString()) })
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});


// masterchef address: 0x07150f1e9DC360486e142B42b472d8Be0578B811
// kovan masterchef address: 0xE83cA1905AC6572FfB613A7D49d4550c422c2302