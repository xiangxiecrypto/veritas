const hre = require("hardhat");

async function main() {
  const APP = "0x633A3d8c9Bdf6a1a73D8bDcc0c11a232F1a601fE";
  const taskId = "0xfff78e02129fdfa1fd179e1c656e37dd6a824d44539dc4d2615e1914ffcc4712";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const processed = await app.processedTasks(taskId);
  console.log('Processed:', processed);
  
  const rule = await app.rules(0);
  console.log('\nRule 0:');
  console.log('  Active:', rule.active);
  console.log('  URL:', rule.url);
  console.log('  dataKey:', rule.dataKey);
  console.log('  parsePath:', rule.parsePath);
  
  const check = await app.checks(0, 0);
  console.log('\nCheck 0:');
  console.log('  Active:', check.active);
  console.log('  Score:', check.score.toString());
  console.log('  Contract:', check.checkContract);
}

main().catch(console.error);
