import { ethers } from 'hardhat';

async function main() {
  const [signer] = await ethers.getSigners();
  console.log('部署者:', signer.address);
  
  const PRIMUS = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
  
  // 部署
  const RuleRegistry = await ethers.getContractFactory('RuleRegistry');
  const rr = await RuleRegistry.deploy();
  await rr.waitForDeployment();
  const rrAddr = await rr.getAddress();
  console.log('✅ RuleRegistry:', rrAddr);
  
  const HTTPCheck = await ethers.getContractFactory('HTTPCheck');
  const hc = await HTTPCheck.deploy();
  await hc.waitForDeployment();
  const hcAddr = await hc.getAddress();
  console.log('✅ HTTPCheck:', hcAddr);
  
  const Validator = await ethers.getContractFactory('VeritasValidator');
  const v = await Validator.deploy(rrAddr, PRIMUS);
  await v.waitForDeployment();
  const vAddr = await v.getAddress();
  console.log('✅ VeritasValidator:', vAddr);
  
  console.log('\n🔗 区块浏览器:');
  console.log('https://sepolia.basescan.org/address/' + vAddr);
}

main().catch(console.error);
