const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const APP = "0x633A3d8c9Bdf6a1a73D8b0e3302B7E1d5FaaC";
  const taskId = "0x8644512523c96ccccb362c89affb92229cbf15b7112a2f0c34bf6d85a9905053ffd1717a2";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Query for ValidationCompleted event
  const filter = app.filters.ValidationCompleted(taskId);
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const events = await app.queryFilter(filter, currentBlock - 10, currentBlock);
  
  console.log(`Found ${events.length} ValidationCompleted events`);
  for (const event of events) {
    console.log(`  Score: ${event.args.score.toString()}`);
  }
}

main().catch(console.error);
