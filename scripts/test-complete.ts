/**
 * @fileoverview 完整的 Veritas 测试 - 自动执行所有步骤
 */

import { ethers } from 'hardhat';

async function main() {
  console.log('\n========================================');
  console.log('  Veritas Neat - 完整测试');
  console.log('  ========================================\n');

  const PRIMUS_ZKTLS_ADDRESS = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
  
  const [deployer] = await ethers.getSigners();
  
  console.log('📊 测试配置:');
  console.log('  部署者:', deployer.address);
  console.log('  余额:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH');
  console.log('  网络: Base Sepolia');
  console.log('  Primus ZKTLS:', PRIMUS_ZKTLS_ADDRESS);
  console.log('');

  // ========================================
  // 步骤 1: 部署合约
  // ========================================
  console.log('📦 步骤 1/5: 部署合约');
  console.log('======================================\n');

  // 部署 RuleRegistry
  console.log('  部署 RuleRegistry...');
  const RuleRegistry = await ethers.getContractFactory('RuleRegistry');
  const ruleRegistry = await RuleRegistry.deploy();
  await ruleRegistry.waitForDeployment();
  const ruleRegistryAddress = await ruleRegistry.getAddress();
  console.log('  ✅ RuleRegistry:', ruleRegistryAddress);

  // 部署 HTTPCheck
  console.log('  部署 HTTPCheck...');
  const HTTPCheck = await ethers.getContractFactory('HTTPCheck');
  const httpCheck = await HTTPCheck.deploy();
  await httpCheck.waitForDeployment();
  const httpCheckAddress = await httpCheck.getAddress();
  console.log('  ✅ HTTPCheck:', httpCheckAddress);

  // 部署 VeritasValidator
  console.log('  部署 VeritasValidator...');
  const VeritasValidator = await ethers.getContractFactory('VeritasValidator');
  const validator = await VeritasValidator.deploy(
    ruleRegistryAddress,
    PRIMUS_ZKTLS_ADDRESS
  );
  await validator.waitForDeployment();
  const validatorAddress = await validator.getAddress();
  console.log('  ✅ VeritasValidator:', validatorAddress);
  console.log('');

  // ========================================
  // 步骤 2: 创建规则
  // ========================================
  console.log('📝 步骤 2/5: 创建验证规则');
  console.log('======================================\n');

  // 规则 1: CoinGecko
  console.log('  创建规则 1: CoinGecko API...');
  const checkData1 = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string', 'uint256', 'uint256', 'bytes', 'bool'],
    ['https://api.coingecko.com/api/v3/*', 'GET', 200, 299, ethers.toUtf8Bytes('usd'), true]
  );
  
  const tx1 = await ruleRegistry.createRule(
    'CoinGecko - ETH Price',
    'Verify Ethereum price from CoinGecko',
    httpCheckAddress,
    checkData1
  );
  const receipt1 = await tx1.wait();
  console.log('  ✅ 规则 1 已创建 (ID: 1)');
  console.log('     Gas 使用:', receipt1?.gasUsed.toString());

  // 规则 2: Binance
  console.log('  创建规则 2: Binance API...');
  const checkData2 = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string', 'uint256', 'uint256', 'bytes', 'bool'],
    ['https://api.binance.com/api/v3/*', 'GET', 200, 299, ethers.toUtf8Bytes('price'), true]
  );
  
  const tx2 = await ruleRegistry.createRule(
    'Binance - BTC Price',
    'Verify Bitcoin price from Binance',
    httpCheckAddress,
    checkData2
  );
  const receipt2 = await tx2.wait();
  console.log('  ✅ 规则 2 已创建 (ID: 2)');
  console.log('     Gas 使用:', receipt2?.gasUsed.toString());
  console.log('');

  // ========================================
  // 步骤 3: 准备测试数据
  // ========================================
  console.log('🔧 步骤 3/5: 准备测试数据');
  console.log('======================================\n');

  // 模拟 attestation 数据（真实测试需要 zktls-core-sdk）
  const mockAttestation = {
    recipient: deployer.address,
    request: {
      url: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      method: 'GET',
      header: '',
      body: ''
    },
    reponseResolve: [{
      keyName: 'ethPrice',
      parseType: 'JSON',
      parsePath: '$.ethereum.usd'
    }],
    data: JSON.stringify({ ethereum: { usd: 3500.50 } }),
    attConditions: '',
    timestamp: Math.floor(Date.now() / 1000),
    additionParams: '',
    attestors: [{
      attestorAddr: '0x1234567890123456789012345678901234567890',
      url: 'https://attestor.primuslabs.xyz'
    }],
    signatures: ['0x' + '00'.repeat(65)]
  };

  console.log('  Attestation 数据已准备');
  console.log('  URL:', mockAttestation.request.url);
  console.log('');

  // ========================================
  // 步骤 4: 链上验证
  // ========================================
  console.log('🔐 步骤 4/5: 链上验证');
  console.log('======================================\n');

  console.log('  ⚠️  注意: 真实验证需要 Primus zktls-core-sdk 签名');
  console.log('  当前使用模拟数据进行测试\n');

  try {
    console.log('  尝试验证 attestation...');
    const validateTx = await validator.validate(mockAttestation, 1);
    const validateReceipt = await validateTx.wait();
    
    console.log('  ✅ 验证成功！');
    console.log('     Gas 使用:', validateReceipt?.gasUsed.toString());
    
    // 获取交易哈希
    const txHash = validateTx.hash;
    console.log('     交易哈希:', txHash);
    console.log('     区块浏览器: https://sepolia.basescan.org/tx/' + txHash);
    
  } catch (error: any) {
    console.log('  ❌ 验证失败:', error.message);
    console.log('  这是预期的，因为使用的是模拟签名');
  }
  console.log('');

  // ========================================
  // 步骤 5: 总结报告
  // ========================================
  console.log('📊 步骤 5/5: 测试总结');
  console.log('======================================\n');

  console.log('✅ 部署的合约:');
  console.log('  RuleRegistry:     ', ruleRegistryAddress);
  console.log('  HTTPCheck:        ', httpCheckAddress);
  console.log('  VeritasValidator: ', validatorAddress);
  console.log('');

  console.log('✅ 创建的规则:');
  console.log('  1. CoinGecko - ETH Price (GET)');
  console.log('  2. Binance - BTC Price (GET)');
  console.log('');

  console.log('📝 区块浏览器链接:');
  console.log('  RuleRegistry:     ', `https://sepolia.basescan.org/address/${ruleRegistryAddress}`);
  console.log('  HTTPCheck:        ', `https://sepolia.basescan.org/address/${httpCheckAddress}`);
  console.log('  VeritasValidator: ', `https://sepolia.basescan.org/address/${validatorAddress}`);
  console.log('');

  console.log('📋 下一步:');
  console.log('  1. 在真实环境中使用 Primus zktls-core-sdk');
  console.log('  2. 生成真实的 attestation');
  console.log('  3. 验证并查看交易');
  console.log('');

  console.log('========================================');
  console.log('  测试完成！');
  console.log('  ========================================\n');

  // 返回地址供后续使用
  return {
    ruleRegistry: ruleRegistryAddress,
    httpCheck: httpCheckAddress,
    validator: validatorAddress
  };
}

main()
  .then((addresses) => {
    console.log('\n📝 合约地址已保存:');
    console.log(JSON.stringify(addresses, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  });
