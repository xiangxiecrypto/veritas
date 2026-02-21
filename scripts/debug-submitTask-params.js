/**
 * Debug: Show exact parameters passed to SDK submitTask()
 */

const hre = require("hardhat");
const { ethers } = hre;
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const CHAIN_ID = 84532;

async function main() {
  const [wallet] = await ethers.getSigners();
  
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║       DEBUG: SDK submitTask() Parameters                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  const primus = new PrimusNetwork();
  await primus.init(wallet, CHAIN_ID);

  // Test 1: Object format (official example)
  console.log('Test 1: Object Format (from official example)');
  console.log('Code: await primus.submitTask({ address: wallet.address })');
  console.log('Parameters passed:');
  console.log('  { address: "' + wallet.address + '" }');
  console.log('  → SDK converts this to positional params internally');
  console.log('');

  // Test 2: Positional format (from SDK function signature)
  console.log('Test 2: Positional Format (from SDK function signature)');
  console.log('Code: await primus.submitTask(address, templateId, attestorCount, tokenSymbol, callbackAddress)');
  console.log('Expected parameters:');
  console.log('  1. address: "' + wallet.address + '"');
  console.log('  2. templateId: "" (empty string)');
  console.log('  3. attestorCount: 1');
  console.log('  4. tokenSymbol: 0 (ETH)');
  console.log('  5. callbackAddress: "' + wallet.address + '"');
  console.log('');

  // Let's try calling with explicit empty templateId
  console.log('Test 3: Calling with explicit empty templateId');
  console.log('Code:');
  console.log('  await primus.submitTask({');
  console.log('    address: wallet.address,');
  console.log('    templateId: "",  // Explicitly empty');
  console.log('    attestorCount: 1,');
  console.log('    tokenSymbol: 0,');
  console.log('    callbackAddress: wallet.address');
  console.log('  })');
  console.log('');

  try {
    const result = await primus.submitTask({
      address: wallet.address,
      templateId: "",  // Explicitly empty
      attestorCount: 1,
      tokenSymbol: 0,
      callbackAddress: wallet.address  // Try setting callback
    });
    
    console.log('✅ Submit succeeded!');
    console.log('  Task ID:', result.taskId);
    console.log('  Task Tx Hash:', result.taskTxHash);
    
    // Check what was actually set in the contract
    const taskContract = await ethers.getContractAt([
      "function queryTask(bytes32) view returns (tuple(string templateId, address callback, uint8 taskStatus))"
    ], '0xC02234058caEaA9416506eABf6Ef3122fCA939E8');
    
    const taskInfo = await taskContract.queryTask(result.taskId);
    console.log('\nContract state:');
    console.log('  Template ID: "' + taskInfo.templateId + '"');
    console.log('  Callback:', taskInfo.callback);
    console.log('  Status:', taskInfo.taskStatus);
    
    if (taskInfo.callback === wallet.address) {
      console.log('\n✅ CALLBACK WAS SET CORRECTLY!');
    } else {
      console.log('\n❌ Callback not set. Got:', taskInfo.callback);
    }
    
  } catch (e) {
    console.error('❌ Error:', e.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log('');
  console.log('SDK accepts object format with these fields:');
  console.log('  - address (required)');
  console.log('  - templateId (optional, can be empty)');
  console.log('  - attestorCount (optional, default 1)');
  console.log('  - tokenSymbol (optional, default ETH)');
  console.log('  - callbackAddress (optional, but SDK ignores it!)');
  console.log('');
  console.log('The SDK bug: callbackAddress parameter is ignored.');
}

main().catch(console.error);
