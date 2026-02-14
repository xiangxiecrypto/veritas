const hre = require("hardhat");

/**
 * Example: Complete verification workflow with VeritasApp
 * 
 * This shows the simplified user flow:
 * 1. User calls requestVerification (1 transaction)
 * 2. User runs zkTLS off-chain
 * 3. User calls completeVerification (or automated)
 * 
 * That's it! Reputation granted automatically.
 */

const APP_ADDRESS = "0x..."; // Replace with deployed app address

async function main() {
  console.log("🔬 VeritasApp Example Usage\n");

  const [wallet] = await hre.ethers.getSigners();
  const app = await hre.ethers.getContractAt("VeritasApp", APP_ADDRESS);

  console.log(`Wallet: ${wallet.address}\n`);

  // Example 1: Verify BTC Price
  console.log("📊 Example 1: Verify BTC Price\n");

  // Step 1: Request verification (SINGLE transaction!)
  console.log("Step 1: Requesting verification...");
  const ruleId = 0; // BTC price rule
  const agentId = 1; // Your agent ID
  
  const requestTx = await app.requestVerification(
    ruleId,
    agentId,
    { value: hre.ethers.utils.parseEther("0.001") } // Task fee
  );
  
  const receipt = await requestTx.wait();
  
  // Extract taskId from event
  const event = receipt.events.find(e => e.event === "VerificationRequested");
  const taskId = event.args.taskId;
  
  console.log(`✅ Verification requested!`);
  console.log(`   Task ID: ${taskId}`);
  console.log(`   Tx: ${requestTx.hash}`);

  // Step 2: Run zkTLS off-chain (this is done by Primus SDK)
  console.log("\nStep 2: Running zkTLS (off-chain)...");
  console.log("   User interacts with attestor...");
  console.log("   Primus submits attestation on-chain...");
  
  // In reality, this is:
  // await primusSdk.runAttestation(taskId);
  // The attestation is automatically submitted to Primus TaskContract

  // Step 3: Complete verification (can be automated)
  console.log("\nStep 3: Completing verification...");
  
  // Wait for attestation to be on-chain
  // In production, you'd listen for Primus events
  
  const completeTx = await app.completeVerification(taskId);
  const completeReceipt = await completeTx.wait();
  
  const completeEvent = completeReceipt.events.find(e => e.event === "VerificationCompleted");
  
  console.log(`✅ Verification complete!`);
  console.log(`   Agent: ${completeEvent.args.agentId}`);
  console.log(`   Rule: ${completeEvent.args.ruleId}`);
  console.log(`   Score: ${completeEvent.args.score}`);
  console.log(`   Tx: ${completeTx.hash}`);

  // Example 2: Multiple verifications
  console.log("\n\n📊 Example 2: Batch Verification\n");
  
  // Verify multiple rules in one session
  const rules = [
    { ruleId: 0, description: "BTC Price" },
    { ruleId: 1, description: "ETH Price" }
  ];

  for (const rule of rules) {
    console.log(`Verifying: ${rule.description}`);
    
    const tx = await app.requestVerification(rule.ruleId, agentId, {
      value: hre.ethers.utils.parseEther("0.001")
    });
    
    const r = await tx.wait();
    const e = r.events.find(ev => ev.event === "VerificationRequested");
    
    console.log(`  ✅ Requested (taskId: ${e.args.taskId})`);
    
    // In production, you'd run zkTLS for each
    // await primusSdk.runAttestation(e.args.taskId);
    
    // Then complete each
    // await app.completeVerification(e.args.taskId);
  }

  console.log("\n✅ All verifications complete!");
  console.log("\n💡 Reputation automatically accumulated from multiple sources!");

  // Example 3: Check rules
  console.log("\n\n📊 Example 3: Query Available Rules\n");
  
  const ruleCount = await app.ruleCount();
  console.log(`Total rules: ${ruleCount}\n`);
  
  for (let i = 0; i < ruleCount; i++) {
    const rule = await app.getRule(i);
    if (rule.active) {
      console.log(`Rule ${i}: ${rule.description}`);
      console.log(`  URL: ${rule.url}`);
      console.log(`  Data Key: ${rule.dataKey}`);
      console.log(`  Score: ${rule.reputationScore}`);
      console.log(`  Max Age: ${rule.maxAgeSeconds} seconds`);
      console.log(`  Active: ${rule.active}\n`);
    }
  }

  // Benefits
  console.log("\n🌟 Benefits of VeritasApp Architecture:");
  console.log("  ✅ Single transaction to start verification");
  console.log("  ✅ Configurable rules (URL, score, freshness)");
  console.log("  ✅ Multiple rules for different use cases");
  console.log("  ✅ Automated reputation granting");
  console.log("  ✅ Community can create specialized apps");
  console.log("  ✅ Flexible ecosystem with multiple app contracts");
}

main().catch(console.error);
