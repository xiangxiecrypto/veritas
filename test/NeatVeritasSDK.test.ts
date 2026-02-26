import { expect } from "chai";
import { ethers } from "hardhat";
import { NeatVeritasSDK } from "../src/sdk";

describe("NeatVeritasSDK", function () {
  
  // Skip these tests if no network is configured
  const describeIf = (condition: boolean) => condition ? describe : describe.skip;
  
  describe("SDK Initialization", function () {
    it("should create SDK instance with minimal config", function () {
      const config = {
        signer: {} as any,
        appId: "0x0000000000000000000000000000000000000000",
        appSecret: "0x0000000000000000000000000000000000000000",
      };
      
      const sdk = new NeatVeritasSDK(config);
      expect(sdk).to.be.instanceOf(NeatVeritasSDK);
    });
    
    it("should not require validatorAddress in config", function () {
      // Validator address is hardcoded in SDK
      const config = {
        signer: {} as any,
        appId: "0x1234",
        appSecret: "0x5678",
      };
      
      // This should work without validatorAddress
      const sdk = new NeatVeritasSDK(config);
      expect(sdk).to.exist;
    });
  });
  
  describeIf(process.env.RUN_INTEGRATION_TESTS === "true")("Integration Tests (requires network)", function () {
    this.timeout(120000);
    
    let sdk: NeatVeritasSDK;
    let signer: any;
    
    before(async function () {
      [signer] = await ethers.getSigners();
      
      const config = {
        signer,
        appId: process.env.PRIMUS_APP_ID || "",
        appSecret: process.env.PRIMUS_APP_SECRET || "",
      };
      
      sdk = new NeatVeritasSDK(config);
      await sdk.init();
    });
    
    it("should attest API call", async function () {
      const result = await sdk.attest(
        {
          url: "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
          method: "GET",
        },
        [
          {
            keyName: "price",
            parseType: "string",
            parsePath: "$.price",
          },
        ]
      );
      
      expect(result.verified).to.be.true;
      expect(result.responseData).to.include("price");
      expect(result.timestamp).to.be.greaterThan(0);
    });
    
    it("should validate attestation on-chain", async function () {
      // First, create an attestation
      const attestationResult = await sdk.attest(
        {
          url: "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT",
          method: "GET",
        },
        [
          {
            keyName: "price",
            parseType: "string",
            parsePath: "$.price",
          },
        ]
      );
      
      // Then validate it
      const ruleId = parseInt(process.env.DEFAULT_RULE_ID || "1");
      const validation = await sdk.validate(attestationResult.attestation, ruleId);
      
      expect(validation.passed).to.be.true;
      expect(validation.transactionHash).to.be.a("string");
      expect(validation.blockNumber).to.be.greaterThan(0);
    });
  });
});
