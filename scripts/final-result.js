const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const APP = "0x68c75b005C651D829238938d61bB25D75Cc4643E";
  const taskId = "0x3647c19ede2028975260f9f350abb1ee41f1e8c41ff8b7d6b2fd948497241774";
  
  console.log('\n🔍 Final Result\n');
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Check processed
  const processed = await app.processedTasks(taskId);
  console.log('Processed:', processed);
  
  // Query ValidationCompleted events
  const filter = app.filters.ValidationCompleted(taskId);
  const events = await app.queryFilter(filter, -100);
  
  if (events.length > 0) {
    const event = events[events.length - 1];
    console.log('Score:', event.args.score.toString());
  }
  
  // Check registry
  const registry = await app.registry();
  const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const reg = Registry.attach(registry);
  
  try {
    const response = await reg.validationResponses(taskId);
    console.log('Registry Score:', response.score.toString());
  } catch (e) {}
}

main().catch(console.error);
