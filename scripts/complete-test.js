const hre = require("hardhat");

async function main() {
  const APP = "0x4D7Ff64A76892fdacDc7ABB53a145dE019ceE1f4";
  const CHECK = "0xDebe3ddf4854b7198dd1DCcDFc70e920000D1E52";
  const PRIMUS = "0xC02234058caEaA9416506eABf6Ef3122fCA939E8";
  
  const [signer] = await hre.ethers.getSigners();
  
  console.log('🎯 COMPLETE TEST: Setup + Validation\n');
  console.log('='.repeat(70));
  
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
    console.log('Rule may exist:', e.message.split('\n')[0], '\n');
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
    console.log('Check may exist:', e.message.split('\n')[0], '\n');
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
  console.log('Agent: 0 | Rule: 0 | Check: [0]\n');
  
  const tx3 = await app.requestValidation(0, 0, [0], 1, { value: totalFee });
  console.log('Tx:', tx3.hash);
  const receipt = await tx3.wait();
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ VALIDATION REQUESTED SUCCESSFULLY!');
  console.log('='.repeat(70));
  console.log('Block:', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed.toString());
  console.log('Explorer: https://sepolia.basescan.org/tx/' + tx3.hash);
  console.log('\nTransaction Links:');
  console.log('  Validation: https://sepolia.basescan.org/tx/' + tx3.hash);
  console.log('  App: https://sepolia.basescan.org/address/' + APP);
}

main().catch(console.error);
