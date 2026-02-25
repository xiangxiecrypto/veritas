const { ethers } = require("ethers");

// 错误签名
const errorSig = '0x6a5256fe';

// 可能的错误
const possibleErrors = [
  'PrimusVerificationFailed()',
  'CheckValidationFailed()',
  'RuleNotFound(uint256)',
  'RuleNotActive(uint256)',
  'AlreadyValidated(bytes32)',
  'UnauthorizedRecipient(address,address)',
  'Error(string)',
  'Panic(uint256)'
];

console.log('解码错误签名:', errorSig);
console.log('');

for (const error of possibleErrors) {
  try {
    const sig = ethers.id(error).substring(0, 10);
    if (sig === errorSig) {
      console.log('✅ 匹配:', error);
      console.log('   签名:', sig);
    }
  } catch (e) {
    // 忽略编码错误
  }
}

// 也检查自定义错误
console.log('\n检查自定义错误:');
const customErrors = [
  'PrimusVerificationFailed()',
  'CheckValidationFailed()',
  'UnauthorizedRecipient(address,address)',
  'AlreadyValidated(bytes32)',
  'RuleNotFound(uint256)',
  'RuleNotActive(uint256)'
];

for (const error of customErrors) {
  try {
    const sig = ethers.id(error).substring(0, 10);
    console.log(error, '->', sig, sig === errorSig ? '✅' : '');
  } catch (e) {
    console.log(error, '-> 编码失败');
  }
}
