const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const taskId = "0xe6273d01d6bda61e344811a5fa9144549973099eb754f780c32e5d3ea52b45b3";
  
  const abi = [
    "function queryTask(bytes32) view returns (tuple(uint8 taskStatus, bytes32 taskId, address sender, string templateId, address[] attestors, uint64 submittedAt, tuple(bytes request, bytes responseResolve, string data, uint64 timestamp, bytes32 sig)[] taskResults))"
  ];
  
  const [signer] = await hre.ethers.getSigners();
  const primus = new ethers.Contract(PRIMUS_TASK, abi, signer);
  
  const taskInfo = await primus.queryTask(taskId);
  
  console.log('Task Status:', taskInfo.taskStatus);
  console.log('Submitted At:', taskInfo.submittedAt.toString());
  
  if (taskInfo.taskResults.length > 0) {
    const att = taskInfo.taskResults[0];
    console.log('\nAttestation:');
    console.log('  Timestamp:', att.timestamp.toString());
    console.log('  Data:', att.data);
  }
}

main().catch(console.error);
