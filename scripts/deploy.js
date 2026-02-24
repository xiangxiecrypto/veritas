/**
 * @title Deploy Veritas Contracts
 * @notice Deploy PrimusVeritasApp and check contracts
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log('════════════════════════════════════════════════════════════════');
  console.log('                VERITAS CONTRACT DEPLOYMENT                     ');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Deployer:', deployer.address);
  console.log('');

  // Deploy PrimusVeritasApp
  console.log('📦 Deploying PrimusVeritasApp...');
  const App = await hre.ethers.getContractFactory("PrimusVeritasApp");
  const app = await App.deploy(
    "0xC02234058caEaA9416506eABf6Ef3122fCA939E8",  // Primus TaskContract
    "0x8004B663056A597Dffe9eCcC1965A193B7388713",  // ReputationRegistry
    "0xAeFdE0707014b6540128d3835126b53F073fEd40"   // ValidationRegistry
  );
  await app.deployed();
  console.log('   ✅ PrimusVeritasApp:', app.address);
  console.log('');

  // Deploy SimpleVerificationCheck
  console.log('📦 Deploying SimpleVerificationCheck...');
  const SimpleCheck = await hre.ethers.getContractFactory("SimpleVerificationCheck");
  const simpleCheck = await SimpleCheck.deploy();
  await simpleCheck.deployed();
  console.log('   ✅ SimpleVerificationCheck:', simpleCheck.address);
  console.log('');

  // Deploy MoltbookKarmaCheck
  console.log('📦 Deploying MoltbookKarmaCheck...');
  const KarmaCheck = await hre.ethers.getContractFactory("MoltbookKarmaCheck");
  const karmaCheck = await KarmaCheck.deploy();
  await karmaCheck.deployed();
  console.log('   ✅ MoltbookKarmaCheck:', karmaCheck.address);
  console.log('');

  console.log('════════════════════════════════════════════════════════════════');
  console.log('                    ✅ DEPLOYMENT COMPLETE                      ');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Deployed Contracts:');
  console.log('   PrimusVeritasApp:', app.address);
  console.log('   SimpleVerificationCheck:', simpleCheck.address);
  console.log('   MoltbookKarmaCheck:', karmaCheck.address);
  console.log('');
  console.log('Next: Run setup-rules.js to configure rules and checks');
  console.log('');
}

main().catch(console.error);
