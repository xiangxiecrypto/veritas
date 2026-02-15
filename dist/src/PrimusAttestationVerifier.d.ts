import { ethers } from 'ethers';
/**
 * Primus Attestation Verifier
 *
 * Standard verification SDK for validating Primus zkTLS attestations.
 * Use this to verify attestations before trusting the data.
 */
export interface AttestationVerificationResult {
    valid: boolean;
    attestor: string;
    isValidAttestor: boolean;
    apiUrl: string;
    extractedData: Record<string, any>;
    timestamp: number;
    age: number;
    signatureValid: boolean;
    errors: string[];
    warnings: string[];
}
export interface AttestationVerificationConfig {
    /** Maximum age of attestation in milliseconds (default: 24 hours) */
    maxAgeMs?: number;
    /** Expected API URL (optional - if provided, will verify match) */
    expectedApiUrl?: string;
    /** Required data keys that must be present (optional) */
    requiredDataKeys?: string[];
    /** Custom attestor whitelist (optional - if not provided, uses on-chain query) */
    allowedAttestors?: string[];
}
/**
 * Standard Primus Attestation Verifier
 *
 * This class provides comprehensive verification of Primus attestations
 * before they should be trusted for reputation, validation, or other purposes.
 *
 * @example
 * ```typescript
 * const verifier = new PrimusAttestationVerifier(provider);
 *
 * const result = await verifier.verify(attestationResult, {
 *   maxAgeMs: 3600000,  // 1 hour
 *   expectedApiUrl: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
 *   requiredDataKeys: ['btcPrice']
 * });
 *
 * if (result.valid) {
 *   console.log('Attestation is valid!');
 *   console.log('BTC Price:', result.extractedData.btcPrice);
 * } else {
 *   console.error('Verification failed:', result.errors);
 * }
 * ```
 */
export declare class PrimusAttestationVerifier {
    private provider;
    private knownAttestors;
    private lastAttestorUpdate;
    private readonly ATTESTOR_CACHE_TTL;
    constructor(provider: ethers.providers.Provider);
    /**
     * Fetch current Primus attestors from the network
     * This queries on-chain data to get the list of authorized attestors
     */
    fetchCurrentAttestors(): Promise<string[]>;
    /**
     * Get cached attestors or fetch new ones if cache expired
     */
    private getAttestors;
    /**
     * Verify a Primus attestation comprehensively
     *
     * @param attestationResult - The result from primusNetwork.attest()
     * @param config - Verification configuration options
     * @returns Detailed verification result
     */
    verify(attestationResult: any, config?: AttestationVerificationConfig): Promise<AttestationVerificationResult>;
    /**
     * Quick verification - just checks if attestation is valid without detailed output
     */
    isValid(attestationResult: any, config?: AttestationVerificationConfig): Promise<boolean>;
}
export default PrimusAttestationVerifier;
//# sourceMappingURL=PrimusAttestationVerifier.d.ts.map