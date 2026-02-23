const hre = require("hardhat");

async function main() {
  const submitTx = "0xaa8656a2820b42d43193f96c4768d1b37085480295682e7ac2d9f7f5eb217f51";
  const taskId = "0x105be136a7e61b166beb563dd86f22ac5d9fadca5680d12b29d2bfc8c44b9702";
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  
  console.log('\n🔍 Debugging\n');
  console.log('='.repeat(70));
  
  const receipt = await hre.ethers.provider.getTransactionReceipt(submitTx);
  console.log('Status:', receipt.status);
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('Logs:', receipt.logs.length);
  
  // Check processed
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const processed = await app.processedTasks(taskId);
  console.log('Processed:', processed);
  
  // Get pending
  const pending = await app.getPendingValidation(taskId);
  console.log('Rule ID:', pending.ruleId.toString());
  console.log('Check IDs:', pending.checkIds.map(c => c.toString()));
  
  console.log('='.repeat(70));
}

main().catch(console.error);
