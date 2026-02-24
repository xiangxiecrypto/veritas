const hre = require("hardhat");

const REGISTRY = "0xAeFdE0707014b6540128d3835126b53F073fEd40";
const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";

async function main() {
  const [wallet] = await ethers.getSigners();
  console.log('═══════════════════════════════════════════════════════');
  console.log('DEPLOYING PrimusVeritasAppV2');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Deployer:', wallet.address);
  console.log('');
  
  const gasPrice = await ethers.provider.getGasPrice();
  
  console.log('Constructor Parameters:');
  console.log('  Registry:', REGISTRY);
  console.log('  Primus Task:', PRIMUS_TASK);
  console.log('');
  
  const PrimusVeritasAppV2 = await hre.ethers.getContractFactory("PrimusVeritasAppV2");
  
  console.log('📝 Deploying...');
  const app = await PrimusVeritasAppV2.deploy(
    REGISTRY,
    PRIMUS_TASK,
    {
      gasPrice: gasPrice.mul(3),
      gasLimit: 3000000
    }
  );
  
  await app.deployed();
  
  console.log('\n✅ Deployed!');
  console.log('   Address:', app.address);
  console.log('   Tx Hash:', app.deployTransaction.hash);
  console.log('   Gas Used:', (await app.deployTransaction.wait()).gasUsed.toString());
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ DEPLOYMENT COMPLETE!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📋 Summary:');
  console.log('   Contract: PrimusVeritasAppV2');
  console.log('   Address:', app.address);
  console.log('   Network: Base Sepolia');
  console.log('   Explorer: https://sepolia.basescan.org/address/' + app.address);
}

main().catch(console.error);
