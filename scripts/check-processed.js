const hre = require("hardhat");

async function main() {
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  const taskId = "0x39c9731959ba7f54d76af4c1de1b17fa0c9e6e30adca601bb4c902ef8ffd30fa";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const processed = await app.processedTasks(taskId);
  console.log('Processed:', processed);
  
  const pending = await app.getPendingValidation(taskId);
  console.log('Rule ID:', pending.ruleId.toString());
  console.log('Check IDs:', pending.checkIds.map(c => c.toString()));
}

main().catch(console.error);
