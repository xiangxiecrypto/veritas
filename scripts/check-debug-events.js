const hre = require("hardhat");

async function main() {
  const APP = "0xc0A11e570cb99e719A01b59Bd7Ec80d5bd25Bb5A";
  const taskId = "0x83354de5100da775c1e78e0e6262202f396386758242cdee1baa419705fe0c75";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  
  // Check all debug events
  const debugStartFilter = app.filters.DebugStart(taskId);
  const debugStart = await app.queryFilter(debugStartFilter, currentBlock - 50, currentBlock);
  console.log('DebugStart:', debugStart.length);
  
  const debugTimestampFilter = app.filters.DebugTimestamp();
  const timestamps = await app.queryFilter(debugTimestampFilter, currentBlock - 50, currentBlock);
  console.log('DebugTimestamp:', timestamps.length);
  for (const t of timestamps) {
    console.log('  blockTime:', t.args[0].toString());
    console.log('  attestationTime:', t.args[1].toString());
    console.log('  maxAge:', t.args[2].toString());
    console.log('  expired:', t.args[3]);
    console.log('  ---');
  }
  
  const debugScoreFilter = app.filters.DebugScore();
  const scores = await app.queryFilter(debugScoreFilter, currentBlock - 50, currentBlock);
  console.log('DebugScore:', scores.length);
  for (const s of scores) {
    console.log('  totalScore:', s.args[0].toString());
    console.log('  maxScore:', s.args[1].toString());
    console.log('  response:', s.args[2].toString());
  }
}

main().catch(console.error);
