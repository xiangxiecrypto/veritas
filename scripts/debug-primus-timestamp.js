const hre = require("hardhat");
const { ethers } = hre;
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const APP = "0x633A3d8c9Bdf6a1a73D8bDcc0c11a232F1a601fE";
const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
const COINBASE_API = 'https://api.coinbase.com/v2/exchange-rates?currency=BTC';
const CHAIN_ID = 84532;

async function main() {
  const [wallet] = await ethers.getSigners();
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const gasPrice = await ethers.provider.getGasPrice();
  const fee = ethers.BigNumber.from('10000000000');
  
  // Request validation
  const tx = await app.requestValidation(1018, 0, [0], 1, { 
    value: fee,
    gasPrice: gasPrice.mul(3)
  });
  const receipt = await tx.wait();
  
  const event = receipt.events.find(e => e.event === 'ValidationRequested');
  const taskId = event.args.taskId;
  console.log('Task ID:', taskId);
  
  // SDK attestation - get timestamp
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
  
  console.log('\nSDK timestamp:', result[0].attestation.timestamp);
  console.log('SDK timestamp (hex):', ethers.BigNumber.from(result[0].attestation.timestamp).toHexString());
  
  // Now query Primus TaskContract for the same task
  const abi = [
    "function queryTask(bytes32) view returns (tuple(uint8 taskStatus, bytes32 taskId, address sender, string templateId, address[] attestors, uint64 submittedAt, tuple(bytes request, bytes responseResolve, string data, uint64 timestamp, bytes32 sig)[] taskResults))"
  ];
  
  const primusContract = new ethers.Contract(PRIMUS_TASK, abi, wallet);
  
  // Wait a bit for attestation to be recorded
  await new Promise(r => setTimeout(r, 5000));
  
  const taskInfo = await primusContract.queryTask(taskId);
  
  console.log('\nPrimus taskStatus:', taskInfo.taskStatus);
  console.log('Primus taskResults count:', taskInfo.taskResults.length);
  
  if (taskInfo.taskResults.length > 0) {
    const att = taskInfo.taskResults[0];
    console.log('Primus timestamp:', att.timestamp.toString());
    console.log('Primus data:', att.data);
  }
}

main().catch(console.error);
