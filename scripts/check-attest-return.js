const hre = require("hardhat");
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

async function main() {
  const [wallet] = await ethers.getSigners();
  
  console.log('=== CHECKING ATTEST() RETURN VALUE ===\n');
  
  const taskId = "0x17fcfc46b8ac6faed3f5867c90c121f338151db7e5b1b5dc3c9fa2ea7dae2895";
  const requestTxHash = "0x6635f48dd36612abdae2b0350cebc0c58a7323496e6042ca006ed46cd9ac05f3";
  
  const primus = new PrimusNetwork();
  await primus.init(wallet, 84532);
  
  const result = await primus.attest({
    address: wallet.address,
    taskId: taskId,
    taskTxHash: requestTxHash,
    taskAttestors: ['0x0DE886e31723e64Aa72e51977B14475fB66a9f72'],
    requests: [{ 
      url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC', 
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
  
  console.log('=== ATTEST() RETURN VALUE ===\n');
  console.log('Type:', typeof result);
  console.log('Is Array:', Array.isArray(result));
  console.log('Length:', result.length);
  
  console.log('\n=== result[0] ===');
  console.log('Keys:', Object.keys(result[0]));
  
  console.log('\n=== result[0].attestation ===');
  const attestation = result[0].attestation;
  console.log('Keys:', Object.keys(attestation));
  console.log('Recipient:', attestation.recipient);
  console.log('Timestamp:', attestation.timestamp);
  console.log('Data:', attestation.data);
  console.log('Request length:', attestation.request?.length);
  console.log('ResponseResolves length:', attestation.responseResolves?.length);
  
  console.log('\n=== result[0].taskResult ===');
  if (result[0].taskResult) {
    console.log('Keys:', Object.keys(result[0].taskResult));
    console.log('Attestor:', result[0].taskResult.attestor);
    console.log('Task ID:', result[0].taskResult.taskId);
  } else {
    console.log('taskResult: undefined');
  }
  
  console.log('\n=== Full result JSON ===');
  console.log(JSON.stringify(result, (key, value) => {
    if (typeof value === 'string' && value.length > 100) {
      return value.slice(0, 100) + '...';
    }
    return value;
  }, 2));
}

main().catch(console.error);
