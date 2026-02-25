/**
 * @fileoverview Type definitions for Neat Veritas Protocol
 * @description Shared types for SDK and contracts - aligned with contract structures
 */

/**
 * Rule structure (matches RuleRegistry.Rule)
 */
export interface Rule {
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
 * HTTP check data structure (matches HTTPCheck.HTTPCheckData)
 */
export interface HTTPCheckData {
  expectedUrl: string;
  expectedMethod: string;
  minResponseCode: number;
  maxResponseCode: number;
  expectedDataPattern: string;
  validateParsePath: boolean;
}

/**
 * Validation result (matches VeritasValidator.ValidationResult)
 */
export interface ValidationResult {
  ruleId: bigint;
  passed: boolean;
  timestamp: bigint;
  recipient: string;
  validator: string;
  attestationHash: string;
}

/**
 * Attestation structure (matches IPrimusZKTLS.Attestation)
 */
export interface Attestation {
  recipient: string;
  request: {
    url: string;
    header: string;
    method: string;
    body: string;
  };
  reponseResolve: Array<{
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
export interface DeploymentAddresses {
  ruleRegistry: string;
  veritasValidator: string;
  httpCheck: string;
  primusZKTLS: string;
}

/**
 * Deployment configuration
 */
export interface DeploymentConfig {
  network: string;
  deployer: string;
  initialAdmin: string;
}
