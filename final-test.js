const { PrimusCoreTLS } = require("@primuslabs/zktls-core-sdk");
const { ethers } = require("hardhat");

const APP_ID = '0xd260f1ace82a81d1784d20a3cf38e94a17777374';
const APP_SECRET = '0x5d065922ad4742d567a9de666f4876d91238ef390af77463f74d683292e78304';
const VALIDATOR_ADDRESS = '0xdC26A7Bb3D658A1Ca16f4034B9731d4Cd48eD462';

const VALIDATOR_ABI = [
  "function validate(tuple(address recipient, tuple(string url, string header, string method, string body) request, tuple(string keyName, string parseType, string parsePath)[] responseResolves, string data, string attConditions, uint64 timestamp, string additionParams, tuple(address attestorAddr, string url)[] attestors, bytes[] signatures) attestation, uint256 ruleId) returns (bool)"
];

async function main() {
  console.log('\n========================================');
  console.log('  Veritas Neat - 最终验证');
  console.log('  ========================================\n');

  const [signer] = await ethers.getSigners();
  console.log('钱包地址:', signer.address);
  console.log('合约地址:', VALIDATOR_ADDRESS);
  console.log('');

  // 1. 生成 Attestation
  console.log('STEP 1: 生成 Attestation');
  console.log('----------------------------------------');
  
  const primus = new PrimusCoreTLS();
  await primus.init(APP_ID, APP_SECRET);
  
  const request = {
    url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
    method: 'GET',
    header: {},
    body: ''
  };
  
  const responseResolves = [{ keyName: 'price', parsePath: '$.price' }];

  const genRequest = primus.generateRequestParams(
    request, 
    responseResolves,
    signer.address
  );
  
  const attestation = await primus.startAttestation(genRequest);
  
  console.log('✅ Attestation 生成成功！');
  console.log('  Recipient:', attestation.recipient);
  console.log('  Data:', attestation.data);
  console.log('  Attestor:', attestation.attestors[0].attestorAddr);
  console.log('');

  // 2. 本地验证
  console.log('STEP 2: 本地验证');
  console.log('----------------------------------------');
  const verifyResult = primus.verifyAttestation(attestation);
  console.log('本地验证:', verifyResult ? '✅ 通过' : '❌ 失败');
  console.log('');

  // 3. 链上验证
  console.log('STEP 3: 链上验证');
  console.log('----------------------------------------');

  const validator = new ethers.Contract(VALIDATOR_ADDRESS, VALIDATOR_ABI, signer);

  const contractAttestation = {
    recipient: attestation.recipient,
    request: {
      url: attestation.request.url,
      header: attestation.request.header || '',
      method: attestation.request.method,
      body: attestation.request.body || ''
    },
    responseResolves: attestation.reponseResolve.map(r => ({
      keyName: r.keyName,
      parseType: r.parseType || 'JSON',
      parsePath: r.parsePath
    })),
    data: attestation.data,
    attConditions: attestation.attConditions,
    timestamp: Math.floor(attestation.timestamp / 1000),
    additionParams: attestation.additionParams,
    attestors: attestation.attestors.map(a => ({
      attestorAddr: a.attestorAddr,
      url: a.url
    })),
    signatures: attestation.signatures
  };

  console.log('发送交易...');
  
  try {
    const tx = await validator.validate(contractAttestation, 1);
    
    console.log('');
    console.log('交易哈希:');
    console.log(tx.hash);
    console.log('');
    console.log('BaseScan 交易链接:');
    console.log('https://sepolia.basescan.org/tx/' + tx.hash);
    console.log('');
    
    console.log('等待确认...');
    const receipt = await tx.wait();
    
    console.log('');
    console.log('✅ 交易已确认！');
    console.log('区块号:', receipt.blockNumber);
    console.log('Gas 使用:', receipt.gasUsed.toString());
    console.log('');
    console.log('合约链接:');
    console.log('https://sepolia.basescan.org/address/' + VALIDATOR_ADDRESS);
    
  } catch (error) {
    console.log('');
    console.log('❌ 错误:', error.message);
    if (error.data) {
      console.log('错误数据:', error.data);
    }
  }

  console.log('\n========================================');
}

main().catch(console.error);
