const { ethers } = require("ethers");

// 错误签名
const errorSig = '0xad9a682b';

// 常见错误签名
const commonErrors = [
  'Error(string)',
  'Panic(uint256)',
  'InvalidAttestation()',
  'InvalidSignature()',
  'AttestationExpired()',
  'InvalidRecipient()',
  'InvalidAttestor()',
  'VerificationFailed()',
  'RuleNotFound()',
  'AlreadyValidated()',
  'InvalidTimestamp()',
  'PrimusVerificationFailed()',
  'InvalidDataFormat()'
];

console.log('错误签名:', errorSig);
console.log('');

for (const error of commonErrors) {
  const sig = ethers.id(error).substring(0, 10);
  if (sig === errorSig) {
    console.log('✅ 匹配:', error);
    console.log('   签名:', sig);
  }
}

// 也尝试一些自定义错误
const customErrors = [
  'InvalidAttestation(address)',
  'InvalidSignature(bytes)',
  'AttestationExpired(uint256,uint256)',
  'VerificationFailed(string)'
];

console.log('\n自定义错误检查:');
for (const error of customErrors) {
  const sig = ethers.id(error).substring(0, 10);
  console.log(error, '->', sig);
}
