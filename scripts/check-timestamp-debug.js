const hre = require("hardhat");

async function main() {
  const APP = "0xc0A11e570cb99e719A01b59Bd7Ec80d5bd25Bb5A";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  console.log('Current block:', currentBlock);
  
  // Query DebugTimestamp events
  const filter = app.filters.DebugTimestamp();
  const events = await app.queryFilter(filter, currentBlock - 100, currentBlock);
  
  console.log('DebugTimestamp events:', events.length);
  for (const e of events.slice(-5)) {
    console.log('\nEvent in block', e.blockNumber);
    console.log('  blockTime:', e.args[0].toString());
    console.log('  attestationTime:', e.args[1].toString());
    console.log('  maxAge:', e.args[2].toString());
    console.log('  expired:', e.args[3]);
  }
}

main().catch(console.error);
