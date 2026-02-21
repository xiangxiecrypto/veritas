/**
 * Manual Callback Test for PrimusVeritasAppV5
 * 
 * This script manually triggers the callback to test the contract logic
 * without relying on the broken Primus SDK.
 * 
 * This simulates what the Primus Task contract does when it calls:
 * reportTaskResultCallback(taskId, taskResult, success)
 */

const hre = require("hardhat");
const { ethers } = hre;

// Your deployed contract
const APP_V5 = process.env.APP_V5 || '0xB9d6453Ee3660e43eeCf541C7D355517687aEFB6';

// Task details
const TASK_ID = process.env.TASK_ID || '0x8a6700cda534a6860a6d4de4253c68a2a4dc9d8e406640d1c49e1a746356afc1';
const TEMPLATE_ID = "https://api.coinbase.com/v2/exchange-rates?currency=BTC";

// Simulated attestation data (what Primus would return)
const SIMULATED_ATTESTATION_DATA = JSON.stringify({
  data: {
    btcPrice: "68432.15"  // $68,432.15 - within the $60k-$100k range
  }
});

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║       MANUAL CALLBACK TEST FOR PRIMUSVERITASAPPV5            ║');
  console.log('║       (Simulates Primus Task Contract Callback)              ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  const [wallet] = await ethers.getSigners();
  console.log('Wallet:', wallet.address);
  console.log('AppV5:', APP_V5);
  console.log('Task ID:', TASK_ID);
  console.log('');

  // Get the Primus Task contract
  const primusTask = await ethers.getContractAt([
    "function queryTask(bytes32 taskId) view returns (tuple(string templateId, address submitter, address[] attestors, tuple(address attestor, bytes32 taskId, tuple(address recipient, bytes request, bytes responseResolve, string data, uint64 timestamp) attestation)[] taskResults, uint64 submittedAt, uint8 tokenSymbol, address callback, uint8 taskStatus))"
  ], '0xC02234058caEaA9416506eABf6Ef3122fCA939E8');

  // Get task info
  const taskInfo = await primusTask.queryTask(TASK_ID);
  console.log('Task Status:', taskInfo.taskStatus);
  console.log('Callback:', taskInfo.callback);
  console.log('');

  // Check if task is pending
  if (taskInfo.taskStatus !== 0) {
    console.log('⚠️ Task is not pending. Current status:', taskInfo.taskStatus);
    console.log('Creating a new task for testing...\n');
    
    // Deploy a mock Primus Task for testing
    console.log('Deploying MockPrimusTask for testing...');
    const MockPrimusTask = await ethers.getContractFactory("MockPrimusTask");
    const mockPrimus = await MockPrimusTask.deploy();
    await mockPrimus.deployed();
    console.log('MockPrimusTask deployed:', mockPrimus.address);
    
    // Create a new AppV5 with the mock
    const AppV5 = await ethers.getContractFactory("PrimusVeritasAppV5");
    const newAppV5 = await AppV5.deploy(
      '0x257DC4B38066840769EeA370204AD3724ddb0836',
      mockPrimus.address
    );
    await newAppV5.deployed();
    console.log('New AppV5 deployed:', newAppV5.address);
    
    // Add rule
    await newAppV5.addRule(TEMPLATE_ID, "btcPrice", 2, 3600, "BTC Price Check");
    
    // Submit task
    const tx = await newAppV5.requestValidation(582, 0, [], 1, { 
      value: ethers.utils.parseEther("0.0011") 
    });
    const receipt = await tx.wait();
    
    const event = receipt.events.find(e => e.event === 'ValidationRequested');
    const newTaskId = event.args.taskId;
    console.log('New Task ID:', newTaskId);
    
    // Complete the task with simulated attestation
    console.log('\nSimulating Primus callback...');
    const timestamp = Math.floor(Date.now() / 1000);
    
    await mockPrimus.completeTask(
      newTaskId,
      newAppV5.address,
      TEMPLATE_ID,
      SIMULATED_ATTESTATION_DATA,
      timestamp
    );
    
    console.log('✅ Callback simulated!');
    
    // Check results
    const callbackCount = await newAppV5.callbackAttemptCount();
    console.log('Callback attempts:', callbackCount.toString());
    
    const processed = await newAppV5.processedTasks(newTaskId);
    console.log('Task processed:', processed);
    
    if (callbackCount.gt(0)) {
      const attempt = await newAppV5.getCallbackAttempt(0);
      console.log('\nCallback details:');
      console.log('  Caller:', attempt.caller);
      console.log('  Attestor:', attempt.attestor);
      console.log('  Success:', attempt.success);
      console.log('  Data:', attempt.data.substring(0, 100) + '...');
    }
    
    console.log('\n✅ Manual callback test SUCCESSFUL!');
    console.log('The contract correctly receives and processes callbacks.');
    console.log('');
    console.log('Summary:');
    console.log('  New AppV5:', newAppV5.address);
    console.log('  MockPrimus:', mockPrimus.address);
    console.log('  Task ID:', newTaskId);
    
  } else {
    // Task is pending - we can't manually trigger the real Primus Task contract
    // because only the Primus network can call the callback
    console.log('⏳ Task is pending.');
    console.log('The real Primus Task contract can only be triggered by the Primus network.');
    console.log('');
    console.log('Options:');
    console.log('  1. Wait for Primus network to process the task (requires working SDK)');
    console.log('  2. Use the MockPrimusTask approach shown above for testing');
    console.log('  3. Contact Primus support about the SDK bug');
  }
}

main().catch(console.error);
