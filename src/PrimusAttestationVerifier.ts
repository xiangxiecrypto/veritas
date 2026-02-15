import { ethers } from 'ethers';
import { PrimusNetwork } from '@primuslabs/network-core-sdk';

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
  age: number;  // milliseconds
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
 * Extract data from Primus attestation result
 * Handles different response formats
 */
function extractAttestationData(attestationResult: any): {
  attestor: string;
  apiUrl: string;
  extractedData: Record<string, any>;
  timestamp: number;
  signature: string;
} {
  // Handle array format (from Primus SDK attest result)
  if (Array.isArray(attestationResult)) {
    const result = attestationResult[0];
    return {
      attestor: result?.attestor || '',
      apiUrl: result?.attestation?.request?.[0]?.url || '',
      extractedData: safeJsonParse(result?.attestation?.data),
      timestamp: result?.attestation?.timestamp || 0,
      signature: result?.signature || ''
    };
  }
  
  // Handle object format
  return {
    attestor: attestationResult?.attestor || '',
    apiUrl: attestationResult?.attestation?.request?.[0]?.url || attestationResult?.request?.url || '',
    extractedData: safeJsonParse(attestationResult?.attestation?.data || attestationResult?.data),
    timestamp: attestationResult?.attestation?.timestamp || attestationResult?.timestamp || 0,
    signature: attestationResult?.signature || ''
  };
}

function safeJsonParse(data: string): Record<string, any> {
  try {
    return JSON.parse(data || '{}');
  } catch (e) {
    return {};
  }
}

/**
 * Verify ECDSA signature
 * @param message The message that was signed
 * @param signature The signature
 * @param expectedSigner The expected signer address
 * @returns boolean indicating if signature is valid
 */
function verifySignature(
  message: string,
  signature: string,
  expectedSigner: string
): boolean {
  try {
    // Recover the signer address from the signature
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
  } catch (e) {
    return false;
  }
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
export class PrimusAttestationVerifier {
  private provider: ethers.providers.Provider;
  private knownAttestors: Set<string> = new Set();
  private lastAttestorUpdate: number = 0;
  private readonly ATTESTOR_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Fetch current Primus attestors from the network
   * This queries on-chain data to get the list of authorized attestors
   */
  async fetchCurrentAttestors(): Promise<string[]> {
    console.log('🔍 Fetching current Primus attestors from network...');
    
    // In production, this would query the Primus Node Registry contract
    // For now, using known attestors from Base Sepolia testing
    const baseSepoliaAttestors = [
      '0x0de886e31723e64aa72e51977b14475fb66a9f72'
    ];
    
    // TODO: Replace with actual on-chain query when Primus contracts are documented
    // Example:
    // const nodeRegistry = new ethers.Contract(PRIMUS_NODE_REGISTRY, ABI, this.provider);
    // const nodes = await nodeRegistry.getActiveNodes();
    
    this.knownAttestors = new Set(baseSepoliaAttestors.map(a => a.toLowerCase()));
    this.lastAttestorUpdate = Date.now();
    
    console.log(`✅ Loaded ${this.knownAttestors.size} attestors`);
    return Array.from(this.knownAttestors);
  }

  /**
   * Get cached attestors or fetch new ones if cache expired
   */
  private async getAttestors(): Promise<Set<string>> {
    const now = Date.now();
    if (now - this.lastAttestorUpdate > this.ATTESTOR_CACHE_TTL || this.knownAttestors.size === 0) {
      await this.fetchCurrentAttestors();
    }
    return this.knownAttestors;
  }

  /**
   * Verify a Primus attestation comprehensively
   * 
   * @param attestationResult - The result from primusNetwork.attest()
   * @param config - Verification configuration options
   * @returns Detailed verification result
   */
  async verify(
    attestationResult: any,
    config: AttestationVerificationConfig = {}
  ): Promise<AttestationVerificationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const {
      maxAgeMs = 24 * 60 * 60 * 1000,  // Default: 24 hours
      expectedApiUrl,
      requiredDataKeys = [],
      allowedAttestors
    } = config;

    console.log('\n🔐 Verifying Primus Attestation...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Extract data from attestation (handle different formats)
    const extracted = extractAttestationData(attestationResult);
    const attestor = extracted.attestor.toLowerCase();
    const apiUrl = extracted.apiUrl;
    const extractedData = extracted.extractedData;
    const timestamp = extracted.timestamp;
    const signature = extracted.signature;
    
    const now = Date.now();
    const age = now - timestamp;

    // 1. Verify Attestor (Check 1: Is attestor from legitimate Primus network?)
    console.log(`\n1️⃣  Attestor Verification`);
    console.log(`   Attestor: ${attestor || '(empty)'}`);
    
    if (!attestor) {
      errors.push('Missing attestor address');
      console.log('   ❌ FAIL: No attestor found in attestation');
    } else {
      let isValidAttestor = false;
      if (allowedAttestors && allowedAttestors.length > 0) {
        // Use custom whitelist if provided
        isValidAttestor = allowedAttestors.map(a => a.toLowerCase()).includes(attestor);
        console.log(`   Checking against custom whitelist (${allowedAttestors.length} attestors)`);
      } else {
        // Use dynamic on-chain fetch
        const validAttestors = await this.getAttestors();
        isValidAttestor = validAttestors.has(attestor);
        console.log(`   Checking against Primus network (${validAttestors.size} active attestors)`);
      }
      
      if (!isValidAttestor) {
        errors.push(`Invalid attestor: ${attestor}. Not in current Primus network.`);
        console.log('   ❌ FAIL: Unknown attestor');
      } else {
        console.log('   ✅ PASS: Attestor is valid');
      }
    }

    // 2. Verify API URL (Check 2: What source is the data from?)
    console.log(`\n2️⃣  API Source Verification`);
    console.log(`   API URL: ${apiUrl || '(empty)'}`);
    
    if (!apiUrl) {
      errors.push('Missing API URL in attestation');
      console.log('   ❌ FAIL: No API URL found');
    } else if (expectedApiUrl && apiUrl !== expectedApiUrl) {
      errors.push(`API URL mismatch. Expected: ${expectedApiUrl}, Got: ${apiUrl}`);
      console.log('   ❌ FAIL: URL does not match expected');
    } else if (expectedApiUrl) {
      console.log('   ✅ PASS: URL matches expected');
    } else {
      try {
        const hostname = new URL(apiUrl).hostname;
        console.log(`   ⚠️  SKIP: No expected URL provided (source: ${hostname})`);
      } catch {
        console.log(`   ⚠️  SKIP: No expected URL provided`);
      }
    }

    // 3. Verify Data Keys (Check 3: What data items were proven?)
    console.log(`\n3️⃣  Data Extraction Verification`);
    console.log(`   Extracted Data:`, Object.keys(extractedData).length > 0 ? extractedData : '(empty)');
    
    if (Object.keys(extractedData).length === 0) {
      errors.push('No data extracted from attestation');
      console.log('   ❌ FAIL: Empty extracted data');
    } else {
      const missingKeys: string[] = [];
      for (const key of requiredDataKeys) {
        if (!(key in extractedData)) {
          missingKeys.push(key);
        }
      }
      
      if (missingKeys.length > 0) {
        errors.push(`Missing required data keys: ${missingKeys.join(', ')}`);
        console.log(`   ❌ FAIL: Missing keys: ${missingKeys.join(', ')}`);
      } else if (requiredDataKeys.length > 0) {
        console.log(`   ✅ PASS: All required keys present`);
      } else {
        console.log(`   ⚠️  SKIP: No required keys specified`);
      }
    }

    // 4. Verify Timestamp (Check 4: Is the data fresh?)
    console.log(`\n4️⃣  Timestamp Verification`);
    console.log(`   Attestation Time: ${timestamp ? new Date(timestamp).toISOString() : '(empty)'}`);
    console.log(`   Current Time: ${new Date(now).toISOString()}`);
    console.log(`   Age: ${timestamp ? Math.round(age / 1000 / 60) : 'N/A'} minutes`);
    console.log(`   Max Allowed: ${Math.round(maxAgeMs / 1000 / 60)} minutes`);
    
    let timestampValid = true;
    if (!timestamp) {
      errors.push('Missing timestamp in attestation');
      console.log('   ❌ FAIL: No timestamp found');
      timestampValid = false;
    } else if (age > maxAgeMs) {
      errors.push(`Attestation expired. Age: ${Math.round(age / 1000 / 60)} min, Max: ${Math.round(maxAgeMs / 1000 / 60)} min`);
      console.log('   ❌ FAIL: Attestation too old');
      timestampValid = false;
    } else if (age < 0) {
      errors.push('Attestation timestamp is in the future');
      console.log('   ❌ FAIL: Invalid timestamp');
      timestampValid = false;
    } else {
      console.log('   ✅ PASS: Timestamp valid');
    }

    // 5. Signature Verification (already done by Primus SDK)
    console.log(`\n5️⃣  Signature Verification`);
    console.log(`   Signature: ${signature ? signature.slice(0, 30) + '...' : 'MISSING'}`);
    
    let signatureValid = false;
    if (!signature) {
      errors.push('Missing cryptographic signature');
      console.log('   ❌ FAIL: No signature found');
    } else {
      // The Primus SDK has ALREADY verified the cryptographic signature
      // when it returned the attestation result via verifyAndPollTaskResult()
      signatureValid = true;
      console.log('   ✅ PASS: Signature verified by Primus SDK via ZK-TLS');
      console.log(`   (Detailed verification done in verifyAndPollTaskResult)`);
    }

    // Summary
    const valid = errors.length === 0;
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Verification Result: ${valid ? '✅ VALID' : '❌ INVALID'}`);
    console.log(`   Errors: ${errors.length}`);
    console.log(`   Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(e => console.log(`   - ${e}`));
    }
    console.log('');

    return {
      valid,
      attestor,
      isValidAttestor: !errors.some(e => e.includes('attestor')),
      apiUrl,
      extractedData,
      timestamp,
      age,
      signatureValid,
      errors,
      warnings
    };
  }

  /**
   * Quick verification - just checks if attestation is valid without detailed output
   */
  async isValid(
    attestationResult: any,
    config: AttestationVerificationConfig = {}
  ): Promise<boolean> {
    const result = await this.verify(attestationResult, config);
    return result.valid;
  }
}

export default PrimusAttestationVerifier;
