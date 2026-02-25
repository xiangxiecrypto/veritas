import { ethers } from 'hardhat';

async function main() {
  console.log('\n========================================');
  console.log('  zktls + validate 完整测试');
  console.log('  ========================================\n');

  const PRIMUS_ZKTLS = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
  const [signer] = await ethers.getSigners();
  
  console.log('📍 步骤 1: 部署合约');
  console.log('======================================\n');
  
  // 部署所有合约
  const RuleRegistry = await ethers.getContractFactory('RuleRegistry');
  const ruleRegistry = await RuleRegistry.deploy();
  await ruleRegistry.waitForDeployment();
  const rrAddr = await ruleRegistry.getAddress();
  console.log('✅ RuleRegistry:', rrAddr);
  
  const HTTPCheck = await ethers.getContractFactory('HTTPCheck');
  const httpCheck = await HTTPCheck.deploy();
  await httpCheck.waitForDeployment();
  const hcAddr = await httpCheck.getAddress();
  console.log('✅ HTTPCheck:', hcAddr);
  
  const Validator = await ethers.getContractFactory('VeritasValidator');
  const validator = await Validator.deploy(rrAddr, PRIMUS_ZKTLS);
  await validator.waitForDeployment();
  const vAddr = await validator.getAddress();
  console.log('✅ VeritasValidator:', vAddr);
  console.log('');
  
  console.log('🔗 合约链接:');
  console.log('https://sepolia.basescan.org/address/' + vAddr);
  console.log('');
  
  console.log('📍 步骤 2: 创建验证规则');
  console.log('======================================\n');
  
  // 创建 CoinGecko 规则
  const checkData1 = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string', 'uint256', 'uint256', 'bytes', 'bool'],
    ['https://api.coingecko.com/api/v3/*', 'GET', 200, 299, ethers.toUtf8Bytes('usd'), true]
  );
  
  const tx1 = await ruleRegistry.createRule(
    'CoinGecko ETH Price',
    'Verify ETH price',
    hcAddr,
    checkData1
  );
  const r1 = await tx1.wait();
  console.log('✅ 规则 1 已创建: CoinGecko ETH Price');
  console.log('   Gas:', r1?.gasUsed.toString());
  console.log('   TX:', tx1.hash);
  console.log('   链接: https://sepolia.basescan.org/tx/' + tx1.hash);
  console.log('');
  
  console.log('📍 步骤 3: zktls - 调用真实 API');
  console.log('======================================\n');
  
  console.log('⚠️  注意: 完整的 zktls 需要 Primus SDK 签名');
  console.log('   当前使用模拟数据进行测试\n');
  
  // 模拟 zktls 结果
  const mockAttestation = {
    recipient: signer.address,
    request: {
      url: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      method: 'GET',
      header: '',
      body: ''
    },
    reponseResolve: [{
      keyName: 'price',
      parseType: 'JSON',
      parsePath: '$.ethereum.usd'
    }],
    data: '{"ethereum":{"usd":3500.50}}',
    attConditions: '',
    timestamp: Math.floor(Date.now() / 1000),
    additionParams: '',
    attestors: [{
      attestorAddr: '0x1234567890123456789012345678901234567890',
      url: 'https://attestor.primuslabs.xyz'
    }],
    signatures: ['0x' + '00'.repeat(65)]
  };
  
  console.log('zktls 结果:');
  console.log('  API:', mockAttestation.request.url);
  console.log('  数据:', mockAttestation.data);
  console.log('');
  
  console.log('📍 步骤 4: validate - 链上验证');
  console.log('======================================\n');
  
  try {
    const vTx = await validator.validate(mockAttestation, 1);
    const vReceipt = await vTx.wait();
    
    console.log('✅ 验证成功！');
    console.log('   Gas 使用:', vReceipt?.gasUsed.toString());
    console.log('   交易哈希:', vTx.hash);
    console.log('   链接: https://sepolia.basescan.org/tx/' + vTx.hash);
    console.log('');
    
  } catch (error: any) {
    console.log('⚠️  验证失败（预期）:', error.message?.substring(0, 100));
    console.log('   原因: 需要真实的 Primus 签名');
    console.log('');
  }
  
  console.log('========================================');
  console.log('  测试完成');
  console.log('  ========================================\n');
  
  console.log('📋 总结:');
  console.log('  ✅ 合约已部署');
  console.log('  ✅ 规则已创建');
  console.log('  ✅ zktls 流程已演示');
  console.log('  ⚠️  完整验证需要真实 Primus 签名');
  console.log('');
  
  console.log('🔗 所有链接:');
  console.log('  Validator: https://sepolia.basescan.org/address/' + vAddr);
  console.log('  规则创建: https://sepolia.basescan.org/tx/' + tx1.hash);
  console.log('');
}

main().catch(console.error);
