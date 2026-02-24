const hre = require("hardhat");
const { ethers } = hre;

const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
const taskId = "0x72fcde286b08a819648224f089f178d01d708f2c4858398f5768e73399c61f8f";

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  const result = await signer.call({
    to: PRIMUS_TASK,
    data: '0x8d3943ec' + ethers.utils.defaultAbiCoder.encode(['bytes32'], [taskId]).slice(2)
  });
  
  const decoded = ethers.utils.defaultAbiCoder.decode(
    ['tuple(string templateId, address submitter, address[] attestors, tuple(address attestor, bytes32 taskId, tuple(address recipient, bytes request, bytes responseResolve, string data, bytes32 sig, uint64 timestamp) attestation)[] taskResults, uint64 submittedAt, uint8 tokenSymbol, address callback, uint8 taskStatus)'],
    result
  );
  
  const taskInfo = decoded[0];
  
  console.log('templateId:', taskInfo.templateId);
  console.log('');
  console.log('Expected URL: https://api.coinbase.com/v2/exchange-rates?currency=BTC');
  console.log('Match:', taskInfo.templateId === 'https://api.coinbase.com/v2/exchange-rates?currency=BTC');
}

main().catch(console.error);
