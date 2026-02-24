const hre = require("hardhat");

async function main() {
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  const taskId = "0xd20686ce775aaf73585ba5402233e87cf2ce001b5b5f8802a5f1795f948f2e0d";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const pending = await app.getPendingValidation(taskId);
  console.log('Rule ID:', pending.ruleId.toString());
  console.log('Check IDs:', pending.checkIds.map(c => c.toString()));
  console.log('Requester:', pending.requester);
}

main().catch(console.error);
