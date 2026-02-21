/**
 * Deploy App V4 only (Registry already deployed)
 */

const { ethers } = require('ethers');

const REGISTRY = '0x257DC4B38066840769EeA370204AD3724ddb0836';
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713';
const PRIMUS_TASK = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error('ERROR: PRIVATE_KEY not set');
    process.exit(1);
  }

  console.log('Deploying PrimusVeritasAppV4...\n');

  const provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
  const wallet = new ethers.Wallet(pk, provider);
  
  console.log(`Deployer: ${wallet.address}`);
  const balance = await wallet.getBalance();
  console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH\n`);

  const AppV4 = require('../artifacts/contracts/PrimusVeritasAppV4.sol/PrimusVeritasAppV4.json');

  const appFactory = new ethers.ContractFactory(AppV4.abi, AppV4.bytecode, wallet);
  const app = await appFactory.deploy(
    REGISTRY,
    PRIMUS_TASK,
    IDENTITY_REGISTRY,
    REPUTATION_REGISTRY
  );
  console.log(`Tx: ${app.deployTransaction.hash}`);
  await app.deployed();
  console.log(`✅ App: ${app.address}\n`);

  console.log('============================================================');
  console.log('DEPLOYMENT COMPLETE');
  console.log('============================================================');
  console.log(`\nRegistry: ${REGISTRY}`);
  console.log(`App:      ${app.address}\n`);
}

main().catch(console.error);
