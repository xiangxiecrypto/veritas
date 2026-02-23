const hre = require("hardhat");
const { ethers } = hre;

const APP = "0x68c75b005C651D829238938d61bB25D75Cc4643E";
const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';

const TASK_ABI = [
  "function queryTask(bytes32) view returns (tuple(uint8 taskStatus, bytes32 taskId, address sender, string templateId, address[] attestors, uint64 submittedAt, tuple(bytes request, bytes responseResolve, string data, uint64 timestamp, bytes32 sig)[] taskResults))",
  "function queryLatestFeeInfo(uint8) view returns (tuple(uint256 primusFee, uint256 attestorFee))"
];

async function main() {
  const [wallet] = await ethers.getSigners();
  
  // Use existing task
  const taskId = "0x8fb6cda8019a8322b01f74714ee4a73a862277d19f710d21229a1a2f1ef34d32";
  const primusTaskId = "0x0045527d4c96bf3296238a4efbf60a0ce04b9806a0a534c92f251ba626adbfc9";
  
  console.log('\n🔍 Checking Task Status\n');
  
  const taskContract = new ethers.Contract(PRIMUS_TASK, TASK_ABI, wallet);
  const taskInfo = await taskContract.queryTask(primusTaskId);
  
  console.log('Task Status:', taskInfo.taskStatus, ['PENDING', 'SUCCESS', 'FAILED'][taskInfo.taskStatus] || 'UNKNOWN');
  console.log('Results count:', taskInfo.taskResults.length);
  
  if (taskInfo.taskResults.length > 0) {
    const result = taskInfo.taskResults[0];
    console.log('\nAttestation:');
    console.log('  Data:', result.data);
    console.log('  Timestamp:', result.timestamp);
  }
  
  // If SUCCESS, try submitting
  if (taskInfo.taskStatus === 1) {
    console.log('\n📦 Submitting...');
    
    const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
    const app = App.attach(APP);
    
    const gasPrice = await ethers.provider.getGasPrice();
    const submitTx = await app.submitAttestation(taskId, {
      gasPrice: gasPrice.mul(3)
    });
    const receipt = await submitTx.wait();
    
    const completedEvent = receipt.events.find(e => e.event === 'ValidationCompleted');
    if (completedEvent) {
      console.log('\n✅ SUCCESS!');
      console.log('Score:', completedEvent.args.score.toString());
    }
  } else {
    console.log('\n⏳ Task not successful yet. Wait a few seconds and retry.');
  }
}

main().catch(console.error);
