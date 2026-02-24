const hre = require("hardhat");

async function main() {
  const APP = "0xc0A11e570cb99e719A01b59Bd7Ec80d5bd25Bb5A";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  
  // Check DebugTimestamp events
  const timestamps = await app.queryFilter(app.filters.DebugTimestamp(), currentBlock - 50, currentBlock);
  console.log('DebugTimestamp events:', timestamps.length);
  for (const t of timestamps.slice(-3)) {
    console.log('\nLast event:');
    console.log('  blockTime:', t.args[0].toString());
    console.log('  attestationTime:', t.args[1].toString());
    console.log('  maxAge:', t.args[2].toString());
    console.log('  expired:', t.args[3]);
  }
  
  // Check DebugScore events
  const scores = await app.queryFilter(app.filters.DebugScore(), currentBlock - 50, currentBlock);
  console.log('\nDebugScore events:', scores.length);
  for (const s of scores.slice(-3)) {
    console.log('  totalScore:', s.args[0].toString());
    console.log('  maxScore:', s.args[1].toString());
    console.log('  response:', s.args[2].toString());
  }
  
  // Check ValidationCompleted events
  const completed = await app.queryFilter(app.filters.ValidationCompleted(), currentBlock - 50, currentBlock);
  console.log('\nValidationCompleted events:', completed.length);
  for (const c of completed.slice(-3)) {
    console.log('  taskId:', c.args.taskId);
    console.log('  score:', c.args.score.toString());
  }
}

main().catch(console.error);
