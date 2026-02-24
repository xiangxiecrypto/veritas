const hre = require("hardhat");

async function main() {
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  const taskId = "0x47bffef0a5beb4921057b6f39976eb8e56a3f0c34bf6d85a9905053ffd1717a2";
  const submitTx = "0x349cbd17afc98cb384d8da855c4b35db31b1f7d004f46a49316d6e3ac4c55f8e";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const processed = await app.processedTasks(taskId);
  console.log('Processed:', processed);
  
  const receipt = await hre.ethers.provider.getTransactionReceipt(submitTx);
  console.log('Status:', receipt.status);
  console.log('Gas:', receipt.gasUsed.toString());
  console.log('Logs:', receipt.logs.length);
  
  // Check rule
  const rule = await app.rules(1);
  console.log('\nRule 1:');
  console.log('  URL:', rule.url);
  console.log('  dataKey:', rule.dataKey);
  console.log('  parsePath:', rule.parsePath);
  console.log('  Active:', rule.active);
  
  // Check check
  const check = await app.checks(1, 0);
  console.log('\nCheck 0:');
  console.log('  Contract:', check.checkContract);
  console.log('  Score:', check.score.toString());
  console.log('  Active:', check.active);
}

main().catch(console.error);
