const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const taskId = "0xaf8752ada8c921a65997c15e8810b373451fd34afc736ca3234b2cc7101775ba";
  
  const [signer] = await hre.ethers.getSigners();
  
  const result = await signer.call({
    to: PRIMUS_TASK,
    data: '0x8d3943ec' + ethers.utils.defaultAbiCoder.encode(['bytes32'], [taskId]).slice(2)
  });
  
  // Decode with correct struct including bytes32 sig
  const decoded = ethers.utils.defaultAbiCoder.decode(
    ['tuple(string templateId, address submitter, address[] attestors, tuple(address attestor, bytes32 taskId, tuple(address recipient, bytes request, bytes responseResolve, string data, bytes32 sig, uint64 timestamp) attestation)[] taskResults, uint64 submittedAt, uint8 tokenSymbol, address callback, uint8 taskStatus)'],
    result
  );
  
  const taskInfo = decoded[0];
  const att = taskInfo.taskResults[0].attestation;
  
  console.log('=== Attestation Fields ===');
  console.log('Recipient:', att.recipient);
  console.log('Request (hex):', att.request);
  console.log('Response Resolve (hex):', att.responseResolve);
  console.log('Data:', att.data);
  console.log('Sig (hex):', att.sig);
  console.log('Sig (uint256):', ethers.BigNumber.from(att.sig).toString());
  console.log('Timestamp (raw uint64):', att.timestamp.toString());
  console.log('Timestamp (ms):', new Date(parseInt(att.timestamp)).toISOString());
  console.log('');
  console.log('SubmittedAt:', taskInfo.submittedAt.toString(), '(' + new Date(taskInfo.submittedAt * 1000).toISOString() + ')');
}

main().catch(console.error);
