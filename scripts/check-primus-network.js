// Check how PrimusNetwork maps object to positional params
const { PrimusNetwork } = require('@primuslabs/network-core-sdk');

// Look at the PrimusNetwork class source
const primusModule = require('@primuslabs/network-core-sdk');

console.log('PrimusNetwork methods:');
console.log(Object.getOwnPropertyNames(PrimusNetwork.prototype));
console.log('');

// The submitTask in PrimusNetwork probably does something like:
// this.taskContract.submitTask(params.address, params.templateId, ...)
// But maybe it's NOT passing callbackAddress!

console.log('Checking if PrimusNetwork.submitTask forwards callbackAddress...');
console.log('');
console.log('Expected flow:');
console.log('  User calls: primus.submitTask({ address, templateId, callbackAddress })');
console.log('  PrimusNetwork should call: this.taskContract.submitTask(address, templateId, ..., callbackAddress)');
console.log('');
console.log('If PrimusNetwork doesnt extract callbackAddress from the object,');
console.log('TaskContract.submitTask() uses default value 0x0000...');
