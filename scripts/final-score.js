const hre = require("hardhat");

async function main() {
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  const REGISTRY = "0xAeFdE0707014b6540128d3835126b53F073fEd40";
  const taskId = "0x105be136a7e61b166beb563dd86f22ac5d9fadca5680d12b29d2bfc8c44b9702";
  const submitTx = "0xaa8656a2820b42d43193f96c4768d1b37085480295682e7ac2d9f7f5eb217f51";
  
  console.log('\n🎯 FINAL RESULT\n');
  console.log('='.repeat(70));
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Check events from transaction
  const receipt = await hre.ethers.provider.getTransactionReceipt(submitTx);
  console.log('Block:', receipt.blockNumber);
  
  // Query ValidationCompleted events
  const filter = app.filters.ValidationCompleted(taskId);
  const events = await app.queryFilter(filter, receipt.blockNumber - 5, receipt.blockNumber + 5);
  
  if (events.length > 0) {
    console.log('\n✅ ValidationCompleted Event:');
    console.log('  Task ID:', events[0].args.taskId);
    console.log('  Score:', events[0].args.score.toString());
  }
  
  // Check CheckPassed events
  const checkFilter = app.filters.CheckPassed();
  const checkEvents = await app.queryFilter(checkFilter, receipt.blockNumber - 5, receipt.blockNumber + 5);
  
  console.log('\n✅ CheckPassed Events:', checkEvents.length);
  for (const e of checkEvents) {
    console.log('  Rule:', e.args.ruleId.toString(), '| Check:', e.args.checkId.toString(), '| Score:', e.args.score.toString());
  }
  
  // Check registry
  const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const reg = Registry.attach(REGISTRY);
  
  const regFilter = reg.filters.ValidationResponse();
  const regEvents = await reg.queryFilter(regFilter, receipt.blockNumber - 5, receipt.blockNumber + 5);
  
  for (const e of regEvents) {
    if (e.args.requestHash.toLowerCase() === taskId.toLowerCase()) {
      console.log('\n✅ Registry Entry:');
      console.log('  Score:', e.args.response.toString());
      break;
    }
  }
  
  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
