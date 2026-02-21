/**
 * SIMPLE TEST: Direct TaskContract Call
 * Uses already deployed contract to avoid nonce conflicts
 */

const hre = require("hardhat");
const { ethers } = hre;

const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
const APP_V5 = '0x5fd86B1F5Cc3Ec213552e4932BDa75b3f997B5Db'; // Just deployed

const TASK_ABI = [
  "function queryLatestFeeInfo(uint8 tokenSymbol) view returns (tuple(uint256 primusFee, uint256 attestorFee))",
  "function submitTask(address sender, string calldata templateId, uint256 attestorCount, uint8 tokenSymbol, address callback) external payable returns (bytes32)",
  "event TaskSubmitted(bytes32 indexed taskId, address indexed requester, string templateId)",
  "function tasks(bytes32) view returns (tuple(address requester, string templateId, uint256 attestorCount, uint8 tokenSymbol, address callback, uint8 status))"
];

async function main() {
  const [wallet] = await ethers.getSigners();
  
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║       SIMPLE TEST: Direct TaskContract Call                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  console.log('Wallet:', wallet.address);
  console.log('Using AppV5:', APP_V5);
  console.log('');

  // Create TaskContract instance
  const taskContract = new ethers.Contract(PRIMUS_TASK, TASK_ABI, wallet);
  
  // Get fee
  const feeInfo = await taskContract.queryLatestFeeInfo(0);
  const totalFee = feeInfo.primusFee.add(feeInfo.attestorFee);
  console.log('Fee:', ethers.utils.formatEther(totalFee), 'ETH');
  console.log('');

  console.log('Calling TaskContract.submitTask() with callback = AppV5...');
  console.log('  sender:', wallet.address);
  console.log('  callback:', APP_V5);
  console.log('');

  // Get fresh nonce
  const nonce = await wallet.getTransactionCount();
  const gasPrice = await wallet.provider.getGasPrice();
  
  // Call submitTask directly
  const tx = await taskContract.submitTask(
    wallet.address,
    "",
    1,
    0,
    APP_V5,
    { 
      value: totalFee,
      gasPrice: gasPrice.mul(3), // Triple gas price
      nonce: nonce
    }
  );

  const receipt = await tx.wait();
  console.log('✅ Transaction mined!');
  console.log('  Tx Hash:', receipt.transactionHash);
  console.log('  Block:', receipt.blockNumber);
  console.log('');

  // Get taskId
  const iface = new ethers.utils.Interface(TASK_ABI);
  let taskId;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed.name === 'TaskSubmitted') {
        taskId = parsed.args.taskId;
        console.log('  Task ID:', taskId);
        break;
      }
    } catch (e) {}
  }
  console.log('');

  // Verify callback
  const task = await taskContract.tasks(taskId);
  console.log('Task info:');
  console.log('  Callback:', task.callback);
  console.log('  Expected:', APP_V5);
  console.log('  Match:', task.callback === APP_V5 ? '✅ YES!' : '❌ NO');

  if (task.callback === APP_V5) {
    console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅✅✅ CALLBACK SET CORRECTLY! ✅✅✅                      ║');
    console.log('║                                                                           ║');
    console.log('║  Direct TaskContract call works!                               ║');
    console.log('║  Now you can use Primus SDK attest() and wait for callback!    ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  }
}

main().catch(console.error);
