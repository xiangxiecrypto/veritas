const hre = require("hardhat");
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

async function main() {
  const APP = "0xecD605f0B4167210532Ff9860595E7ce3Acc8f86";
  const PRIMUS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const AGENT_ID = 1018;
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('\n🔍 Checking Primus SDK Behavior\n');
  console.log('='.repeat(70));
  console.log('');
  
  // Step 1: Request validation
  console.log('📦 Step 1: Request Validation');
  console.log('─'.repeat(70));
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const Task = new hre.ethers.Contract(PRIMUS, ["function queryLatestFeeInfo(uint8) view returns (tuple(uint256 primusFee, uint256 attestorFee))"], signer);
  const feeInfo = await Task.queryLatestFeeInfo(0);
  const totalFee = feeInfo.primusFee.add(feeInfo.attestorFee);
  
  const tx = await app.requestValidation(AGENT_ID, 0, [0], 1, { value: totalFee });
  const receipt = await tx.wait();
  console.log('✅ Tx:', tx.hash);
  console.log('   Block:', receipt.blockNumber);
  
  // Get taskId
  const iface = new hre.ethers.utils.Interface([
    "event ValidationRequested(bytes32 indexed taskId, uint256 indexed ruleId, uint256 indexed agentId)"
  ]);
  let taskId;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed.name === 'ValidationRequested') {
        taskId = parsed.args.taskId;
        break;
      }
    } catch (e) {}
  }
  console.log('   Task ID:', taskId);
  console.log('');
  
  // Step 2: Call attest and inspect the result
  console.log('📦 Step 2: Call attest() and Inspect Result');
  console.log('─'.repeat(70));
  
  const primus = new PrimusNetwork();
  await primus.init(signer, 84532);
  
  const attestRequest = {
    address: signer.address,
    userAddress: signer.address,
    taskId: taskId,
    taskTxHash: tx.hash,
    taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
    requests: [{
      url: 'https://www.moltbook.com/api/v1/agents/profile?name=CilohPrimus',
      method: 'GET',
      header: '',
      body: ''
    }],
    responseResolves: [[{
      keyName: 'followers',
      parseType: 'json',
      parsePath: '$.agent.owner.x_follower_count'
    }]]
  };
  
  console.log('Calling attest()...');
  const result = await primus.attest(attestRequest, 120000);
  
  console.log('\n📊 Full Result from attest():');
  console.log('─'.repeat(70));
  console.log('Type:', typeof result);
  console.log('Is Array:', Array.isArray(result));
  console.log('');
  
  if (Array.isArray(result) && result.length > 0) {
    console.log('result[0] keys:', Object.keys(result[0]));
    console.log('');
    
    console.log('result[0] details:');
    for (const key of Object.keys(result[0])) {
      const value = result[0][key];
      if (typeof value === 'object' && value !== null) {
        console.log(`  ${key}:`, JSON.stringify(value, null, 2).substring(0, 200));
      } else {
        console.log(`  ${key}:`, value);
      }
    }
    console.log('');
    
    // Check for reportTxHash specifically
    if (result[0].reportTxHash) {
      console.log('✅ reportTxHash found:', result[0].reportTxHash);
    } else {
      console.log('❌ reportTxHash NOT found in result');
    }
    
    // Check for attestor
    if (result[0].attestor) {
      console.log('✅ attestor:', result[0].attestor);
    }
    
    // Check for taskId
    if (result[0].taskId) {
      console.log('✅ taskId:', result[0].taskId);
    }
    
    // Check for attestation
    if (result[0].attestation) {
      console.log('✅ attestation.data:', result[0].attestation.data);
      console.log('   attestation.timestamp:', result[0].attestation.timestamp);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('SDK Analysis Complete');
}

main().catch(console.error);
