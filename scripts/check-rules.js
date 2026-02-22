const hre = require("hardhat");

async function main() {
  const APP_ADDRESS = "0xe413aa874A5E4043F9Fe7139Ac702Cd9Ba33046b";
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach(APP_ADDRESS);
  
  console.log("=== Current Rules and Checks ===");
  console.log("Contract:", APP_ADDRESS);
  console.log("");
  
  // Get rule count
  const ruleCount = await app.ruleCount();
  console.log("Total rules:", ruleCount.toString());
  console.log("");
  
  // Get each rule
  for (let i = 0; i < ruleCount.toNumber(); i++) {
    console.log(`--- Rule ${i} ---`);
    const rule = await app.rules(i);
    console.log("  URL:", rule.url);
    console.log("  Data Key:", rule.dataKey);
    console.log("  Parse Path:", rule.parsePath);
    console.log("  Decimals:", rule.decimals);
    console.log("  Max Age:", rule.maxAge.toString(), "seconds");
    console.log("  Active:", rule.active);
    console.log("  Description:", rule.description);
    console.log("  Rule Hash:", rule.ruleHash);
    
    // Get checks for this rule
    const checkCount = await app.checkCount(i);
    console.log("  Checks:", checkCount.toString());
    
    for (let j = 0; j < checkCount.toNumber(); j++) {
      const check = await app.checks(i, j);
      console.log(`    Check ${j}:`);
      console.log("      Contract:", check.checkContract);
      console.log("      Score:", check.score.toString());
      console.log("      Active:", check.active);
    }
    console.log("");
  }
  
  if (ruleCount.eq(0)) {
    console.log("No rules have been added yet.");
    console.log("");
    console.log("To add a rule, you can:");
    console.log("  1. Call app.addRule(url, dataKey, parsePath, decimals, maxAge, description)");
    console.log("  2. Then add checks with app.addCheck(ruleId, checkContract, params, score)");
  }
}

main().catch(console.error);
