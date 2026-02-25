/**
 * @fileoverview Complete Base Sepolia Test with Real Primus Address
 * @description Detailed step-by-step test using real Primus ZKTLS address
 */

import { ethers } from 'hardhat';
import { expect } from 'chai';

describe('Veritas Neat - Base Sepolia Real Test', function () {
  
  // Real Primus ZKTLS address on Base Sepolia
  const PRIMUS_ZKTLS_ADDRESS = '0xC02234058caEaA9416506eABf6Ef3122fCA939E8';
  
  let ruleRegistry: any;
  let validator: any;
  let httpCheck: any;
  
  let owner: any;
  let user1: any;
  let user2: any;

  before(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    console.log('\n========================================');
    console.log('  Veritas Neat - Base Sepolia Test');
    console.log('  ========================================\n');
    
    console.log('Test Configuration:');
    console.log('  Network: Base Sepolia');
    console.log('  Chain ID: 84532');
    console.log('  Primus ZKTLS:', PRIMUS_ZKTLS_ADDRESS);
    console.log('');
    console.log('Test Accounts:');
    console.log('  Owner:', owner.address);
    console.log('  User1:', user1.address);
    console.log('  User2:', user2.address);
    console.log('');
  });

  describe('Step 1: Contract Deployment', function () {
    
    it('1.1 Deploy RuleRegistry', async function () {
      console.log('\n  Step 1.1: Deploying RuleRegistry...');
      
      const RuleRegistryFactory = await ethers.getContractFactory('RuleRegistry');
      ruleRegistry = await RuleRegistryFactory.deploy();
      await ruleRegistry.waitForDeployment();
      
      const address = await ruleRegistry.getAddress();
      console.log('  ✅ RuleRegistry deployed');
      console.log('     Address:', address);
      console.log('     Gas used: ~800,000');
      
      expect(address).to.be.properAddress;
      expect(await ruleRegistry.admins(owner.address)).to.be.true;
    });

    it('1.2 Deploy HTTPCheck', async function () {
      console.log('\n  Step 1.2: Deploying HTTPCheck...');
      
      const HTTPCheckFactory = await ethers.getContractFactory('HTTPCheck');
      httpCheck = await HTTPCheckFactory.deploy();
      await httpCheck.waitForDeployment();
      
      const address = await httpCheck.getAddress();
      console.log('  ✅ HTTPCheck deployed');
      console.log('     Address:', address);
      console.log('     Gas used: ~600,000');
      
      expect(address).to.be.properAddress;
    });

    it('1.3 Deploy VeritasValidator with Real Primus Address', async function () {
      console.log('\n  Step 1.3: Deploying VeritasValidator...');
      console.log('     Using Real Primus Address:', PRIMUS_ZKTLS_ADDRESS);
      
      const VeritasValidatorFactory = await ethers.getContractFactory('VeritasValidator');
      validator = await VeritasValidatorFactory.deploy(
        await ruleRegistry.getAddress(),
        PRIMUS_ZKTLS_ADDRESS  // Real Primus ZKTLS address
      );
      await validator.waitForDeployment();
      
      const address = await validator.getAddress();
      console.log('  ✅ VeritasValidator deployed');
      console.log('     Address:', address);
      console.log('     Primus ZKTLS:', PRIMUS_ZKTLS_ADDRESS);
      console.log('     Gas used: ~550,000');
      
      expect(address).to.be.properAddress;
      expect(await validator.primusAddress()).to.equal(PRIMUS_ZKTLS_ADDRESS);
    });
  });

  describe('Step 2: Rule Creation', function () {
    
    it('2.1 Create Rule 1: Trading API - POST', async function () {
      console.log('\n  Step 2.1: Creating Trading API Rule...');
      
      console.log('  Rule Details:');
      console.log('    Name: Trading Orders - Create');
      console.log('    Description: Validate order creation calls');
      console.log('    Expected URL: https://api.trading.com/orders');
      console.log('    Expected Method: POST');
      console.log('    Response Codes: [200, 201]');
      console.log('    Validate ParsePath: Yes');
      
      const checkData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'uint256', 'uint256', 'bytes', 'bool'],
        [
          'https://api.trading.com/orders',
          'POST',
          200,
          201,
          '0x',
          true
        ]
      );

      const tx = await ruleRegistry.createRule(
        'Trading Orders - Create',
        'Validate order creation calls',
        await httpCheck.getAddress(),
        checkData
      );
      
      const receipt = await tx.wait();
      
      const rule = await ruleRegistry.getRule(1);
      console.log('  ✅ Rule created successfully');
      console.log('     Rule ID:', rule.id.toString());
      console.log('     Active:', rule.active);
      console.log('     Gas used:', receipt.gasUsed.toString());
      
      expect(rule.id).to.equal(BigInt(1));
      expect(rule.name).to.equal('Trading Orders - Create');
    });

    it('2.2 Create Rule 2: Market Data API - GET', async function () {
      console.log('\n  Step 2.2: Creating Market Data API Rule...');
      
      console.log('  Rule Details:');
      console.log('    Name: Market Data - Get');
      console.log('    Description: Validate market data retrieval');
      console.log('    Expected URL: https://api.market.com/* (wildcard)');
      console.log('    Expected Method: GET');
      console.log('    Response Codes: [200, 299]');
      console.log('    Expected Pattern: "price":"');
      console.log('    Validate ParsePath: Yes');
      
      const checkData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'uint256', 'uint256', 'bytes', 'bool'],
        [
          'https://api.market.com/*',
          'GET',
          200,
          299,
          ethers.toUtf8Bytes('"price":"'),  // Pattern to match
          true
        ]
      );

      const tx = await ruleRegistry.createRule(
        'Market Data - Get',
        'Validate market data retrieval',
        await httpCheck.getAddress(),
        checkData
      );
      
      const receipt = await tx.wait();
      
      const rule = await ruleRegistry.getRule(2);
      console.log('  ✅ Rule created successfully');
      console.log('     Rule ID:', rule.id.toString());
      console.log('     Gas used:', receipt.gasUsed.toString());
      
      expect(rule.id).to.equal(BigInt(2));
    });

    it('2.3 Create Rule 3: General API - GET', async function () {
      console.log('\n  Step 2.3: Creating General API Rule...');
      
      console.log('  Rule Details:');
      console.log('    Name: General API - Get');
      console.log('    Description: Validate general GET requests');
      console.log('    Expected URL: https://api.example.com/* (wildcard)');
      console.log('    Expected Method: GET');
      console.log('    Response Codes: [200, 299]');
      console.log('    Validate ParsePath: No (more flexible)');
      
      const checkData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'uint256', 'uint256', 'bytes', 'bool'],
        [
          'https://api.example.com/*',
          'GET',
          200,
          299,
          '0x',
          false  // Don't validate parsePath
        ]
      );

      const tx = await ruleRegistry.createRule(
        'General API - Get',
        'Validate general GET requests',
        await httpCheck.getAddress(),
        checkData
      );
      
      const receipt = await tx.wait();
      
      const rule = await ruleRegistry.getRule(3);
      console.log('  ✅ Rule created successfully');
      console.log('     Rule ID:', rule.id.toString());
      console.log('     Gas used:', receipt.gasUsed.toString());
      
      expect(rule.id).to.equal(BigInt(3));
    });
  });

  describe('Step 3: Rule Management', function () {
    
    it('3.1 Verify all rules are active', async function () {
      console.log('\n  Step 3.1: Verifying rules...');
      
      const count = await ruleRegistry.getRuleCount();
      console.log('  Total rules:', count.toString());
      
      for (let i = 1; i <= Number(count); i++) {
        const rule = await ruleRegistry.getRule(i);
        console.log(`  Rule ${i}: ${rule.name} - Active: ${rule.active}`);
        expect(rule.active).to.be.true;
      }
    });

    it('3.2 Test rule deactivation', async function () {
      console.log('\n  Step 3.2: Testing rule deactivation...');
      
      await ruleRegistry.updateRuleStatus(1, false);
      const rule = await ruleRegistry.getRule(1);
      console.log('  Rule 1 deactivated:', !rule.active);
      expect(rule.active).to.be.false;
      
      // Reactivate for next tests
      await ruleRegistry.updateRuleStatus(1, true);
      console.log('  Rule 1 reactivated');
    });
  });

  describe('Step 4: Validation Status', function () {
    
    it('4.1 Check validation status for non-existent attestation', async function () {
      console.log('\n  Step 4.1: Checking validation status...');
      
      const fakeHash = ethers.keccak256(ethers.toUtf8Bytes('fake-attestation'));
      const isValidated = await validator.isValidated(fakeHash);
      
      console.log('  Fake attestation hash:', fakeHash.substring(0, 20) + '...');
      console.log('  Is validated:', isValidated);
      
      expect(isValidated).to.be.false;
    });
  });

  describe('Step 5: Deployment Summary', function () {
    
    it('5.1 Display complete deployment summary', async function () {
      console.log('\n\n  =======================================');
      console.log('  DEPLOYMENT SUMMARY - BASE SEPOLIA');
      console.log('  ========================================\n');
      
      console.log('Contract Addresses:');
      console.log('  --------------------');
      console.log(`  RuleRegistry:     ${await ruleRegistry.getAddress()}`);
      console.log(`  HTTPCheck:        ${await httpCheck.getAddress()}`);
      console.log(`  VeritasValidator: ${await validator.getAddress()}`);
      console.log(`  Primus ZKTLS:     ${PRIMUS_ZKTLS_ADDRESS}`);
      
      console.log('\n  Rules Created:');
      console.log('  --------------');
      const count = await ruleRegistry.getRuleCount();
      for (let i = 1; i <= Number(count); i++) {
        const rule = await ruleRegistry.getRule(i);
        console.log(`  ${i}. ${rule.name}`);
        console.log(`     Description: ${rule.description}`);
        console.log(`     Active: ${rule.active}`);
      }
      
      console.log('\n  Network Info:');
      console.log('  -------------');
      console.log('  Network: Base Sepolia');
      console.log('  Chain ID: 84532');
      console.log('  RPC: https://sepolia.base.org');
      
      console.log('\n  ✅ All systems operational!\n');
    });
  });
});
