# Certificate Registry Chaincode Upgrade Guide

## Overview

The certificate-registry chaincode has been updated with new functionality and improved structure.

## What Changed

### New Functions
1. **RegisterProject** - Register new projects on the blockchain
2. **GetProject** - Retrieve project details by ID
3. **GetAllCertificates** - Get all certificates in the system
4. **UpdateCertificateStatus** - Update certificate status
5. **DeleteCertificate** - Delete a certificate from the ledger

### Updated Functions
1. **RegisterCertificate** - Now uses `GetStringArgs()` instead of individual parameters
   - **Old signature**: `RegisterCertificate(certificateID, projectID, contractID, issuerAddress, recipientAddress, ipfsHash, description, metadataJSON)`
   - **New signature**: `RegisterCertificate()` - uses `GetStringArgs()` with 8 arguments:
     - certificateId
     - projectId
     - milestoneId
     - ipfsHash
     - transactionHash
     - freelancerId
     - clientId
     - amount

### Data Structure Changes

**Certificate Structure:**
- **Removed**: `ContractID`, `IssuerAddress`, `RecipientAddress`, `Description`, `IssuedAt`, `Metadata`
- **Added**: `MilestoneID`, `TransactionHash`, `FreelancerID`, `ClientID`, `Amount`, `Timestamp`, `Status`

**New Project Structure:**
- `ProjectID`, `Title`, `Description`, `Category`, `ClientID`, `TotalBudget`, `Deadline`, `SkillsRequired[]`, `IPFSHash`, `RegisteredAt`, `Status`

## Deployment

### Option 1: Upgrade Existing Chaincode (Recommended)

If you already have version 1.0 deployed:

```bash
cd /Users/mohammedjarirkhan/Desktop/fabric/chaincodes
./redeploy-certificate.sh
```

This will:
- Package the new chaincode (version 2.0)
- Install on both peers
- Approve for both organizations
- Commit the upgrade

### Option 2: Fresh Deployment

If you want to deploy from scratch:

```bash
cd /Users/mohammedjarirkhan/Desktop/fabric/chaincodes
# Edit deploy-chaincodes.sh to set CERTIFICATE version to 2.0 and sequence to 2
./deploy-chaincodes.sh
```

## API Usage Examples

### Register Certificate (New Format)

**Backend API:**
```javascript
POST /api/fabric/invoke
{
  "contractName": "certificate",
  "functionName": "RegisterCertificate",
  "args": [
    "cert001",
    "project001",
    "milestone001",
    "QmHash123...",
    "0xabc123...",
    "freelancer123",
    "client456",
    "1000.0"
  ]
}
```

**Flutter/Dart:**
```dart
await invokeChaincode(
  contractName: 'certificate-registry',
  functionName: 'RegisterCertificate',
  args: [
    'cert001',
    'project001',
    'milestone001',
    'QmHash123...',
    '0xabc123...',
    'freelancer123',
    'client456',
    '1000.0'
  ],
);
```

### Register Project (New Function)

**Backend API:**
```javascript
POST /api/fabric/invoke
{
  "contractName": "certificate",
  "functionName": "RegisterProject",
  "args": [
    "project001",
    "Web Development",
    "Build a modern web app",
    "Web Development",
    "client123",
    "5000.0",
    "2024-12-31",
    '["React", "Node.js", "MongoDB"]',
    "QmProjectHash123..."
  ]
}
```

### Get Project

**Backend API:**
```javascript
POST /api/fabric/query
{
  "contractName": "certificate",
  "functionName": "GetProject",
  "args": ["project001"]
}
```

### Update Certificate Status

**Backend API:**
```javascript
POST /api/fabric/invoke
{
  "contractName": "certificate",
  "functionName": "UpdateCertificateStatus",
  "args": ["cert001", "revoked"]
}
```

### Delete Certificate

**Backend API:**
```javascript
POST /api/fabric/invoke
{
  "contractName": "certificate",
  "functionName": "DeleteCertificate",
  "args": ["cert001"]
}
```

## Migration Notes

⚠️ **Important**: If you have existing certificates from version 1.0, they will still be accessible but may not match the new structure. Consider:

1. **Data Migration**: If you need to preserve old data, create a migration script
2. **Frontend Updates**: Update all frontend/backend code that calls `RegisterCertificate`
3. **Testing**: Test all certificate operations after upgrade

## Breaking Changes

- `RegisterCertificate` function signature changed - **must update all callers**
- Certificate data structure changed - old certificates may need migration
- Removed `GetCertificatesByRecipient` function (can be re-added if needed)

## Rollback

If you need to rollback to version 1.0:

1. Checkout the old version of `certificate.go`
2. Update `redeploy-certificate.sh` to use version 1.0 and sequence 1
3. Run the redeploy script

## Support

For issues or questions, check:
- Chaincode logs: `docker logs peer0.org1.example.com`
- Deployment script output
- Fabric network status: `docker ps`
