const hre = require("hardhat");

async function main() {
  const APP = "0x8a6ebC841b5CDA5b630d1F7BA9216Aa2bcb253EF";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Check rule 0
  const rule = await app.rules(0);
  console.log('=== Rule 0 ===');
  console.log('URL:', rule.url);
  console.log('dataKey:', rule.dataKey);
  console.log('Active:', rule.active);
  
  // Check check 0 for rule 0
  const checkCount = await app.getCheckCount(0);
  console.log('\n=== Checks for Rule 0 ===');
  console.log('Check count:', checkCount.toString());
  
  for (let i = 0; i < checkCount; i++) {
    const check = await app.getCheck(0, i);
    console.log(`\nCheck ${i}:`);
    console.log('  Contract:', check.checkContract);
    console.log('  Score:', check.score.toString());
    console.log('  Active:', check.active);
  }
  
  // Query DebugScore event from latest test
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const filter = app.filters.DebugScore();
  const events = await app.queryFilter(filter, currentBlock - 200, currentBlock);
  
  console.log('\n=== Latest DebugScore Events ===');
  for (const e of events.slice(-3)) {
    console.log('totalScore:', e.args[0].toString());
    console.log('maxScore:', e.args[1].toString());
    console.log('response:', e.args[2]);
    console.log('---');
  }
  
  // Query ValidationCompleted events
  const completedFilter = app.filters.ValidationCompleted();
  const completedEvents = await app.queryFilter(completedFilter, currentBlock - 200, currentBlock);
  
  console.log('\n=== Latest ValidationCompleted ===');
  for (const e of completedEvents.slice(-3)) {
    console.log('taskId:', e.args.taskId);
    console.log('score:', e.args.score.toString());
  }
}

main().catch(console.error);
