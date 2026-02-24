const hre = require("hardhat");

async function main() {
  const [wallet] = await hre.ethers.getSigners();
  const APP = "0xaE7F684251dfA767e2Ed05AD3D4768B3E2935f4e";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Get checks for both rules
  console.log('=== RULE 1 (BTC) CHECKS ===\n');
  const check1 = await app.checks(1, 0);
  console.log('Check 0:');
  console.log('  Contract:', check1.checkContract);
  console.log('  Score:', check1.score.toString());
  
  // Verify contract exists
  const code1 = await hre.ethers.provider.getCode(check1.checkContract);
  console.log('  Code exists:', code1.length > 2 ? '✅' : '❌');
  
  console.log('\n=== RULE 2 (MOLTBOOK) CHECKS ===\n');
  const check2 = await app.checks(2, 0);
  console.log('Check 0:');
  console.log('  Contract:', check2.checkContract);
  console.log('  Score:', check2.score.toString());
  
  // Verify contract exists
  const code2 = await hre.ethers.provider.getCode(check2.checkContract);
  console.log('  Code exists:', code2.length > 2 ? '✅' : '❌');
  
  // Test calling the check directly
  console.log('\n=== TESTING CHECK 2 DIRECTLY ===\n');
  
  const FollowerCheck = await hre.ethers.getContractFactory("FollowerThresholdCheck");
  const followerCheck = FollowerCheck.attach(check2.checkContract);
  
  // Test with encoded data
  const request = hre.ethers.utils.defaultAbiCoder.encode(
    [['tuple(string,string,string,string)']],
    [[['https://www.moltbook.com/api/v1/agents/profile?name=CilohPrimus', '', 'GET', '']]]
  );
  
  const responseResolve = hre.ethers.utils.defaultAbiCoder.encode(
    [['tuple(tuple(string,string,string)[])']],
    [[[[['x_followers', 'json', '$.agent.owner.x_follower_count']]]]]
  );
  
  console.log('Encoded request length:', request.length);
  console.log('Encoded responseResolve length:', responseResolve.length);
  
  try {
    const result = await followerCheck.validate(
      request,
      responseResolve,
      '{"x_followers":"1121"}',
      'https://www.moltbook.com/api/v1/agents/profile?name=*',
      'x_followers',
      '$.agent.owner.x_follower_count',
      '0x'
    );
    console.log('Direct call result:', result ? '✅ PASS' : '❌ FAIL');
  } catch (e) {
    console.log('Direct call error:', e.message);
  }
}

main().catch(console.error);
