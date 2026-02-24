const hre = require("hardhat");

async function main() {
  const [wallet] = await ethers.getSigners();
  const APP = "0xaE7F684251dfA767e2Ed05AD3D4768B3E2935f4e";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Get Rule 1
  console.log('═══════════════════════════════════════════════════════');
  console.log('RULE 1: BTC PRICE VERIFICATION');
  console.log('═══════════════════════════════════════════════════════\n');
  const rule1 = await app.rules(1);
  console.log('URL:', rule1.url);
  console.log('Data Key:', rule1.dataKey);
  console.log('Parse Path:', rule1.parsePath);
  console.log('Description:', rule1.description);
  console.log('Max Age:', rule1.maxAge.toString(), 'seconds (1 hour)');
  console.log('Active:', rule1.active);
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('CHECK 0: SimpleVerificationCheck');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const check0 = await app.checks(1, 0);
  console.log('Contract Address:', check0.checkContract);
  console.log('Contract Type: SimpleVerificationCheck ✅');
  console.log('Score:', check0.score.toString(), '/ 100');
  console.log('Params:', check0.params.length > 2 ? 'Custom params' : 'None');
  
  console.log('\n📝 What Check 0 Validates:');
  console.log('   1. hash(request[0].url) == hash(rule.url) ✅');
  console.log('   2. responseResolve[0].keyName == rule.dataKey ✅');
  console.log('   3. hash(responseResolve[0].parsePath) == hash(rule.parsePath) ✅');
  console.log('   4. attestation.data contains dataKey ✅');
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('RULE 2: MOLTBOOK X FOLLOWERS (for comparison)');
  console.log('═══════════════════════════════════════════════════════\n');
  const rule2 = await app.rules(2);
  console.log('URL:', rule2.url);
  console.log('Data Key:', rule2.dataKey);
  console.log('Parse Path:', rule2.parsePath);
  console.log('Description:', rule2.description);
  
  const check2_0 = await app.checks(2, 0);
  console.log('\nCheck 0:');
  console.log('  Contract:', check2_0.checkContract);
  console.log('  Type: FollowerThresholdCheck ✅');
  console.log('  Score:', check2_0.score.toString());
  console.log('  Validates: follower_count >= 500');
}

main().catch(console.error);
