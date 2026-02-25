/**
 * @fileoverview Type definitions for Neat Veritas Protocol
 * @description Shared types for Neat Veritas SDK and contracts
 */

/**
 * Rule structure from RuleRegistry
 */
export interface NeatRule {
  id: bigint;
  name: string;
  description: string;
  checkContract: string;
  checkData: string;
  active: boolean;
  creator: string;
  createdAt: bigint;
}

/**
 * HTTP check data structure
 */
export interface NeatHTTPCheckData {
  expectedUrl: string;
  expectedMethod: string;
  minResponseCode: number;
  maxResponseCode: number;
  expectedDataPattern: string;
  validateParsePath: boolean;
}

/**
 * Validation result from VeritasValidator
 */
export interface NeatOnChainValidationResult {
  ruleId: bigint;
  passed: boolean;
  timestamp: bigint;
  recipient: string;
  validator: string;
}

/**
 * Attestation structure from Primus
 */
export interface NeatAttestation {
  recipient: string;
  request: {
    url: string;
    method: string;
    headers: string;
    body: string;
  };
  responseResolve: Array<{
    keyName: string;
    parseType: string;
    parsePath: string;
  }>;
  data: string;
  attConditions: string;
  timestamp: number;
  additionParams: string;
  attestors: Array<{
    attestorAddr: string;
    url: string;
  }>;
  signatures: string[];
}

/**
 * Contract addresses for deployment
 */
export interface NeatDeploymentAddresses {
  ruleRegistry: string;
  veritasValidator: string;
  httpCheck: string;
  primusZKTLS: string;
}

/**
 * Deployment configuration
 */
export interface NeatDeploymentConfig {
  network: string;
  deployer: string;
  initialAdmin: string;
}
