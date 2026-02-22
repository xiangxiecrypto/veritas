const hre = require("hardhat");

async function main() {
  console.log('\n🎯 Setting Up Generic Validation System\n');
  console.log('='.repeat(70));
  
  const APP_ADDRESS = "0xA1ea3a656962574C3c6f7840de4e6C45FE26B8A0";
  const CHECK_ADDRESS = "0xDebe3ddf4854b7198dd1DCcDFc70e920000D1E52";
  
  const [signer] = await hre.ethers.getSigners();
  console.log('Signer:', signer.address);
  console.log('Balance:', hre.ethers.utils.formatEther(await signer.getBalance()), 'ETH');
  console.log('');
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP_ADDRESS);
  
  // ============================================
  // STEP 1: Create Rule (with template URL)
  // ============================================
  console.log('📋 STEP 1: Create Rule');
  console.log('─'.repeat(70));
  
  console.log('\nAdding rule:');
  console.log('  URL Template: https://www.moltbook.com/api/v1/agents/profile?name=*');
  console.log('  Data Key: x_follower_count');
  console.log('  Parse Path: $.agent.owner.x_follower_count');
  
  const tx1 = await app.addRule(
    "https://www.moltbook.com/api/v1/agents/profile?name=*",  // url (template with *)
    "x_follower_count",                                        // dataKey
    "$.agent.owner.x_follower_count",                          // parsePath
    0,                                                         // decimals
    3600,                                                      // maxAge (1 hour)
    "X/Twitter follower validation"                            // description
  );
  
  console.log('\nTx sent:', tx1.hash);
  const receipt1 = await tx1.wait();
  console.log('✅ Rule created! (Rule ID: 0)');
  console.log('   Block:', receipt1.blockNumber);
  console.log('   Gas used:', receipt1.gasUsed.toString());
  console.log('');
  
  // ============================================
  // STEP 2: Add Check (generic threshold)
  // ============================================
  console.log('📊 STEP 2: Add Check');
  console.log('─'.repeat(70));
  
  // Params: just the threshold (500 followers)
  const checkParams = hre.ethers.utils.defaultAbiCoder.encode(
    ['uint256'],
    [500]  // minFollowers threshold
  );
  
  console.log('\nAdding check:');
  console.log('  Rule ID: 0');
  console.log('  Check Contract:', CHECK_ADDRESS);
  console.log('  Threshold: 500 followers');
  console.log('  Score: 98 (if threshold met)');
  
  const tx2 = await app.addCheck(
    0,                  // ruleId
    CHECK_ADDRESS,      // checkContract
    checkParams,        // params (just threshold)
    98                  // score
  );
  
  console.log('\nTx sent:', tx2.hash);
  const receipt2 = await tx2.wait();
  console.log('✅ Check added! (Check ID: 0)');
  console.log('   Block:', receipt2.blockNumber);
  console.log('   Gas used:', receipt2.gasUsed.toString());
  console.log('');
  
  // ============================================
  // STEP 3: Show Example Verification Request
  // ============================================
  console.log('📤 STEP 3: Example Verification Request');
  console.log('─'.repeat(70));
  console.log('\nTo verify an agent, call:');
  console.log('');
  console.log('  app.requestVerification(');
  console.log('    "https://www.moltbook.com/api/v1/agents/profile?name=CilohPrimus",');
  console.log('    0,      // ruleId');
  console.log('    [0],    // checkIds');
  console.log('    { value: ethers.utils.parseEther("0.00000001") }');
  console.log('  );');
  console.log('');
  console.log('This will:');
  console.log('  1. Submit attestation request to Primus');
  console.log('  2. Fetch https://...?name=CilohPrimus');
  console.log('  3. Extract x_follower_count = 1121');
  console.log('  4. Verify URL matches template + "CilohPrimus"');
  console.log('  5. Verify dataKey and parsePath');
  console.log('  6. Check: 1121 >= 500 → TRUE');
  console.log('  7. Score: 98/100');
  console.log('');
  
  console.log('='.repeat(70));
  console.log('✅ Setup Complete!\n');
  console.log('Summary:');
  console.log('  Rule 0: Moltbook X Followers (template URL)');
  console.log('  Check 0: >= 500 followers = 98 score');
  console.log('');
  console.log('Contract addresses:');
  console.log('  PrimusVeritasApp:', APP_ADDRESS);
  console.log('  FollowerThresholdCheck:', CHECK_ADDRESS);
  console.log('  Explorer: https://sepolia.basescan.org/address/' + APP_ADDRESS);
}

main().catch(console.error);
