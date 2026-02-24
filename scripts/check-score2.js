const hre = require("hardhat");

async function main() {
  const APP = "0x8a6ebC841b5CDA5b630d1F7BA9216Aa2bcb253EF";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Query DebugScore event from latest test
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const filter = app.filters.DebugScore();
  const events = await app.queryFilter(filter, currentBlock - 500, currentBlock);
  
  console.log('=== DebugScore Events ===');
  for (const e of events.slice(-5)) {
    console.log('Block:', e.blockNumber);
    console.log('totalScore:', e.args[0].toString());
    console.log('maxScore:', e.args[1].toString());
    console.log('response:', e.args[2]);
    console.log('---');
  }
}

main().catch(console.error);
