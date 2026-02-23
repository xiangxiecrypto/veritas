const hre = require("hardhat");

async function main() {
  const APP = "0xecD605f0B4167210532Ff9860595E7ce3Acc8f86";
  const TASK_ID = "0x7fb4293f1a8a6d8055e60bc90e5a1f0b7d7c1d344ad4aa60149b3d7f375b0b07";
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('\n🔍 Checking Callback Status\n');
  console.log('='.repeat(70));
  console.log('App:', APP);
  console.log('Task ID:', TASK_ID);
  console.log('');
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Check callback attempts
  const attemptCount = await app.callbackAttemptCount();
  console.log('Callback Attempts:', attemptCount.toString());
  console.log('');
  
  if (attemptCount.gt(0)) {
    console.log('📋 Callback Details:');
    console.log('─'.repeat(70));
    
    for (let i = 0; i < attemptCount; i++) {
      const attempt = await app.getCallbackAttempt(i);
      console.log(`Attempt ${i}:`);
      console.log('  Task ID:', attempt.taskId);
      console.log('  Caller:', attempt.caller);
      console.log('  Data:', attempt.data.substring(0, 100) + '...');
      console.log('  Success:', attempt.success);
      console.log('  Block Time:', new Date(attempt.blockTime * 1000).toISOString());
      console.log('');
    }
  }
  
  // Check if task was processed
  const processed = await app.processedTasks(TASK_ID);
  console.log('Task Processed:', processed);
  
  if (processed) {
    console.log('✅✅✅ VALIDATION COMPLETE! ✅✅✅');
    
    // Try to get the result
    const filter = app.filters.ValidationCompleted(TASK_ID);
    const events = await app.queryFilter(filter);
    
    if (events.length > 0) {
      console.log('\n📊 Validation Result:');
      console.log('  Score:', events[0].args.score.toString(), '/ 100');
    }
  } else {
    console.log('⏳ Still waiting for callback...');
  }
  
  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
