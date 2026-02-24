const hre = require("hardhat");

async function main() {
  const APP = "0xc0A11e570cb99e719A01b59Bd7Ec80d5bd25Bb5A";
  const taskId = "0x83354de5100da775c1e78e0e6262202f396386758242cdee1baa419705fe0c75";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const processed = await app.processedTasks(taskId);
  console.log('Processed:', processed);
  
  // Query events
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const filter = app.filters.ValidationCompleted(taskId);
  const events = await app.queryFilter(filter, currentBlock - 50, currentBlock);
  
  console.log('ValidationCompleted events:', events.length);
  for (const e of events) {
    console.log('  Score:', e.args.score.toString());
  }
}

main().catch(console.error);
