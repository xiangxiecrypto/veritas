const hre = require("hardhat");

async function main() {
  const APP = "0x633A3d8c9Bdf6a1a73D8bDcc0c11a232F1a601fE";
  const taskId = "0x6b1569a49a1e6e60508fb9538547882cb6f54fc85dd79691d2040e2ff6084e05";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const processed = await app.processedTasks(taskId);
  console.log('Processed:', processed);
  
  const check = await app.checks(0, 0);
  console.log('Check 0 contract:', check.checkContract);
  
  // Check events in last 10 blocks
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const filter = app.filters.ValidationCompleted();
  const events = await app.queryFilter(filter, currentBlock - 10, currentBlock);
  console.log('ValidationCompleted events:', events.length);
  for (const e of events) {
    console.log('  Score:', e.args.score.toString());
  }
}

main().catch(console.error);
