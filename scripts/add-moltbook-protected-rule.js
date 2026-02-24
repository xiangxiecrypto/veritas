const hre = require("hardhat");

const APP = "0xaE7F684251dfA767e2Ed05AD3D4768B3E2935f4e";

async function main() {
  const [wallet] = await ethers.getSigners();
  
  const gasPrice = await ethers.provider.getGasPrice();
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP);
  
  // Add Rule for protected Moltbook API
  console.log('=== ADDING PROTECTED MOLTBOOK RULE ===\n');
  
  const ruleTx = await app.addRule(
    "https://www.moltbook.com/api/v1/agents/me",
    "karma",
    "$.agent.karma",
    0,
    3600,
    "Moltbook Protected Profile",
    { gasPrice: gasPrice.mul(3), gasLimit: 500000 }
  );
  
  await ruleTx.wait();
  
  const ruleCount = await app.ruleCount();
  const newRuleId = ruleCount.toNumber() - 1;
  
  console.log('✅ Rule added, ID:', newRuleId);
  console.log('   Tx:', ruleTx.hash);
  
  console.log('\n=== RULE DETAILS ===');
  console.log('URL: https://www.moltbook.com/api/v1/agents/me (PROTECTED)');
  console.log('Data Key: karma');
  console.log('Parse Path: $.agent.karma');
  console.log('Description: Moltbook Protected Profile');
  
  console.log('\n⚠️ NOTE: This requires Authorization header!');
  console.log('   Authorization: Bearer moltbook_sk_QejPOPNRIt1Xqk7Uoh0I9MXUl-XnyucE');
}

main().catch(console.error);
