const hre = require("hardhat");

async function main() {
  const CHECK0 = "0x374bE654c08DE2C688f49d13E65b34C087e7e49E";
  
  const abi = [
    "function validate(bytes calldata attestationUrl, bytes calldata attestationResponseResolve, string calldata attestationData, string calldata ruleUrlTemplate, string calldata ruleDataKey, string calldata ruleParsePath, bytes calldata params) external view returns (bool)"
  ];
  
  const [signer] = await hre.ethers.getSigners();
  const check = new hre.ethers.Contract(CHECK0, abi, signer);
  
  try {
    const result = await check.validate(
      hre.ethers.utils.toUtf8Bytes("https://test.com"),
      hre.ethers.utils.toUtf8Bytes("test"),
      "test data",
      "https://test.com",
      "testKey",
      "$.test",
      "0x"
    );
    console.log('Result:', result);
  } catch (e) {
    console.log('Error:', e.message);
  }
}

main().catch(console.error);
