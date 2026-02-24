const hre = require("hardhat");

const REGISTRY = "0xAeFdE0707014b6540128d3835126b53F073fEd40";
const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
const REPUTATION_REGISTRY = "0x69ad39222bf7fc5e6A90D009E4A722cF44F93FC2";

async function main() {
  const [wallet] = await ethers.getSigners();
  const gasPrice = await ethers.provider.getGasPrice();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('DEPLOYING PrimusVeritasApp (FIXED giveFeedback)');
  console.log('═══════════════════════════════════════════════════════');
  
  const PrimusVeritasApp = await hre.ethers.getContractFactory("PrimusVeritasApp");
  
  const app = await PrimusVeritasApp.deploy(
    REGISTRY,
    PRIMUS_TASK,
    REPUTATION_REGISTRY,
    {
      gasPrice: gasPrice.mul(3),
      gasLimit: 3000000
    }
  );
  
  await app.deployed();
  
  console.log('\n✅ Deployed!');
  console.log('   Address:', app.address);
  
  console.log('\n📋 Now run test-final.js with new APP address:', app.address);
}

main().catch(console.error);
