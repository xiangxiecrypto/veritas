const hre = require("hardhat");

async function main() {
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  const taskId = "0x0e298b35a65bb61bdbf791fb1399e4411ea173f6caac18f24f579610758d275b"; // from test-check0
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const pending = await app.getPendingValidation(taskId);
  console.log('Pending found:', pending.requester !== '0x0000000000000000000000000000000000000000');
  console.log('Rule ID:', pending.ruleId.toString());
  console.log('Check IDs:', pending.checkIds.map(c => c.toString()));
  console.log('Check count:', pending.checkIds.length);
  
  const rule = await app.rules(pending.ruleId);
  console.log('\nRule active:', rule.active);
  console.log('Rule URL:', rule.url);
  console.log('Rule dataKey:', rule.dataKey);
  
  if (pending.checkIds.length > 0) {
    const check = await app.checks(pending.ruleId, pending.checkIds[0]);
    console.log('\nCheck active:', check.active);
    console.log('Check score:', check.score.toString());
    console.log('Check contract:', check.checkContract);
  }
}

main().catch(console.error);
