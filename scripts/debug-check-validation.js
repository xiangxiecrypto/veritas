const hre = require("hardhat");
const { ethers } = hre;

const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
const taskId = "0x72fcde286b08a819648224f089f178d01d708f2c4858398f5768e73399c61f8f";

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  // Query the task
  const result = await signer.call({
    to: PRIMUS_TASK,
    data: '0x8d3943ec' + ethers.utils.defaultAbiCoder.encode(['bytes32'], [taskId]).slice(2)
  });
  
  const decoded = ethers.utils.defaultAbiCoder.decode(
    ['tuple(string templateId, address submitter, address[] attestors, tuple(address attestor, bytes32 taskId, tuple(address recipient, bytes request, bytes responseResolve, string data, bytes32 sig, uint64 timestamp) attestation)[] taskResults, uint64 submittedAt, uint8 tokenSymbol, address callback, uint8 taskStatus)'],
    result
  );
  
  const taskInfo = decoded[0];
  const att = taskInfo.taskResults[0].attestation;
  
  console.log('=== Attestation Being Validated ===\n');
  console.log('URL (request):', att.request);
  console.log('URL (hex):', att.request);
  console.log('');
  console.log('Response Resolve (bytes):', att.responseResolve);
  console.log('Response Resolve (hex):', att.responseResolve);
  console.log('');
  console.log('Data:', att.data);
  console.log('');
  
  // Expected values
  console.log('=== Expected Values ===');
  console.log('URL: https://api.coinbase.com/v2/exchange-rates?currency=BTC');
  console.log('dataKey: btcPrice');
  console.log('parsePath: $.data.rates.USD');
}

main().catch(console.error);
