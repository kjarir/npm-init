# IPFS Group Flow Documentation

## Overview

The certificate-registry chaincode now supports IPFS groups for managing project collaboration, contracts, and milestone certificates. This enables easier rating and review at the end of projects.

## Flow Diagram

```
1. Client Posts Project
   └─> RegisterProject()
       └─> Creates IPFS Group
       └─> Adds Client to Group
       └─> Stores Group ID in Project

2. Freelancer Signs Contract
   └─> RegisterContractCertificate()
       └─> Adds Freelancer to IPFS Group
       └─> Issues Contract Certificate
       └─> Links Certificate to Group

3. Milestones Completed
   └─> RegisterMilestoneCertificate()
       └─> Issues Milestone Certificate
       └─> Links Certificate to Same Group

4. End of Project
   └─> GetCertificatesByGroup()
       └─> Get All Certificates (Contract + Milestones)
       └─> Use for Rating/Review
```

## New Functions

### 1. RegisterProject (Updated)
Creates a project and automatically creates an IPFS group.

**Arguments:**
- projectId
- title
- description
- category
- clientId
- totalBudget
- deadline
- skillsRequired (JSON array)
- ipfsHash (project IPFS hash)
- ipfsGroupHash (IPFS group hash - created externally)

**What it does:**
- Creates project record
- Creates IPFS group with client as initial member
- Links project to IPFS group

### 2. RegisterContractCertificate (New)
Registers a contract certificate when freelancer signs contract.

**Arguments:**
- certificateId
- projectId
- contractId
- ipfsHash
- transactionHash
- freelancerId
- clientId
- amount

**What it does:**
- Adds freelancer to IPFS group (if not already member)
- Creates contract certificate
- Links certificate to IPFS group
- Indexes by project and group

### 3. RegisterMilestoneCertificate (New)
Registers a milestone certificate.

**Arguments:**
- certificateId
- projectId
- contractId
- milestoneId
- ipfsHash
- transactionHash
- freelancerId
- clientId
- amount

**What it does:**
- Creates milestone certificate
- Links certificate to project's IPFS group
- Indexes by project and group

### 4. GetIPFSGroup (New)
Returns the IPFS group for a project.

**Arguments:**
- projectId

**Returns:**
- IPFSGroup object with members, IPFS hash, etc.

### 5. GetGroupMembers (New)
Returns all members of an IPFS group.

**Arguments:**
- projectId

**Returns:**
- Array of member IDs (client + freelancers)

### 6. GetCertificatesByGroup (New)
Returns all certificates in an IPFS group (contract + milestones).

**Arguments:**
- projectId

**Returns:**
- Array of all certificates (contract and milestones)

## API Usage Examples

### 1. Register Project (Creates IPFS Group)

**Backend API:**
```javascript
POST /api/fabric/invoke
{
  "contractName": "certificate",
  "functionName": "RegisterProject",
  "args": [
    "project001",
    "Web Development Project",
    "Build a modern web application",
    "Web Development",
    "client123",
    "5000.0",
    "2024-12-31",
    '["React", "Node.js", "MongoDB"]',
    "QmProjectHash123...",  // Project IPFS hash
    "QmGroupHash456..."      // IPFS Group hash (created externally)
  ]
}
```

**Flutter/Dart:**
```dart
await invokeChaincode(
  contractName: 'certificate-registry',
  functionName: 'RegisterProject',
  args: [
    'project001',
    'Web Development Project',
    'Build a modern web application',
    'Web Development',
    'client123',
    '5000.0',
    '2024-12-31',
    '["React", "Node.js", "MongoDB"]',
    'QmProjectHash123...',
    'QmGroupHash456...',
  ],
);
```

### 2. Register Contract Certificate (Adds Freelancer to Group)

**Backend API:**
```javascript
POST /api/fabric/invoke
{
  "contractName": "certificate",
  "functionName": "RegisterContractCertificate",
  "args": [
    "cert_contract_001",
    "project001",
    "contract001",
    "QmContractHash789...",
    "0xabc123...",
    "freelancer456",
    "client123",
    "5000.0"
  ]
}
```

**What happens:**
- Freelancer is automatically added to IPFS group
- Contract certificate is created
- Certificate is linked to IPFS group

### 3. Register Milestone Certificate

**Backend API:**
```javascript
POST /api/fabric/invoke
{
  "contractName": "certificate",
  "functionName": "RegisterMilestoneCertificate",
  "args": [
    "cert_milestone_001",
    "project001",
    "contract001",
    "milestone001",
    "QmMilestoneHash111...",
    "0xdef456...",
    "freelancer456",
    "client123",
    "1000.0"
  ]
}
```

### 4. Get All Certificates for Rating/Review

**Backend API:**
```javascript
POST /api/fabric/query
{
  "contractName": "certificate",
  "functionName": "GetCertificatesByGroup",
  "args": ["project001"]
}
```

**Returns:**
```json
{
  "success": true,
  "result": [
    {
      "certificateId": "cert_contract_001",
      "certificateType": "CONTRACT",
      "projectId": "project001",
      "contractId": "contract001",
      "ipfsHash": "QmContractHash789...",
      "freelancerId": "freelancer456",
      "clientId": "client123",
      "amount": "5000.0",
      "status": "active",
      "ipfsGroupId": "group:project001"
    },
    {
      "certificateId": "cert_milestone_001",
      "certificateType": "MILESTONE",
      "projectId": "project001",
      "milestoneId": "milestone001",
      "ipfsHash": "QmMilestoneHash111...",
      "freelancerId": "freelancer456",
      "clientId": "client123",
      "amount": "1000.0",
      "status": "active",
      "ipfsGroupId": "group:project001"
    }
  ]
}
```

### 5. Get Group Members

**Backend API:**
```javascript
POST /api/fabric/query
{
  "contractName": "certificate",
  "functionName": "GetGroupMembers",
  "args": ["project001"]
}
```

**Returns:**
```json
{
  "success": true,
  "result": ["client123", "freelancer456"]
}
```

## Integration with Escrow Contract

When integrating with the escrow contract:

1. **Project Posted:**
   - Call `RegisterProject()` with IPFS group hash
   - Client is added to group

2. **Contract Created (Escrow):**
   - Call `CreateContract()` in escrow contract
   - Call `RegisterContractCertificate()` in certificate contract
   - Freelancer is added to IPFS group

3. **Milestone Released (Escrow):**
   - Call `ReleaseMilestone()` in escrow contract
   - Call `RegisterMilestoneCertificate()` in certificate contract
   - Certificate is added to same IPFS group

4. **Project Completed:**
   - Call `GetCertificatesByGroup()` to get all certificates
   - Use certificates for rating/review system

## Direct Contracts

For direct contracts (not through project posting):

1. Create IPFS group externally
2. Register project with `RegisterProject()` using the group hash
3. Follow same flow as above

## Benefits

1. **Centralized Certificate Management:** All certificates (contract + milestones) in one group
2. **Easy Rating:** Get all certificates at once for rating/review
3. **Group Membership:** Track who's involved in the project
4. **IPFS Integration:** All certificates linked to IPFS for verification
5. **Audit Trail:** Complete history of project in one place

## Migration Notes

⚠️ **Breaking Changes:**
- `RegisterProject` now requires `ipfsGroupHash` as 10th argument
- Old `RegisterCertificate` function is replaced with:
  - `RegisterContractCertificate` (for contracts)
  - `RegisterMilestoneCertificate` (for milestones)

## Next Steps

1. Update frontend/backend to use new functions
2. Create IPFS groups externally before registering projects
3. Update escrow contract integration to call certificate functions
4. Implement rating/review system using `GetCertificatesByGroup()`
