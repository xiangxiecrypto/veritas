const hre = require("hardhat");

async function main() {
  const APP = "0x633A3d8c9Bdf6a1a73D8bDcc0c11a232F1a601fE";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Query recent ValidationCompleted events
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const filter = app.filters.ValidationCompleted();
  const events = await app.queryFilter(filter, currentBlock - 10, currentBlock);
  
  console.log('ValidationCompleted events:', events.length);
  for (const e of events) {
    console.log('  Task:', e.args.taskId);
    console.log('  Score:', e.args.score.toString());
  }
  
  // Check debug events
  const debugFilter = app.filters.DebugTimestamp();
  const debugEvents = await app.queryFilter(debugFilter, currentBlock - 10, currentBlock);
  console.log('\nDebugTimestamp events:', debugEvents.length);
  for (const e of debugEvents) {
    console.log('  blockTime:', e.args[0].toString());
    console.log('  attestationTime:', e.args[1].toString());
    console.log('  expired:', e.args[3]);
  }
}

main().catch(console.error);
