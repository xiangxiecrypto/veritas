const hre = require("hardhat");
const { ethers } = hre;
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
const COINBASE_API = 'https://api.coinbase.com/v2/exchange-rates?currency=BTC';
const CHAIN_ID = 84532;

async function main() {
  const [wallet] = await ethers.getSigners();
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  const gasPrice = await ethers.provider.getGasPrice();
  const fee = ethers.BigNumber.from('10000000000');
  
  // Request validation
  console.log('Requesting...');
  const tx = await app.requestValidation(1018, 1, [0], 1, { 
    value: fee,
    gasPrice: gasPrice.mul(3)
  });
  const receipt = await tx.wait();
  
  const event = receipt.events.find(e => e.event === 'ValidationRequested');
  const taskId = event.args.taskId;
  console.log('Task ID:', taskId);
  
  // SDK Attestation
  console.log('\nAttesting...');
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
  
  const att = result[0].attestation;
  
  console.log('\n=== ATTESTATION DETAILS ===\n');
  
  console.log('REQUEST (bytes):');
  console.log(ethers.utils.hexlify(att.request));
  console.log('\nREQUEST (string):');
  console.log(ethers.utils.toUtf8String(att.request));
  
  console.log('\n\nRESPONSE RESOLVE (bytes):');
  console.log(ethers.utils.hexlify(att.responseResolve));
  
  console.log('\n\nDATA:');
  console.log(att.data);
  
  console.log('\n\nTIMESTAMP:', att.timestamp);
}

main().catch(console.error);
