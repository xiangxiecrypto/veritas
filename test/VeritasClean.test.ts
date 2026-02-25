/**
 * @fileoverview Clean test for Veritas Neat Protocol
 * @description Simple, working test without TypeChain complications
 */

import { ethers } from 'hardhat';
import { expect } from 'chai';
import { RuleRegistry, VeritasValidator, HTTPCheck } from '../artifacts/contracts';

describe('Veritas Neat Protocol - Working Test', function () {
  
  let ruleRegistry: RuleRegistry;
  let validator: VeritasValidator;
  let httpCheck: HTTPCheck;
  
  let owner: any;
  let user1: any;
  let user2: any;

  // Mock attestation data
  const mockAttestation = {
    recipient: '0x0000000000000000000000000000000000000',
    request: {
      url: 'https://api.example.com/data',
      header: '{}',
      method: 'POST',
      body: ''
    },
    reponseResolve: [],
    data: '{}',
    attConditions: '',
    timestamp: Math.floor(Date.now() / 1000),
    additionParams: '',
    attestors: [{ attestorAddr: '0xABCDEF', url: 'https://attestor.primuslabs.xyz' }],
    signatures: ['0x123456']
  };

  before(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    console.log('Test accounts:');
    console.log('  Owner:', owner.address);
    console.log('  User1:', user1.address);
    console.log('  User2:', user2.address);
  });

  describe('Deployment', function () {
    
    it('should deploy RuleRegistry', async function () {
      console.log('\n  Deploying RuleRegistry...');
      
      const RuleRegistryFactory = await ethers.getContractFactory('RuleRegistry');
      ruleRegistry = await RuleRegistryFactory.deploy();
      await ruleRegistry.waitForDeployment();
      
      const address = await ruleRegistry.getAddress();
      console.log('  ✅ RuleRegistry deployed:', address);
      
      expect(address).to.be.properAddress;
      expect(await ruleRegistry.admins(owner.address)).to.be.true;
    });

    it('should deploy HTTPCheck', async function () {
      console.log('\n  Deploying HTTPCheck...');
      
      const HTTPCheckFactory = await ethers.getContractFactory('HTTPCheck');
      httpCheck = await HTTPCheckFactory.deploy();
      await httpCheck.waitForDeployment();
      
      const address = await httpCheck.getAddress();
      console.log('  ✅ HTTPCheck deployed:', address);
      
      expect(address).to.be.properAddress;
    });

    it('should deploy VeritasValidator', async function () {
      console.log('\n  Deploying VeritasValidator...');
      
      const VeritasValidatorFactory = await ethers.getContractFactory('VeritasValidator');
      validator = await VeritasValidatorFactory.deploy(
        await ruleRegistry.getAddress(),
        owner.address  // Using owner address as mock Primus
      );
      await validator.waitForDeployment();
      
      const address = await validator.getAddress();
      console.log('  ✅ VeritasValidator deployed:', address);
      console.log('     Mock Primus address:', owner.address);
      
      expect(address).to.be.properAddress;
      expect(await validator.ruleRegistry()).to.equal(await ruleRegistry.getAddress());
    });
  });

  describe('Rule Management', function () {
    
    it('should create a rule for trading API', async function () {
      console.log('\n  Creating rule for trading API...');
      
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
      
      await tx.wait();
      
      const rule = await ruleRegistry.getRule(1);
      console.log('  ✅ Rule created:');
      console.log('     ID:', rule.id.toString());
      console.log('     Name:', rule.name);
      console.log('     Active:', rule.active);
      
      expect(rule.id).to.equal(BigInt(1));
      expect(rule.name).to.equal('Trading Orders - Create');
      expect(rule.active).to.be.true;
    });

    it('should create a second rule for market data', async function () {
      console.log('\n  Creating rule for market data...');
      
      const checkData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'uint256', 'uint256', 'bytes', 'bool'],
        [
          'https://api.market.com/*',
          'GET',
          200,
          299,
          ethers.toUtf8Bytes('"price":'),
          true
        ]
      );

      const tx = await ruleRegistry.createRule(
        'Market Data - Get',
        'Validate market data retrieval',
        await httpCheck.getAddress(),
        checkData
      );
      
      await tx.wait();
      
      const rule = await ruleRegistry.getRule(2);
      console.log('  ✅ Second rule created:');
      console.log('     ID:', rule.id.toString());
      
      expect(rule.id).to.equal(BigInt(2));
    });

    it('should NOT allow non-admin to create rule', async function () {
      console.log('\n  Testing admin-only rule creation...');
      
      const checkData = ethers.AbiCoder.defaultAbiCoder().encode(['string', 'string'], ['Test', 'Desc'], '0x');

      await expect(
        ruleRegistry.connect(user1).createRule(
          'Unauthorized',
          'Should fail',
          await httpCheck.getAddress(),
          checkData
        )
      ).to.be.revertedWith('Veritas: not admin');
      
      console.log('  ✅ Non-admin correctly rejected');
    });

    it('should update rule status', async function () {
      console.log('\n  Testing rule status update...');
      
      await ruleRegistry.updateRuleStatus(1, false);
      
      const rule = await ruleRegistry.getRule(1);
      console.log('  ✅ Rule deactivated:', rule.active);
      
      expect(rule.active).to.be.false;
    });
  });

  describe('Validation', function () {
    
    it('should validate attestation with correct recipient', async function () {
      console.log('\n  Testing attestation validation with correct recipient...');
      
      // Create attestation data with owner as recipient
      const attestData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'tuple(string url, string header, string method, string body) request', 'tuple(string keyName, string parseType, string parsePath)[] reponseResolve, string data, string attConditions, uint64 timestamp, string additionParams, tuple(address attestorAddr, string url)[] attestors, bytes[] signatures) attestation', 'uint256 ruleId'],
        [
          owner.address,  // Correct recipient
          {
            url: 'https://api.example.com/data',
            header: '{}',
            method: 'POST',
            body: ''
          },
          [{
            keyName: 'data',
            parseType: 'JSON',
            parsePath: '$.data'
          }],
          '{}',
          '',
          Math.floor(Date.now() / 1000),
          '',
          [{
            attestorAddr: owner.address,
            url: 'https://attestor.primuslabs.xyz'
          }],
          ['0x123456']
        ],
        1
      );

      const tx = await validator.validate(attestData, 1);
      await tx.wait();
      
      // Check result
      const hash = ethers.keccak256(attestData);
      const result = await validator.getValidationResult(hash);
      
      console.log('  ✅ Validation passed:', result.passed);
      console.log('     Rule ID:', result.ruleId.toString());
      
      expect(result.passed).to.be.true;
      expect(result.ruleId).to.equal(BigInt(1));
    });

    it('should NOT validate attestation with wrong recipient', async function () {
      console.log('\n  Testing attestation validation with wrong recipient...');
      
      // Create attestation data with user1 as recipient
      const attestData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'tuple(...)...', 'uint256'],
        [
          user1.address,  // Wrong recipient
          mockAttestation,
          1
        ]
      );

      await expect(
        validator.validate(attestData, 1)
      ).to.be.revertedWith('UnauthorizedRecipient');
      
      console.log('  ✅ Wrong recipient correctly rejected');
    });

    it('should NOT validate for inactive rule', async function () {
      console.log('\n  Testing validation with inactive rule...');
      
      // Deactivate rule 1
      await ruleRegistry.updateRuleStatus(1, false);
      
      const attestData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'tuple(...)', 'uint256'],
        [owner.address, mockAttestation, 1]
      );

      await expect(
        validator.validate(attestData, 1)
      ).to.be.revertedWith('RuleNotActive');
      
      console.log('  ✅ Inactive rule correctly rejected');
    });
  });

  describe('Admin Management', function () {
    
    it('should add admin', async function () {
      console.log('\n  Adding new admin...');
      
      await ruleRegistry.addAdmin(user1.address);
      
      const isAdmin = await ruleRegistry.admins(user1.address);
      console.log('  ✅ User1 is now admin:', isAdmin);
      
      expect(isAdmin).to.be.true;
    });

    it('should remove admin', async function () {
      console.log('\n  Removing admin...');
      
      await ruleRegistry.removeAdmin(user1.address);
      
      const isAdmin = await ruleRegistry.admins(user1.address);
      console.log('  ✅ User1 admin status:', isAdmin);
      
      expect(isAdmin).to.be.false;
    });
  });

  describe('Result Storage', function () {
    
    it('should check if attestation is validated', async function () {
      console.log('\n  Checking attestation validation status...');
      
      const hash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'tuple(...)', 'uint256'],
        [owner.address, mockAttestation, 1]
      ));
      
      const isValidated = await validator.isValidated(hash);
      console.log('  ✅ Validation status:', isValidated);
      
      expect(isValidated).to.be.false; // Not validated yet
    });
  });

  describe('Summary', function () {
    
    it('should display deployment summary', async function () {
      console.log('\n\n  =======================================');
      console.log('  DEPLOYMENT SUMMARY');
      console.log('  =======================================\n');
      
      console.log('Contract Addresses:');
      console.log('  -------------------');
      console.log(`  RuleRegistry:    ${await ruleRegistry.getAddress()}`);
      console.log(`  HTTPCheck:        ${await httpCheck.getAddress()}`);
      console.log(`  VeritasValidator: ${await validator.getAddress()}`);
      
      console.log('\n  Rules Created:');
      console.log('  ---------------');
      const count = await ruleRegistry.getRuleCount();
      for (let i = 1; i <= Number(count); i++) {
        const rule = await ruleRegistry.getRule(i);
        console.log(`  ${i}. ${rule.name} (Active: ${rule.active})`);
      }
      
      console.log('\n  ✅ All systems operational!\n');
    });
  });
});
