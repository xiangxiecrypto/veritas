const hre = require("hardhat");

async function main() {
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  const NEW_CHECK = "0xf9c78D8CD1be8f4af97aD662147d79a9BB994b88";
  
  const [signer] = await hre.ethers.getSigners();
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const gasPrice = await hre.ethers.provider.getGasPrice();
  
  // Check if there's an update function
  console.log('Updating check 0 for rule 1...');
  
  // Try to add new check (will be check 1)
  const checkTx = await app.addCheck(1, NEW_CHECK, "0x", 90, {
    gasPrice: gasPrice.mul(3)
  });
  await checkTx.wait();
  
  console.log('Added new check. Checking count...');
  const count = await app.checkCount(1);
  console.log('Check count:', count.toString());
  
  // Verify
  const check = await app.checks(1, 1);
  console.log('New check contract:', check.checkContract);
  console.log('Score:', check.score.toString());
}

main().catch(console.error);
