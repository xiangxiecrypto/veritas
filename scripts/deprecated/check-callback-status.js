// Check callback status on deployed V5 contract
const hre = require("hardhat");
const { ethers } = hre;

const APP_V5 = '0xFe18A380bE251006997553A277122390Bac850ef';
const TASK_ID = '0x529667f0203481942c253b0dde52a1e783a8393776352849eec64ecb64b5328e';

async function main() {
  console.log('\nChecking PrimusVeritasAppV5 callback status...\n');
  console.log('Contract:', APP_V5);
  console.log('Task ID:', TASK_ID);
  console.log('Explorer:', `https://sepolia.basescan.org/address/${APP_V5}`);
  console.log('');

  const appV5 = await ethers.getContractAt("PrimusVeritasAppV5", APP_V5);

  // Check callback attempts
  const count = await appV5.callbackAttemptCount();
  console.log('Callback attempts:', count.toString());

  if (count.gt(0)) {
    console.log('\n=== Callback Details ===');
    for (let i = 0; i < Math.min(count.toNumber(), 5); i++) {
      const attempt = await appV5.getCallbackAttempt(i);
      console.log(`\n[${i}]`);
      console.log('  Caller:', attempt.caller);
      console.log('  Task ID:', attempt.taskId);
      console.log('  Attestor:', attempt.attestor);
      console.log('  Success:', attempt.success);
      console.log('  Block Time:', new Date(attempt.blockTime.toNumber() * 1000).toISOString());
    }
  }

  // Check if specific task was processed
  const processed = await appV5.processedTasks(TASK_ID);
  console.log('\nTask processed:', processed);

  // Check pending validation
  const pending = await appV5.getPendingValidation(TASK_ID);
  console.log('Pending validation:');
  console.log('  Rule ID:', pending.ruleId.toString());
  console.log('  Agent ID:', pending.agentId.toString());
  console.log('  Requester:', pending.requester);

  // Check rule
  const rule = await appV5.rules(0);
  console.log('\nRule 0:');
  console.log('  Template:', rule.templateId);
  console.log('  Data Key:', rule.dataKey);
  console.log('  Active:', rule.active);

  console.log('\n=== Summary ===');
  if (count.gt(0)) {
    console.log('✅ Callback received from Primus!');
    if (processed) {
      console.log('✅ Task processed successfully!');
    } else {
      console.log('⚠️ Callback received but task not marked as processed');
    }
  } else {
    console.log('⏳ No callback received yet. Primus may still be processing.');
    console.log('   Check again in a few minutes.');
  }
}

main().catch(console.error);
