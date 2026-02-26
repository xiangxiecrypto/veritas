# NeatVeritasSDK Documentation

## Overview

NeatVeritasSDK enables agents to prove API calls on-chain using Primus ZKTLS technology.

## Key Concepts

### Attestation

An attestation is cryptographic proof that:
1. An API call was made
2. The response data is authentic
3. The timestamp is accurate

### Validation

Validation verifies:
1. The attestation signature is valid
2. The timestamp is within the allowed age
3. The data matches the rule requirements

## Getting Started

See the main [README](../README.md) for quick start guide.

## Examples

### Weather Data Verification

```typescript
const result = await sdk.attest(
  {
    url: 'https://api.openweathermap.org/data/2.5/weather?q=London',
    method: 'GET',
  },
  [
    {
      keyName: 'temp',
      parseType: 'string',
      parsePath: '$.main.temp',
    },
  ]
);
```

### News Source Verification

```typescript
const result = await sdk.attest(
  {
    url: 'https://newsapi.org/v2/top-headlines?country=us',
    method: 'GET',
  },
  [
    {
      keyName: 'articles',
      parseType: 'string',
      parsePath: '$.articles[0].title',
    },
  ]
);
```

## Test Results

See [TEST_REPORT.md](./TEST_REPORT.md) for detailed test results.
