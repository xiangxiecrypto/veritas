const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const taskId = "0xaf8752ada8c921a65997c15e8810b373451fd34afc736ca3234b2cc7101775ba";
  
  const [signer] = await hre.ethers.getSigners();
  
  // Call queryTask
  const result = await signer.call({
    to: PRIMUS_TASK,
    data: '0x8d3943ec' + ethers.utils.defaultAbiCoder.encode(['bytes32'], [taskId]).slice(2)
  });
  
  // Decode manually with correct struct
  const decoded = ethers.utils.defaultAbiCoder.decode(
    ['tuple(string templateId, address submitter, address[] attestors, tuple(address attestor, bytes32 taskId, tuple(address recipient, bytes request, bytes responseResolve, string data, bytes32 sig, uint64 timestamp) attestation)[] taskResults, uint64 submittedAt, uint8 tokenSymbol, address callback, uint8 taskStatus)'],
    result
  );
  
  const taskInfo = decoded[0];
  
  console.log('=== Real Primus Attestation ===\n');
  console.log('Template ID:', taskInfo.templateId);
  console.log('Submitter:', taskInfo.submitter);
  console.log('Submitted At:', taskInfo.submittedAt.toString(), '(' + new Date(taskInfo.submittedAt * 1000).toISOString() + ')');
  console.log('Task Status:', taskInfo.taskStatus);
  console.log('');
  
  if (taskInfo.taskResults.length > 0) {
    const result = taskInfo.taskResults[0];
    console.log('=== Task Result ===');
    console.log('Attestor:', result.attestor);
    console.log('Task ID:', result.taskId);
    console.log('');
    
    const att = result.attestation;
    console.log('=== Attestation ===');
    console.log('Recipient:', att.recipient);
    console.log('Request:', att.request);
    console.log('Response Resolve:', att.responseResolve);
    console.log('Data:', att.data);
    console.log('Sig:', att.sig);
    console.log('Timestamp:', att.timestamp.toString(), '(' + new Date(att.timestamp).toISOString() + ')');
  }
}

main().catch(console.error);
