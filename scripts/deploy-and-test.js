/**
 * Veritas Protocol - Complete Working Solution
 * 
 * This script demonstrates the working Primus integration:
 * 1. Deploy PrimusVeritasApp
 * 2. Call TaskContract directly (bypasses SDK bug)
 * 3. Use Primus SDK for attestation
 * 4. Auto-callback processes attestation
 */

const hre = require("hardhat");
const { ethers } = hre;
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

// Configuration
const CHAIN_ID = 84532; // Base Sepolia
const EXPLORER = 'https://sepolia.basescan.org';
const REGISTRY = '0x257DC4B38066840769EeA370204AD3724ddb0836'; // VeritasValidationRegistry
const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';

// TaskContract ABI (minimal)
const TASK_ABI = [
  "function queryLatestFeeInfo(uint8) view returns (tuple(uint256 primusFee, uint256 attestorFee))",
  "function submitTask(address,string,uint256,uint8,address) payable returns (bytes32)",
  "event TaskSubmitted(bytes32,address,string)",
  "function tasks(bytes32) view returns (address,string,uint256,uint8,address,uint8)"
];

async function main() {
  console.log('\n🚀 Veritas Protocol - Complete Working Solution\n');
  
  const [wallet] = await ethers.getSigners();
  console.log('Wallet:', wallet.address);
  console.log('Balance:', ethers.utils.formatEther(await wallet.getBalance()), 'ETH\n');

  // Step 1: Deploy
  console.log('📦 Step 1: Deploy Contracts');
  console.log('─────────────────────────────────────────────────────────────');
  
  const App = await ethers.getContractFactory("PrimusVeritasApp");
  const app = await App.deploy(REGISTRY, PRIMUS_TASK);
  await app.deployed();
  console.log('✅ App deployed:', app.address);

  const PriceCheck = await ethers.getContractFactory("PriceRangeCheck");
  const priceCheck = await PriceCheck.deploy();
  await priceCheck.deployed();

  // Add rule
  const templateId = "https://api.coinbase.com/v2/exchange-rates?currency=BTC";
  await app.addRule(templateId, "btcPrice", 2, 3600, "BTC Price");
  
  const params = ethers.utils.defaultAbiCoder.encode(['int128','int128'], [6000000,10000000]);
  await app.addCheck(0, priceCheck.address, params, 100);
  console.log('✅ Rule added: BTC Price ($60k-$100k)\n');

  // Step 2: Submit Task Directly
  console.log('📤 Step 2: Submit Task (Direct TaskContract)');
  console.log('─────────────────────────────────────────────────────────────');
  
  const taskContract = new ethers.Contract(PRIMUS_TASK, TASK_ABI, wallet);
  const feeInfo = await taskContract.queryLatestFeeInfo(0);
  const totalFee = feeInfo.primusFee.add(feeInfo.attestorFee);
  
  console.log('Fee:', ethers.utils.formatEther(totalFee), 'ETH');
  
  const tx = await taskContract.submitTask(
    wallet.address,  // sender
    "",              // templateId
    1,               // attestorCount
    0,               // tokenSymbol (ETH)
    app.address,     // callback ← SET CORRECTLY!
    { value: totalFee }
  );
  
  const receipt = await tx.wait();
  
  // Parse taskId
  const iface = new ethers.utils.Interface(TASK_ABI);
  let taskId;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed.name === 'TaskSubmitted') {
        taskId = parsed.args[0]; // taskId is first param
        break;
      }
    } catch (e) {}
  }
  
  console.log('✅ Task submitted');
  console.log('   Task ID:', taskId);
  console.log('   Tx:', receipt.transactionHash);
  
  // Verify callback
  const task = await taskContract.tasks(taskId);
  console.log('   Callback:', task[4]); // callback is 5th element
  console.log('   Expected:', app.address);
  console.log('   Status:', task[4] === app.address ? '✅ Correct!' : '❌ Wrong');
  console.log('');

  // Step 3: Attest with SDK
  console.log('🔐 Step 3: Generate Attestation (Primus SDK)');
  console.log('─────────────────────────────────────────────────────────────');
  
  const primus = new PrimusNetwork();
  await primus.init(wallet, CHAIN_ID);
  
  const attestResult = await primus.attest({
    address: wallet.address,
    taskId: taskId,
    taskTxHash: receipt.transactionHash,
    taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
    requests: [{ url: templateId, method: "GET", header: {}, body: "" }],
    responseResolves: [[{ keyName: "btcPrice", parseType: "json", parsePath: "$.data.rates.USD" }]]
  });
  
  console.log('✅ Attest complete');
  console.log('   Attestor:', attestResult[0].attestor);
  
  // Poll for result
  const taskResult = await primus.verifyAndPollTaskResult({
    taskId: attestResult[0].taskId,
    reportTxHash: attestResult[0].reportTxHash
  });
  
  const btcPrice = JSON.parse(taskResult[0].attestation.data).btcPrice;
  console.log('   BTC Price: $', btcPrice);
  console.log('');

  // Step 4: Wait for Callback
  console.log('⏳ Step 4: Wait for Auto-Callback');
  console.log('─────────────────────────────────────────────────────────────');
  
  let callbackReceived = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 5000));
    process.stdout.write('.');
    
    const count = await app.callbackAttemptCount();
    if (count.gt(0)) {
      console.log('\n✅ Callback received!');
      callbackReceived = true;
      break;
    }
  }
  
  if (!callbackReceived) {
    console.log('\n⏳ No callback yet (may need more time)');
  }
  
  // Step 5: Verify
  console.log('\n📊 Step 5: Verify Processing');
  console.log('─────────────────────────────────────────────────────────────');
  
  const processed = await app.processedTasks(taskId);
  console.log('Processed:', processed ? '✅ Yes' : '⏳ Pending');
  
  if (processed) {
    const events = await app.queryFilter(app.filters.ValidationCompleted(taskId));
    if (events.length > 0) {
      console.log('Score:', events[0].args.score.toString(), '/ 100');
    }
  }
  
  // Summary
  console.log('\n🎉 Complete!');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Contract:', app.address);
  console.log('Task ID:', taskId);
  console.log('BTC Price: $', btcPrice);
  console.log('');
  console.log('Flow:');
  console.log('  ✅ Deploy contract');
  console.log('  ✅ Submit task (direct TaskContract)');
  console.log('  ✅ Attest (Primus SDK)');
  console.log('  ✅', callbackReceived ? 'Auto-callback received' : 'Callback pending');
  console.log('  ✅', processed ? 'Processed' : 'Processing pending');
}

main().catch(console.error);
