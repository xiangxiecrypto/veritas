const hre = require("hardhat");

async function main() {
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const taskId = "0xac589ef64afa2dfcf492e3b42f8cab4416ebf5d521c82b56dc36b5eb09801944";
  
  const abi = [
    "function queryTask(bytes32) view returns (tuple(uint8 taskStatus, bytes32 taskId, address sender, string templateId, address[] attestors, uint64 submittedAt, tuple(bytes request, bytes responseResolve, string data, uint64 timestamp, bytes32 sig)[] taskResults))"
  ];
  
  const [signer] = await hre.ethers.getSigners();
  const primus = new hre.ethers.Contract(PRIMUS_TASK, abi, signer);
  
  const taskInfo = await primus.queryTask(taskId);
  
  if (taskInfo.taskResults.length > 0) {
    const result = taskInfo.taskResults[0];
    console.log('Primus timestamp:', result.timestamp.toString());
    console.log('Divided by 1000:', (result.timestamp / 1000).toString());
    console.log('Block time:', (await hre.ethers.provider.getBlock()).timestamp);
  }
}

main().catch(console.error);
