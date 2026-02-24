const hre = require("hardhat");

async function main() {
  const [wallet] = await ethers.getSigners();
  const taskId = "0x442236cf98b25c281db337578dab7e099afcddf2107a44fdeb33212540518b67";
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  const ITask = new ethers.utils.Interface([
    "function queryTask(bytes32 taskId) view returns (tuple(string templateId, address submitter, address[] attestors, tuple(address attestor, bytes32 taskId, tuple(address recipient, bytes request, bytes responseResolves, string data, string attConditions, uint64 timestamp, string additionParams) attestation)[] taskResults, uint64 submittedAt, uint8 tokenSymbol, address callback, uint8 taskStatus) taskInfo)"
  ]);
  
  const data = ITask.encodeFunctionData("queryTask", [taskId]);
  
  const result = await wallet.call({
    to: PRIMUS_TASK,
    data: data
  });
  
  const decoded = ITask.decodeFunctionResult("queryTask", result);
  const taskInfo = decoded.taskInfo;
  
  console.log('=== TASK INFO ===');
  console.log('Template ID:', taskInfo.templateId);
  console.log('Submitter:', taskInfo.submitter);
  console.log('Callback:', taskInfo.callback);
  console.log('Status:', taskInfo.taskStatus, '(0=INIT, 1=SUCCESS)');
  console.log('Submitted At:', taskInfo.submittedAt.toString());
  console.log('Task Results Count:', taskInfo.taskResults.length);
  
  if (taskInfo.taskResults.length > 0) {
    console.log('\n=== TASK RESULT ===');
    const result = taskInfo.taskResults[0];
    console.log('Attestor:', result.attestor);
    console.log('Task ID:', result.taskId);
    console.log('Timestamp:', result.attestation.timestamp.toString());
    console.log('Data:', result.attestation.data);
  } else {
    console.log('\n⚠️ NO TASK RESULTS - Task still in INIT state');
  }
}

main().catch(console.error);
