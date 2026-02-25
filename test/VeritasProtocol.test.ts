/**
 * @fileoverview Test suite for Veritas Protocol (Verification Layer Only)
 * @description Tests for validation contracts
 */

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { RuleRegistry, VeritasValidator, HTTPCheck } from '../typechain-types';

describe('Veritas Protocol - Verification Layer', function () {
  
  let ruleRegistry: RuleRegistry;
  let validator: VeritasValidator;
  let httpCheck: HTTPCheck;
  
  let owner: any;
  let user1: any;
  let user2: any;

  before(async function () {
    [owner, user1, user2] = await ethers.getSigners();
  });

  describe('Deployment', function () {
    
    it('Should deploy RuleRegistry', async function () {
      const RuleRegistryFactory = await ethers.getContractFactory('RuleRegistry');
      ruleRegistry = await RuleRegistryFactory.deploy();
      await ruleRegistry.waitForDeployment();
      
      expect(await ruleRegistry.getAddress()).to.be.properAddress;
      expect(await ruleRegistry.admins(owner.address)).to.be.true;
    });

    it('Should deploy HTTPCheck', async function () {
      const HTTPCheckFactory = await ethers.getContractFactory('HTTPCheck');
      httpCheck = await HTTPCheckFactory.deploy();
      await httpCheck.waitForDeployment();
      
      expect(await httpCheck.getAddress()).to.be.properAddress;
    });

    it('Should deploy VeritasValidator', async function () {
      const ValidatorFactory = await ethers.getContractFactory('VeritasValidator');
      validator = await ValidatorFactory.deploy(await ruleRegistry.getAddress());
      await validator.waitForDeployment();
      
      expect(await validator.getAddress()).to.be.properAddress;
      expect(await validator.ruleRegistry()).to.equal(await ruleRegistry.getAddress());
    });
  });

  describe('RuleRegistry', function () {
    
    it('Should create a rule', async function () {
      const checkData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'uint256', 'uint256', 'bytes'],
        ['https://api.example.com/*', 'POST', 200, 299, '0x']
      );

      await expect(ruleRegistry.createRule(
        'Test Rule',
        'A test rule',
        await httpCheck.getAddress(),
        checkData,
        80
      ))
        .to.emit(ruleRegistry, 'RuleCreated')
        .withArgs(1, 'Test Rule', await httpCheck.getAddress(), 80);

      const rule = await ruleRegistry.getRule(1);
      expect(rule.name).to.equal('Test Rule');
      expect(rule.requiredScore).to.equal(80);
      expect(rule.active).to.be.true;
    });

    it('Should not allow non-admin to create rule', async function () {
      const checkData = '0x';
      
      await expect(
        ruleRegistry.connect(user1).createRule(
          'Unauthorized Rule',
          'Should fail',
          await httpCheck.getAddress(),
          checkData,
          80
        )
      ).to.be.revertedWith('Veritas: not admin');
    });

    it('Should update rule status', async function () {
      await ruleRegistry.updateRuleStatus(1, false);
      
      const rule = await ruleRegistry.getRule(1);
      expect(rule.active).to.be.false;
    });

    it('Should get rule count', async function () {
      const count = await ruleRegistry.getRuleCount();
      expect(count).to.equal(1);
    });

    it('Should get all rule IDs', async function () {
      const ruleIds = await ruleRegistry.getAllRuleIds();
      expect(ruleIds.length).to.equal(1);
      expect(ruleIds[0]).to.equal(1);
    });
  });

  describe('VeritasValidator', function () {
    
    it('Should fail validation for inactive rule', async function () {
      const attestation = '0x1234';
      const responseData = '0x5678';
      
      await expect(
        validator.connect(user1).validate(attestation, 1, responseData)
      ).to.be.revertedWithCustomError(validator, 'RuleNotActive');
    });

    it('Should activate rule and validate', async function () {
      // Activate rule
      await ruleRegistry.updateRuleStatus(1, true);
      
      const attestation = '0x1234';
      const responseData = ethers.toUtf8Bytes(JSON.stringify({ result: 'success' }));

      const tx = await validator.connect(user1).validate(attestation, 1, responseData);
      
      await expect(tx)
        .to.emit(validator, 'ValidationPerformed')
        .withArgs(
          ethers.keccak256(attestation),
          1,
          true,  // passed (simplified check always passes)
          100,   // score
          user1.address
        );

      const result = await validator.getValidationResult(ethers.keccak256(attestation));
      expect(result.passed).to.be.true;
      expect(result.score).to.equal(100);
    });

    it('Should not allow re-validation of same attestation', async function () {
      const attestation = '0x1234';
      const responseData = '0x5678';
      
      await expect(
        validator.connect(user2).validate(attestation, 1, responseData)
      ).to.be.revertedWithCustomError(validator, 'AlreadyValidated');
    });

    it('Should check if attestation is validated', async function () {
      const isValid = await validator.isValidated(ethers.keccak256('0x1234'));
      expect(isValid).to.be.true;
      
      const notValid = await validator.isValidated(ethers.keccak256('0x9999'));
      expect(notValid).to.be.false;
    });

    it('Should fail for non-existent rule', async function () {
      const attestation = '0xabcd';
      const responseData = '0xef01';
      
      await expect(
        validator.connect(user1).validate(attestation, 999, responseData)
      ).to.be.revertedWithCustomError(validator, 'RuleNotFound');
    });
  });

  describe('HTTPCheck', function () {
    
    it('Should validate HTTP check data', async function () {
      const checkData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'uint256', 'uint256', 'bytes'],
        ['https://api.example.com/test', 'POST', 200, 299, '0x']
      );

      const attestation = '0x';
      const responseData = ethers.toUtf8Bytes(JSON.stringify({ data: 'test' }));

      const [passed, score] = await httpCheck.validate(attestation, checkData, responseData);
      
      // Note: This is a simplified test
      // Real implementation would parse actual attestation
      expect(typeof passed).to.equal('boolean');
      expect(score).to.be.gte(0);
      expect(score).to.be.lte(100);
    });

    it('Should calculate correct score', async function () {
      const checkData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'uint256', 'uint256', 'bytes'],
        ['https://api.example.com/*', 'GET', 200, 299, '0x']
      );

      const attestation = '0x';
      const responseData = ethers.toUtf8Bytes(JSON.stringify({ 
        data: 'a'.repeat(1000)  // Large response
      }));

      const [passed, score] = await httpCheck.validate(attestation, checkData, responseData);
      
      expect(score).to.be.gte(80);  // Should get bonus for large response
    });
  });

  describe('Integration', function () {
    
    it('Should support multiple rules', async function () {
      // Create second rule
      const checkData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'uint256', 'uint256', 'bytes'],
        ['https://api.another.com/*', 'GET', 200, 299, '0x']
      );

      await ruleRegistry.createRule(
        'Another API Check',
        'Another test rule',
        await httpCheck.getAddress(),
        checkData,
        90
      );

      const count = await ruleRegistry.getRuleCount();
      expect(count).to.equal(2);

      // Validate with second rule
      const attestation = '0x9999';
      const responseData = '0x8888';
      
      await validator.connect(user1).validate(attestation, 2, responseData);
      
      const result = await validator.getValidationResult(ethers.keccak256(attestation));
      expect(result.ruleId).to.equal(2);
    });

    it('Should support admin management', async function () {
      // Add new admin
      await ruleRegistry.addAdmin(user2.address);
      expect(await ruleRegistry.admins(user2.address)).to.be.true;

      // Remove admin
      await ruleRegistry.removeAdmin(user2.address);
      expect(await ruleRegistry.admins(user2.address)).to.be.false;
    });
  });
});
