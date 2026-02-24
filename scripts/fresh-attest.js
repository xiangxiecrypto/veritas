const hre = require("hardhat");
const { ethers } = hre;
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const APP = "0xaE7F684251dfA767e2Ed05AD3D4768B3E2935f4e";
const BTC_API = 'https://api.coinbase.com/v2/exchange-rates?currency=BTC';
const BTC_RULE_ID = 1;
const AGENT_ID = 1018;

async function main() {
  const [wallet] = await ethers.getSigners();
  
  const gasPrice = await ethers.provider.getGasPrice();
  const fee = ethers.BigNumber.from('10000000000');
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Create fresh request
  console.log('=== STEP 1: Fresh Request ===');
  const requestTx = await app.requestValidation(AGENT_ID, BTC_RULE_ID, [0], 1, { 
    value: fee,
    gasPrice: gasPrice.mul(3),
    gasLimit: 2000000
  });
  
  const requestReceipt = await requestTx.wait();
  const event = requestReceipt.events.find(e => e.event === 'ValidationRequested');
  const taskId = event.args.taskId;
  
  console.log('Task ID:', taskId);
  console.log('Tx:', requestTx.hash);
  
  // Attest
  console.log('\n=== STEP 2: Attest ===');
  const primus = new PrimusNetwork();
  await primus.init(wallet, 84532);
  
  const result = await primus.attest({
    address: wallet.address,
    taskId: taskId,
    taskTxHash: requestTx.hash,
    taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
    requests: [{ 
      url: BTC_API, 
      method: "GET", 
      header: {}, 
      body: "" 
    }],
    responseResolves: [[{
      keyName: "btcPrice",
      parseType: "json",
      parsePath: "$.data.rates.USD"
    }]]
  }, 120000);
  
  console.log('\n=== ATTEST() RETURN VALUE ===');
  console.log('Result type:', typeof result);
  console.log('Is Array:', Array.isArray(result));
  console.log('Length:', result.length);
  
  // Check structure
  console.log('\n=== result[0] Structure ===');
  console.log('Keys:', Object.keys(result[0]));
  
  if (result[0].taskResult) {
    console.log('\n=== taskResult ===');
    console.log('Keys:', Object.keys(result[0].taskResult));
    console.log('Attestor:', result[0].taskResult.attestor);
    console.log('Task ID:', result[0].taskResult.taskId);
  }
  
  console.log('\n=== attestation ===');
  const attestation = result[0].attestation;
  console.log('Keys:', Object.keys(attestation));
  console.log('\nFull attestation:');
  console.log(JSON.stringify(attestation, (key, value) => {
    if (typeof value === 'string' && value.length > 100) {
      return value.slice(0, 100) + '...';
    }
    return value;
  }, 2));
  
  // Check if attestor submitted on-chain
  console.log('\n=== STEP 3: Check On-Chain Status ===');
  await new Promise(r => setTimeout(r, 5000));
  
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const taskResult = await wallet.call({
    to: PRIMUS_TASK,
    data: '0x8d3943ec' + ethers.utils.defaultAbiCoder.encode(['bytes32'], [taskId]).slice(2)
  });
  
  const status = parseInt(taskResult.slice(-2), 16);
  console.log('Task Status:', status, '(0=INIT, 1=SUCCESS)');
  
  console.log('\n📝 SAVE THIS TASK ID:', taskId);
}

main().catch(console.error);
