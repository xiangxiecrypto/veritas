/**
 * Deploy V4 - Reads PRIVATE_KEY directly
 */

const { ethers } = require('ethers');

const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713';
const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';

async function main() {
  const pk = process.env.PRIVATE_KEY || process.argv[2];
  
  if (!pk) {
    console.error('ERROR: No private key provided');
    console.error('Usage: node deploy-v4-direct.js 0x...');
    process.exit(1);
  }
  
  console.log('='.repeat(60));
  console.log('Deploying Veritas Protocol V4');
  console.log('='.repeat(60) + '\n');

  const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
  const wallet = new ethers.Wallet(pk, provider);
  
  console.log(`Deployer: ${wallet.address}`);
  
  const balance = await wallet.getBalance();
  console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH\n`);
  
  if (balance.lt(ethers.utils.parseEther('0.005'))) {
    console.error('ERROR: Insufficient balance. Need at least 0.01 ETH on Base Sepolia');
    console.error('Faucets:');
    console.error('  - https://faucet.circle.com/');
    console.error('  - https://www.alchemy.com/faucets/base-sepolia');
    process.exit(1);
  }

  const RegistryV4 = require('./artifacts/contracts/VeritasValidationRegistryV4.sol/VeritasValidationRegistryV4.json');
  const AppV4 = require('./artifacts/contracts/PrimusVeritasAppV4.sol/PrimusVeritasAppV4.json');

  // Deploy Registry
  console.log('Deploying VeritasValidationRegistryV4...');
  const registryFactory = new ethers.ContractFactory(RegistryV4.abi, RegistryV4.bytecode, wallet);
  const registry = await registryFactory.deploy(IDENTITY_REGISTRY);
  console.log(`  Tx: ${registry.deployTransaction.hash}`);
  await registry.deployed();
  console.log(`  ✅ Registry: ${registry.address}\n`);

  // Deploy App
  console.log('Deploying PrimusVeritasAppV4...');
  const appFactory = new ethers.ContractFactory(AppV4.abi, AppV4.bytecode, wallet);
  const app = await appFactory.deploy(
    registry.address,
    PRIMUS_TASK,
    IDENTITY_REGISTRY,
    REPUTATION_REGISTRY
  );
  console.log(`  Tx: ${app.deployTransaction.hash}`);
  await app.deployed();
  console.log(`  ✅ App: ${app.address}\n`);

  console.log('='.repeat(60));
  console.log('✅ DEPLOYMENT COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nRegistry: ${registry.address}`);
  console.log(`App:      ${app.address}\n`);
}

main().catch(console.error);
