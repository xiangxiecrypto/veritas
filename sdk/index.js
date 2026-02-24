/**
 * @title Veritas SDK
 * @notice Easy-to-use SDK for Veritas validation system
 * @dev Wraps Primus SDK with agent registration and validation helpers
 * 
 * @example
 * const { VeritasSDK } = require('./sdk');
 * 
 * const sdk = new VeritasSDK();
 * await sdk.init(signer);
 * 
 * // Register agent
 * await sdk.registerAgent(1234);
 * 
 * // Create request and response resolve
 * const request = VeritasSDK.createRequest('https://api.example.com/data', {
 *   header: { 'Authorization': 'Bearer token' }
 * });
 * 
 * const responseResolves = VeritasSDK.createResponseResolve('value', '$.data.value');
 * 
 * // Validate (checkIds is optional - auto-runs all checks)
 * const result = await sdk.validate({
 *   agentId: 1234,
 *   ruleId: 0,
 *   request: request,
 *   responseResolves: responseResolves
 * });
 */

const { VeritasSDK } = require('./VeritasSDK');

module.exports = {
  VeritasSDK
};
