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
 * // Validate BTC price
 * const result = await sdk.validateBTCPrice(1234);
 * 
 * // Validate Moltbook karma
 * const result = await sdk.validateMoltbookKarma(1234, 'your-api-key');
 */

const { VeritasSDK } = require('./VeritasSDK');

module.exports = {
  VeritasSDK
};
