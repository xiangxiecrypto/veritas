const hre = require("hardhat");

async function main() {
  const [wallet] = await ethers.getSigners();
  const reportTxHash = "0x9246e3a9096cc1a49ed7f1bd844934521f29fac8ba9388e540f397776740b8da";
  
  const receipt = await hre.ethers.provider.getTransactionReceipt(reportTxHash);
  
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = App.attach("0xaE7F684251dfA767e2Ed05AD3D4768B3E2935f4e");
  
  console.log('=== PARSING EVENTS ===\n');
  
  for (const log of receipt.logs) {
    try {
      // Try parsing with our app interface
      const parsed = app.interface.parseLog({ topics: log.topics, data: log.data });
      
      console.log('Event:', parsed.name);
      console.log('Address:', log.address);
      
      if (parsed.name === 'CheckPassed') {
        console.log('  Rule ID:', parsed.args.ruleId.toString());
        console.log('  Check ID:', parsed.args.checkId.toString());
        console.log('  Score:', parsed.args.score.toString());
      }
      
      if (parsed.name === 'ValidationCompleted') {
        console.log('  Agent ID:', parsed.args.agentId.toString());
        console.log('  Total Score:', parsed.args.totalScore.toString());
        console.log('  Max Score:', parsed.args.maxScore.toString());
        console.log('  Normalized Score:', parsed.args.normalizedScore.toString());
      }
      
      console.log('');
    } catch (e) {
      // Not our event
    }
  }
  
  // Check registry
  console.log('=== REGISTRY SCORE ===');
  const Registry = await hre.ethers.getContractFactory("VeritasValidationRegistry");
  const registry = Registry.attach("0xAeFdE0707014b6540128d3835126b53F073fEd40");
  
  const agentId = 1018;
  const totalScore = await registry.getTotalScore(agentId);
  const validationCount = await registry.getValidationCount(agentId);
  
  console.log('Agent ID:', agentId);
  console.log('Total Score:', totalScore.toString());
  console.log('Validation Count:', validationCount.toString());
  
  if (validationCount.gt(0)) {
    const validation = await registry.getValidation(agentId, validationCount.sub(1));
    console.log('\nLatest Validation:');
    console.log('  Rule ID:', validation.ruleId.toString());
    console.log('  Score:', validation.score.toString());
    console.log('  Timestamp:', new Date(validation.timestamp.toNumber() * 1000).toISOString());
  }
}

main().catch(console.error);
