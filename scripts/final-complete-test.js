/**
 * FINAL COMPLETE TEST
 * Using correct ERC-8004 Identity Registry
 */

const hre = require("hardhat");

async function main() {
  // New contracts with correct identity registry
  const APP = "0xa21CC240ed059eC4b31e45559865Af73C0CCA6Da";
  const CHECK = "0xDebe3ddf4854b7198dd1DCcDFc70e920000D1E52";
  const PRIMUS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  const IDENTITY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('🎯 FINAL COMPLETE TEST');
  console.log('   Using CORRECT ERC-8004 Identity Registry\n');
  console.log('='.repeat(70));
  console.log('Signer:', signer.address);
  console.log('App:', APP);
  console.log('Identity:', IDENTITY);
  console.log('');
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // ============================================
  // STEP 1: Create Rule
  // ============================================
  console.log('📋 STEP 1: Create Rule');
  console.log('─'.repeat(70));
  
  try {
    const tx1 = await app.addRule(
      "https://www.moltbook.com/api/v1/agents/profile?name=*",
      "x_follower_count",
      "$.agent.owner.x_follower_count",
      0, 3600, "X follower validation"
    );
    console.log('Tx:', tx1.hash);
    await tx1.wait();
    console.log('✅ Rule 0 created!\n');
  } catch (e) {
    console.log('Rule exists or error:', e.message.split('\n')[0], '\n');
  }
  
  // ============================================
  // STEP 2: Add Check
  // ============================================
  console.log('📊 STEP 2: Add Check');
  console.log('─'.repeat(70));
  
  try {
    const params = hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [500]);
    const tx2 = await app.addCheck(0, CHECK, params, 98);
    console.log('Tx:', tx2.hash);
    await tx2.wait();
    console.log('✅ Check 0 added!\n');
  } catch (e) {
    console.log('Check exists or error:', e.message.split('\n')[0], '\n');
  }
  
  // ============================================
  // STEP 3: Request Validation
  // ============================================
  console.log('📤 STEP 3: Request Validation');
  console.log('─'.repeat(70));
  
  const Task = new hre.ethers.Contract(PRIMUS, ["function queryLatestFeeInfo(uint8) view returns (tuple(uint256 primusFee, uint256 attestorFee))"], signer);
  const feeInfo = await Task.queryLatestFeeInfo(0);
  const totalFee = feeInfo.primusFee.add(feeInfo.attestorFee);
  
  console.log('Fee:', hre.ethers.utils.formatEther(totalFee), 'ETH');
  console.log('Agent ID: 0 | Rule: 0 | Check: [0]\n');
  
  const tx3 = await app.requestValidation(0, 0, [0], 1, { value: totalFee });
  console.log('Tx sent:', tx3.hash);
  const receipt = await tx3.wait();
  
  console.log('\n' + '='.repeat(70));
  console.log('✅✅✅ VALIDATION REQUESTED SUCCESSFULLY! ✅✅✅');
  console.log('='.repeat(70));
  console.log('Block:', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed.toString());
  console.log('');
  console.log('Transaction Links:');
  console.log('  Request:', 'https://sepolia.basescan.org/tx/' + tx3.hash);
  console.log('  App:', 'https://sepolia.basescan.org/address/' + APP);
  console.log('  Registry:', 'https://sepolia.basescan.org/address/0xAeFdE0707014b6540128d3835126b53F073fEd40');
  console.log('');
  console.log('Next: Wait for Primus attestation callback!');
}

main().catch(console.error);
