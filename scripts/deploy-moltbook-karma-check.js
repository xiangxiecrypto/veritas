const hre = require("hardhat");

const APP = "0xaE7F684251dfA767e2Ed05AD3D4768B3E2935f4e";
const RULE_ID = 3;

async function main() {
  const [wallet] = await ethers.getSigners();
  console.log('═══════════════════════════════════════════════════════');
  console.log('DEPLOYING MOLTBOOK KARMA CHECK');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Signer:', wallet.address);
  console.log('');
  
  const gasPrice = await ethers.provider.getGasPrice();
  
  // ========================================
  // STEP 1: Deploy MoltbookKarmaCheck
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: DEPLOY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const MoltbookKarmaCheck = await hre.ethers.getContractFactory("MoltbookKarmaCheck");
  
  console.log('\n📝 Deploying...');
  const check = await MoltbookKarmaCheck.deploy({
    gasPrice: gasPrice.mul(3),
    gasLimit: 2000000
  });
  
  await check.deployed();
  
  console.log('\n✅ Deployed!');
  console.log('   Address:', check.address);
  console.log('   Tx Hash:', check.deployTransaction.hash);
  
  // ========================================
  // STEP 2: Add to Rule 3
  // ========================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: ADD TO RULE 3');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  console.log('\n📝 Adding check to Rule', RULE_ID, '...');
  const addTx = await app.addCheck(RULE_ID, check.address, "0x", 100, {
    gasPrice: gasPrice.mul(3),
    gasLimit: 500000
  });
  
  await addTx.wait();
  
  console.log('\n✅ Check added!');
  console.log('   Tx Hash:', addTx.hash);
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ DEPLOYMENT COMPLETE!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📋 Summary:');
  console.log('   MoltbookKarmaCheck:', check.address);
  console.log('   Rule ID:', RULE_ID);
  console.log('   Check Validates:');
  console.log('     - URL matches: https://www.moltbook.com/api/v1/agents/me');
  console.log('     - dataKey matches: karma');
  console.log('     - parsePath matches: $.agent.karma');
  console.log('     - karma > 0 ✅');
}

main().catch(console.error);
