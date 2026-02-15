import { ethers } from 'ethers';
import { PrimusNetwork } from '@primuslabs/network-core-sdk';
/**
 * Dynamically fetch current Primus attestors from on-chain
 */
declare function getPrimusAttestors(provider: ethers.providers.Provider): Promise<string[]>;
/**
 * Alternative: Extract attestors from recent task submissions
 */
declare function getAttestorsFromTaskContract(provider: ethers.providers.Provider): Promise<string[]>;
/**
 * Verify an attestation with dynamic attestor lookup
 */
declare function verifyAttestationWithDynamicAttestorCheck(primusNetwork: PrimusNetwork, attestationResult: any, provider: ethers.providers.Provider): Promise<{
    valid: boolean;
    errors: string[];
}>;
export { getPrimusAttestors, getAttestorsFromTaskContract, verifyAttestationWithDynamicAttestorCheck };
//# sourceMappingURL=primus-verification.d.ts.map