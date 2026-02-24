const hre = require("hardhat");

async function main() {
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  const taskId = "0x0e298b35a65bb61bdbf791fb1399e4411ea173f6caac18f24f579610758d275b";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  
  // Query CheckPassed events
  const passedFilter = app.filters.CheckPassed();
  const passedEvents = await app.queryFilter(passedFilter, currentBlock - 100, currentBlock);
  console.log('CheckPassed events:', passedEvents.length);
  
  // Query CheckFailed events  
  const failedFilter = app.filters.CheckFailed();
  const failedEvents = await app.queryFilter(failedFilter, currentBlock - 100, currentBlock);
  console.log('CheckFailed events:', failedEvents.length);
  
  // Query ValidationCompleted events
  const completedFilter = app.filters.ValidationCompleted();
  const completedEvents = await app.queryFilter(completedFilter, currentBlock - 100, currentBlock);
  console.log('ValidationCompleted events:', completedEvents.length);
  
  for (const e of completedEvents.slice(-3)) {
    console.log('\nValidationCompleted:');
    console.log('  Task ID:', e.args.taskId);
    console.log('  Score:', e.args.score.toString());
    console.log('  Block:', e.blockNumber);
  }
}

main().catch(console.error);
