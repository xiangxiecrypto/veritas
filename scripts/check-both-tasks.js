const hre = require("hardhat");

async function main() {
  const [wallet] = await hre.ethers.getSigners();
  const PRIMUS_TASK = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  const btcTaskId = "0x6c99331a1a78b85ce73b1e4736c945827783b9ed3e247f3ee8aeab4831259a91";
  const moltbookTaskId = "0x442236cf98b25c281db337578dab7e099afcddf2107a44fdeb33212540518b67";
  
  const ITask = new hre.ethers.utils.Interface([
    "function queryTask(bytes32 taskId) view returns (tuple(string templateId, address submitter, address[] attestors, tuple(address attestor, bytes32 taskId, tuple(address recipient, bytes request, bytes responseResolves, string data, string attConditions, uint64 timestamp, string additionParams) attestation)[] taskResults, uint64 submittedAt, uint8 tokenSymbol, address callback, uint8 taskStatus) taskInfo)"
  ]);
  
  console.log('=== BTC TASK (SUCCESS) ===\n');
  const btcData = ITask.encodeFunctionData("queryTask", [btcTaskId]);
  const btcResult = await wallet.call({ to: PRIMUS_TASK, data: btcData });
  const btcDecoded = ITask.decodeFunctionResult("queryTask", btcResult);
  
  console.log('Status:', btcDecoded.taskInfo.taskStatus, '(0=INIT, 1=SUCCESS)');
  console.log('Task Results:', btcDecoded.taskInfo.taskResults.length);
  if (btcDecoded.taskInfo.taskResults.length > 0) {
    const r = btcDecoded.taskInfo.taskResults[0];
    console.log('Attestor:', r.attestor);
    console.log('Data:', r.attestation.data);
  }
  
  console.log('\n=== MOLTBOOK TASK (FAILED) ===\n');
  const moltbookData = ITask.encodeFunctionData("queryTask", [moltbookTaskId]);
  const moltbookResult = await wallet.call({ to: PRIMUS_TASK, data: moltbookData });
  const moltbookDecoded = ITask.decodeFunctionResult("queryTask", moltbookResult);
  
  console.log('Status:', moltbookDecoded.taskInfo.taskStatus, '(0=INIT, 1=SUCCESS)');
  console.log('Task Results:', moltbookDecoded.taskInfo.taskResults.length);
  if (moltbookDecoded.taskInfo.taskResults.length > 0) {
    const r = moltbookDecoded.taskInfo.taskResults[0];
    console.log('Attestor:', r.attestor);
    console.log('Data:', r.attestation.data);
    console.log('Request length:', r.attestation.request.length);
    console.log('ResponseResolves length:', r.attestation.responseResolves.length);
  }
}

main().catch(console.error);
