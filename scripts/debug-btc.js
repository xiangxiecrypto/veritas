const hre = require("hardhat");
const { ethers } = hre;
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

const COINBASE_API = 'https://api.coinbase.com/v2/exchange-rates?currency=BTC';
const CHAIN_ID = 84532;

async function main() {
  const [wallet] = await ethers.getSigners();
  
  const primus = new PrimusNetwork();
  await primus.init(wallet, CHAIN_ID);
  
  const result = await primus.attest({
    address: wallet.address,
    taskId: "0x39c9731959ba7f54d76af4c1de1b17fa0c9e6e30adca601bb4c902ef8ffd30fa",
    taskTxHash: "0x...",
    taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
    requests: [{ url: COINBASE_API, method: "GET", header: {}, body: "" }],
    responseResolves: [[{
      keyName: "btcPrice",
      parseType: "json",
      parsePath: "$.data.rates.USD"
    }]]
  }, 60000);
  
  const att = result[0].attestation;
  
  console.log('request (hex):');
  console.log(ethers.utils.hexlify(att.request));
  console.log('\nrequest (string):');
  console.log(ethers.utils.toUtf8String(att.request));
  
  console.log('\nresponseResolve (hex):');
  console.log(ethers.utils.hexlify(att.responseResolve));
  
  console.log('\ndata:');
  console.log(att.data);
}

main().catch(console.error);
