const hre = require("hardhat");

async function main() {
  const APP = "0x5464AD99af47c74689de69822fcAaF830cb2D006";
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const taskId = "0xd5e4e56923efe1ccc391ebf151832c641030bd95c3d625f35a268f3e3a1d0dc9";
  
  const [signer] = await hre.ethers.getSigners();
  
  const abi = [
    "function queryTask(bytes32) view returns (tuple(uint8 taskStatus, bytes32 taskId, address sender, string templateId, address[] attestors, uint64 submittedAt, tuple(bytes request, bytes responseResolve, string data, uint64 timestamp, bytes32 sig)[] taskResults))"
  ];
  
  const primus = new hre.ethers.Contract(PRIMUS_TASK, abi, signer);
  const taskInfo = await primus.queryTask(taskId);
  
  console.log('Task Status:', taskInfo.taskStatus);
  console.log('Results count:', taskInfo.taskResults.length);
  
  if (taskInfo.taskResults.length > 0) {
    const result = taskInfo.taskResults[0];
    console.log('\nRequest (hex):', hre.ethers.utils.hexlify(result.request));
    console.log('\nRequest (string):');
    try {
      console.log(hre.ethers.utils.toUtf8String(result.request));
    } catch (e) {
      console.log('(not utf8)');
    }
    console.log('\nResponseResolve (hex):', hre.ethers.utils.hexlify(result.responseResolve));
    console.log('\nData:', result.data);
    console.log('Timestamp:', result.timestamp.toString());
  }
}

main().catch(console.error);
