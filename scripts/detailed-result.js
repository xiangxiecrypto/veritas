const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const APP = "0x68c75b005C651D829238938d61bB25D75Cc4643E";
  const taskId = "0x3647c19ede2028975260f9f350abb1ee41f1e8c41ff8b7d6b2fd948497241774";
  const submitTxHash = "0xbe9e50fefb24d8027539974510f8923f9308d982aa3b2347cdc50bd60ac395f5";
  
  console.log('\n🔍 Complete Test Result\n');
  console.log('='.repeat(70));
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Get transaction receipt
  const receipt = await ethers.provider.getTransactionReceipt(submitTxHash);
  console.log('Block:', receipt.blockNumber);
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('Status:', receipt.status === 1 ? 'Success' : 'Failed');
  
  // Get all events from the last 20 blocks
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log('\nQuerying events from block', currentBlock - 20, 'to', currentBlock);
  
  const filter = app.filters.ValidationCompleted(taskId);
  const events = await app.queryFilter(filter, currentBlock - 20, currentBlock);
  
  console.log('\nValidationCompleted events found:', events.length);
  
  for (const event of events) {
    console.log('\n  Task ID:', event.args.taskId);
    console.log('  Score:', event.args.score.toString());
    console.log('  Block:', event.blockNumber);
  }
  
  // Also check for CheckPassed events
  const checkFilter = app.filters.CheckPassed();
  const checkEvents = await app.queryFilter(checkFilter, currentBlock - 20, currentBlock);
  
  console.log('\nCheckPassed events found:', checkEvents.length);
  for (const event of checkEvents) {
    console.log('\n  Rule:', event.args.ruleId.toString());
    console.log('  Check:', event.args.checkId.toString());
    console.log('  Score:', event.args.score.toString());
  }
  
  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
