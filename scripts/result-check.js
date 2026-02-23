const hre = require("hardhat");

async function main() {
  const APP = "0x68c75b005C651D829238938d61bB25D75Cc4643E";
  const taskId = "0x3647c19ede2028975260f9f350abb1ee41f1e8c41ff8b7d6b2fd948497241774";
  const submitTxHash = "0xbe9e50fefb24d8027539974510f8923f9308d982aa3b2347cdc50bd60ac395f5";
  
  console.log('\n🔍 Result Check\n');
  console.log('='.repeat(70));
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const receipt = await hre.ethers.provider.getTransactionReceipt(submitTxHash);
  console.log('Submit Tx Block:', receipt.blockNumber);
  
  // Check from block where tx happened
  const filter = app.filters.ValidationCompleted(taskId);
  const events = await app.queryFilter(filter, receipt.blockNumber - 5, receipt.blockNumber + 5);
  
  console.log('ValidationCompleted events:', events.length);
  
  if (events.length > 0) {
    const event = events[0];
    console.log('✅ Score:', event.args.score.toString());
  } else {
    // Check if task was processed
    const processed = await app.processedTasks(taskId);
    console.log('Processed:', processed);
    
    // Check pending
    const pending = await app.getPendingValidation(taskId);
    console.log('Requester:', pending.requester);
  }
  
  console.log('='.repeat(70));
}

main().catch(console.error);
