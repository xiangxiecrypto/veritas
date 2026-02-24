const hre = require("hardhat");
const { ethers } = hre;
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const APP = "0x633A3d8c9Bdf6a1a73D8bDcc0c11a232F1a601fE";
const COINBASE_API = 'https://api.coinbase.com/v2/exchange-rates?currency=BTC';
const CHAIN_ID = 84532;

async function main() {
  const [wallet] = await ethers.getSigners();
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const gasPrice = await ethers.provider.getGasPrice();
  const fee = ethers.BigNumber.from('10000000000');
  
  // Step 1: Deploy SimpleVerificationCheck
  console.log('Step 1: Deploy SimpleVerificationCheck');
  const Check = await hre.ethers.getContractFactory("SimpleVerificationCheck");
  const check = await Check.deploy();
  await check.deployed();
  console.log('Check:', check.address);
  
  // Step 2: Add Rule 0
  console.log('\nStep 2: Add Rule 0');
  const ruleTx = await app.addRule(
    COINBASE_API,
    "btcPrice",
    "$.data.rates.USD",
    0,
    3600,
    "Coinbase BTC/USD",
    { gasPrice: gasPrice.mul(3) }
  );
  await ruleTx.wait();
  console.log('Rule 0 added');
  
  // Step 3: Add SimpleVerificationCheck as Check 0
  console.log('\nStep 3: Add Check 0');
  const addTx = await app.addCheck(0, check.address, "0x", 95, {
    gasPrice: gasPrice.mul(3)
  });
  await addTx.wait();
  console.log('Check 0 added (score 95)');
  
  // Step 4: Request validation
  console.log('\nStep 4: Request validation');
  const tx = await app.requestValidation(1018, 0, [0], 1, { 
    value: fee,
    gasPrice: gasPrice.mul(3)
  });
  const receipt = await tx.wait();
  
  const event = receipt.events.find(e => e.event === 'ValidationRequested');
  const taskId = event.args.taskId;
  console.log('Task ID:', taskId);
  
  // Step 5: Attest
  console.log('\nStep 5: Attest');
  const primus = new PrimusNetwork();
  await primus.init(wallet, CHAIN_ID);
  
  const result = await primus.attest({
    address: wallet.address,
    taskId: taskId,
    taskTxHash: tx.hash,
    taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
    requests: [{ url: COINBASE_API, method: "GET", header: {}, body: "" }],
    responseResolves: [[{
      keyName: "btcPrice",
      parseType: "json",
      parsePath: "$.data.rates.USD"
    }]]
  }, 120000);
  
  console.log('Data:', result[0].attestation.data);
  
  // Step 6: Submit
  console.log('\nStep 6: Submit');
  const submitTx = await app.submitAttestation(taskId, {
    gasPrice: gasPrice.mul(3),
    gasLimit: 500000
  });
  const submitReceipt = await submitTx.wait();
  
  console.log('\n=== RESULTS ===');
  
  for (const log of submitReceipt.logs) {
    try {
      const parsed = app.interface.parseLog({ topics: log.topics, data: log.data });
      if (parsed.name === 'ValidationCompleted') {
        console.log('✅ Score:', parsed.args.score.toString());
      }
      if (parsed.name === 'CheckPassed') {
        console.log('✅ Check passed');
      }
      if (parsed.name === 'CheckFailed') {
        console.log('❌ Check failed');
      }
    } catch (e) {}
  }
}

main().catch(console.error);
