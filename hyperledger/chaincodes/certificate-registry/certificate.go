/*
 * Certificate Registry Chaincode
 * 
 * Manages certificates for projects, milestones, and contracts
 * Stores IPFS hashes and transaction data on blockchain
 * Manages IPFS groups for project collaboration
 */

package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// CertificateContract provides functions for managing certificates
type CertificateContract struct {
	contractapi.Contract
}

// Certificate represents a certificate stored on the blockchain
type Certificate struct {
	CertificateID   string `json:"certificateId"`
	ProjectID       string `json:"projectId"`
	ContractID      string `json:"contractId,omitempty"`
	MilestoneID     string `json:"milestoneId,omitempty"`
	IPFSHash        string `json:"ipfsHash"`
	TransactionHash string `json:"transactionHash"`
	FreelancerID    string `json:"freelancerId"`
	ClientID        string `json:"clientId"`
	Amount          string `json:"amount"`
	Timestamp       string `json:"timestamp"`
	Status          string `json:"status"`
	CertificateType string `json:"certificateType"` // "CONTRACT", "MILESTONE"
	IPFSGroupID     string `json:"ipfsGroupId"`     // IPFS group this certificate belongs to
}

// Project represents a project stored on the blockchain
type Project struct {
	ProjectID      string   `json:"projectId"`
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	Category       string   `json:"category"`
	ClientID       string   `json:"clientId"`
	TotalBudget    string   `json:"totalBudget"`
	Deadline       string   `json:"deadline,omitempty"`
	SkillsRequired []string `json:"skillsRequired,omitempty"`
	IPFSHash       string   `json:"ipfsHash"`
	IPFSGroupID    string   `json:"ipfsGroupId"` // IPFS group created for this project
	RegisteredAt   string   `json:"registeredAt"`
	Status         string   `json:"status"`
}

// IPFSGroup represents an IPFS group for project collaboration
type IPFSGroup struct {
	GroupID      string   `json:"groupId"`
	ProjectID   string   `json:"projectId"`
	IPFSHash     string   `json:"ipfsHash"`     // IPFS hash of the group
	Members      []string `json:"members"`       // List of member IDs (client, freelancers)
	CreatedAt    string   `json:"createdAt"`
	UpdatedAt    string   `json:"updatedAt"`
}

// RegisterProject creates a new project record and creates an IPFS group
// Args: projectId, title, description, category, clientId, totalBudget, deadline, skillsRequired (JSON), ipfsHash, ipfsGroupHash
func (s *CertificateContract) RegisterProject(ctx contractapi.TransactionContextInterface) error {
	args := ctx.GetStub().GetStringArgs()
	if len(args) != 11 {
		return fmt.Errorf("incorrect number of arguments. Expecting 10, got %d", len(args)-1)
	}

	projectId := args[1]
	title := args[2]
	description := args[3]
	category := args[4]
	clientId := args[5]
	totalBudget := args[6]
	deadline := args[7]
	skillsRequiredJSON := args[8]
	ipfsHash := args[9]
	ipfsGroupHash := args[10] // IPFS hash of the created group

	// Validate required fields
	if projectId == "" || title == "" || ipfsHash == "" || ipfsGroupHash == "" {
		return fmt.Errorf("projectId, title, ipfsHash, and ipfsGroupHash are required")
	}

	// Check if project already exists
	projectJSON, err := ctx.GetStub().GetState("project:" + projectId)
	if err != nil {
		return fmt.Errorf("failed to read project: %v", err)
	}
	if projectJSON != nil {
		return fmt.Errorf("project %s already exists", projectId)
	}

	// Parse skills required
	var skillsRequired []string
	if skillsRequiredJSON != "" && skillsRequiredJSON != "[]" {
		err = json.Unmarshal([]byte(skillsRequiredJSON), &skillsRequired)
		if err != nil {
			skillsRequired = []string{}
		}
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}

	// Create IPFS group with client as initial member
	groupId := "group:" + projectId
	group := IPFSGroup{
		GroupID:   groupId,
		ProjectID: projectId,
		IPFSHash:  ipfsGroupHash,
		Members:   []string{clientId}, // Client is added to group when project is created
		CreatedAt: txTimestamp.AsTime().Format("2006-01-02T15:04:05Z"),
		UpdatedAt: txTimestamp.AsTime().Format("2006-01-02T15:04:05Z"),
	}

	groupJSON, err := json.Marshal(group)
	if err != nil {
		return fmt.Errorf("failed to marshal group: %v", err)
	}

	// Save IPFS group
	err = ctx.GetStub().PutState(groupId, groupJSON)
	if err != nil {
		return fmt.Errorf("failed to put group to state: %v", err)
	}

	// Create project object
	project := Project{
		ProjectID:      projectId,
		Title:          title,
		Description:    description,
		Category:       category,
		ClientID:       clientId,
		TotalBudget:    totalBudget,
		Deadline:       deadline,
		SkillsRequired: skillsRequired,
		IPFSHash:       ipfsHash,
		IPFSGroupID:    groupId,
		RegisteredAt:   txTimestamp.AsTime().Format("2006-01-02T15:04:05Z"),
		Status:         "open",
	}

	projectJSON, err = json.Marshal(project)
	if err != nil {
		return fmt.Errorf("failed to marshal project: %v", err)
	}

	// Save project to state
	err = ctx.GetStub().PutState("project:"+projectId, projectJSON)
	if err != nil {
		return fmt.Errorf("failed to put project to state: %v", err)
	}

	return nil
}

// GetProject returns the project stored in the world state with given id
func (s *CertificateContract) GetProject(ctx contractapi.TransactionContextInterface, projectId string) (*Project, error) {
	projectJSON, err := ctx.GetStub().GetState("project:" + projectId)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}

	if projectJSON == nil {
		return nil, fmt.Errorf("project %s does not exist", projectId)
	}

	var project Project
	err = json.Unmarshal(projectJSON, &project)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal project: %v", err)
	}

	return &project, nil
}

// RegisterContractCertificate registers a contract certificate when freelancer signs contract
// This also adds the freelancer to the IPFS group
// Args: certificateId, projectId, contractId, ipfsHash, transactionHash, freelancerId, clientId, amount
func (s *CertificateContract) RegisterContractCertificate(ctx contractapi.TransactionContextInterface) error {
	args := ctx.GetStub().GetStringArgs()
	if len(args) != 9 {
		return fmt.Errorf("incorrect number of arguments. Expecting 8, got %d", len(args)-1)
	}

	certificateId := args[1]
	projectId := args[2]
	contractId := args[3]
	ipfsHash := args[4]
	transactionHash := args[5]
	freelancerId := args[6]
	clientId := args[7]
	amount := args[8]

	// Validate required fields
	if certificateId == "" || projectId == "" || contractId == "" || ipfsHash == "" {
		return fmt.Errorf("certificateId, projectId, contractId, and ipfsHash are required")
	}

	// Get project to retrieve IPFS group
	project, err := s.GetProject(ctx, projectId)
	if err != nil {
		return fmt.Errorf("failed to get project: %v", err)
	}

	// Get IPFS group
	groupId := project.IPFSGroupID
	groupJSON, err := ctx.GetStub().GetState(groupId)
	if err != nil {
		return fmt.Errorf("failed to read group: %v", err)
	}
	if groupJSON == nil {
		return fmt.Errorf("IPFS group %s does not exist", groupId)
	}

	var group IPFSGroup
	err = json.Unmarshal(groupJSON, &group)
	if err != nil {
		return fmt.Errorf("failed to unmarshal group: %v", err)
	}

	// Check if freelancer is already in group
	freelancerExists := false
	for _, member := range group.Members {
		if member == freelancerId {
			freelancerExists = true
			break
		}
	}

	// Add freelancer to group if not already present
	if !freelancerExists {
		group.Members = append(group.Members, freelancerId)
		txTimestamp, err := ctx.GetStub().GetTxTimestamp()
		if err != nil {
			return fmt.Errorf("failed to get transaction timestamp: %v", err)
		}
		group.UpdatedAt = txTimestamp.AsTime().Format("2006-01-02T15:04:05Z")

		// Save updated group
		groupJSON, err = json.Marshal(group)
		if err != nil {
			return fmt.Errorf("failed to marshal group: %v", err)
		}
		err = ctx.GetStub().PutState(groupId, groupJSON)
		if err != nil {
			return fmt.Errorf("failed to update group: %v", err)
		}
	}

	// Check if certificate already exists
	certificateJSON, err := ctx.GetStub().GetState(certificateId)
	if err != nil {
		return fmt.Errorf("failed to read certificate: %v", err)
	}
	if certificateJSON != nil {
		return fmt.Errorf("certificate %s already exists", certificateId)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}

	// Create contract certificate
	certificate := Certificate{
		CertificateID:   certificateId,
		ProjectID:      projectId,
		ContractID:     contractId,
		IPFSHash:       ipfsHash,
		TransactionHash: transactionHash,
		FreelancerID:   freelancerId,
		ClientID:       clientId,
		Amount:         amount,
		Timestamp:      txTimestamp.AsTime().Format("2006-01-02T15:04:05Z"),
		Status:          "active",
		CertificateType: "CONTRACT",
		IPFSGroupID:    groupId,
	}

	certificateJSON, err = json.Marshal(certificate)
	if err != nil {
		return fmt.Errorf("failed to marshal certificate: %v", err)
	}

	// Save certificate to state
	err = ctx.GetStub().PutState(certificateId, certificateJSON)
	if err != nil {
		return fmt.Errorf("failed to put certificate to state: %v", err)
	}

	// Create composite keys for indexing
	projectCertKey, err := ctx.GetStub().CreateCompositeKey("project~certificate", []string{projectId, certificateId})
	if err != nil {
		return fmt.Errorf("failed to create composite key: %v", err)
	}
	err = ctx.GetStub().PutState(projectCertKey, []byte{0x00})
	if err != nil {
		return fmt.Errorf("failed to put project-certificate relationship: %v", err)
	}

	// Index by group
	groupCertKey, err := ctx.GetStub().CreateCompositeKey("group~certificate", []string{groupId, certificateId})
	if err != nil {
		return fmt.Errorf("failed to create composite key: %v", err)
	}
	err = ctx.GetStub().PutState(groupCertKey, []byte{0x00})
	if err != nil {
		return fmt.Errorf("failed to put group-certificate relationship: %v", err)
	}

	return nil
}

// RegisterMilestoneCertificate registers a milestone certificate
// Args: certificateId, projectId, contractId, milestoneId, ipfsHash, transactionHash, freelancerId, clientId, amount
func (s *CertificateContract) RegisterMilestoneCertificate(ctx contractapi.TransactionContextInterface) error {
	args := ctx.GetStub().GetStringArgs()
	if len(args) != 10 {
		return fmt.Errorf("incorrect number of arguments. Expecting 9, got %d", len(args)-1)
	}

	certificateId := args[1]
	projectId := args[2]
	contractId := args[3]
	milestoneId := args[4]
	ipfsHash := args[5]
	transactionHash := args[6]
	freelancerId := args[7]
	clientId := args[8]
	amount := args[9]

	// Validate required fields
	if certificateId == "" || projectId == "" || milestoneId == "" || ipfsHash == "" {
		return fmt.Errorf("certificateId, projectId, milestoneId, and ipfsHash are required")
	}

	// Get project to retrieve IPFS group
	project, err := s.GetProject(ctx, projectId)
	if err != nil {
		return fmt.Errorf("failed to get project: %v", err)
	}

	// Check if certificate already exists
	certificateJSON, err := ctx.GetStub().GetState(certificateId)
	if err != nil {
		return fmt.Errorf("failed to read certificate: %v", err)
	}
	if certificateJSON != nil {
		return fmt.Errorf("certificate %s already exists", certificateId)
	}

	// Get transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}

	// Create milestone certificate
	certificate := Certificate{
		CertificateID:   certificateId,
		ProjectID:       projectId,
		ContractID:      contractId,
		MilestoneID:     milestoneId,
		IPFSHash:        ipfsHash,
		TransactionHash: transactionHash,
		FreelancerID:    freelancerId,
		ClientID:        clientId,
		Amount:          amount,
		Timestamp:       txTimestamp.AsTime().Format("2006-01-02T15:04:05Z"),
		Status:           "active",
		CertificateType: "MILESTONE",
		IPFSGroupID:     project.IPFSGroupID,
	}

	certificateJSON, err = json.Marshal(certificate)
	if err != nil {
		return fmt.Errorf("failed to marshal certificate: %v", err)
	}

	// Save certificate to state
	err = ctx.GetStub().PutState(certificateId, certificateJSON)
	if err != nil {
		return fmt.Errorf("failed to put certificate to state: %v", err)
	}

	// Create composite keys for indexing
	projectCertKey, err := ctx.GetStub().CreateCompositeKey("project~certificate", []string{projectId, certificateId})
	if err != nil {
		return fmt.Errorf("failed to create composite key: %v", err)
	}
	err = ctx.GetStub().PutState(projectCertKey, []byte{0x00})
	if err != nil {
		return fmt.Errorf("failed to put project-certificate relationship: %v", err)
	}

	// Index by group
	groupCertKey, err := ctx.GetStub().CreateCompositeKey("group~certificate", []string{project.IPFSGroupID, certificateId})
	if err != nil {
		return fmt.Errorf("failed to create composite key: %v", err)
	}
	err = ctx.GetStub().PutState(groupCertKey, []byte{0x00})
	if err != nil {
		return fmt.Errorf("failed to put group-certificate relationship: %v", err)
	}

	return nil
}

// GetCertificate returns the certificate stored in the world state with given id
func (s *CertificateContract) GetCertificate(ctx contractapi.TransactionContextInterface, certificateId string) (*Certificate, error) {
	certificateJSON, err := ctx.GetStub().GetState(certificateId)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}

	if certificateJSON == nil {
		return nil, fmt.Errorf("certificate %s does not exist", certificateId)
	}

	var certificate Certificate
	err = json.Unmarshal(certificateJSON, &certificate)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal certificate: %v", err)
	}

	return &certificate, nil
}

// VerifyCertificate verifies if a certificate exists and matches the provided IPFS hash
func (s *CertificateContract) VerifyCertificate(ctx contractapi.TransactionContextInterface, certificateId string, ipfsHash string) (bool, error) {
	certificate, err := s.GetCertificate(ctx, certificateId)
	if err != nil {
		return false, err
	}

	return certificate.IPFSHash == ipfsHash, nil
}

// GetCertificatesByProject returns all certificates for a given project
func (s *CertificateContract) GetCertificatesByProject(ctx contractapi.TransactionContextInterface, projectId string) ([]*Certificate, error) {
	resultsIterator, err := ctx.GetStub().GetStateByPartialCompositeKey("project~certificate", []string{projectId})
	if err != nil {
		return nil, fmt.Errorf("failed to get certificates for project: %v", err)
	}
	defer resultsIterator.Close()

	var certificates []*Certificate
	for resultsIterator.HasNext() {
		responseRange, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to get next certificate: %v", err)
		}

		_, compositeKeyParts, err := ctx.GetStub().SplitCompositeKey(responseRange.Key)
		if err != nil {
			return nil, fmt.Errorf("failed to split composite key: %v", err)
		}

		certificateId := compositeKeyParts[1]
		certificate, err := s.GetCertificate(ctx, certificateId)
		if err != nil {
			return nil, err
		}

		certificates = append(certificates, certificate)
	}

	return certificates, nil
}

// GetIPFSGroup returns the IPFS group for a project
func (s *CertificateContract) GetIPFSGroup(ctx contractapi.TransactionContextInterface, projectId string) (*IPFSGroup, error) {
	project, err := s.GetProject(ctx, projectId)
	if err != nil {
		return nil, err
	}

	groupJSON, err := ctx.GetStub().GetState(project.IPFSGroupID)
	if err != nil {
		return nil, fmt.Errorf("failed to read group: %v", err)
	}

	if groupJSON == nil {
		return nil, fmt.Errorf("IPFS group for project %s does not exist", projectId)
	}

	var group IPFSGroup
	err = json.Unmarshal(groupJSON, &group)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal group: %v", err)
	}

	return &group, nil
}

// GetGroupMembers returns all members of an IPFS group
func (s *CertificateContract) GetGroupMembers(ctx contractapi.TransactionContextInterface, projectId string) ([]string, error) {
	group, err := s.GetIPFSGroup(ctx, projectId)
	if err != nil {
		return nil, err
	}

	return group.Members, nil
}

// GetCertificatesByGroup returns all certificates in an IPFS group
func (s *CertificateContract) GetCertificatesByGroup(ctx contractapi.TransactionContextInterface, projectId string) ([]*Certificate, error) {
	group, err := s.GetIPFSGroup(ctx, projectId)
	if err != nil {
		return nil, err
	}

	resultsIterator, err := ctx.GetStub().GetStateByPartialCompositeKey("group~certificate", []string{group.GroupID})
	if err != nil {
		return nil, fmt.Errorf("failed to get certificates for group: %v", err)
	}
	defer resultsIterator.Close()

	var certificates []*Certificate
	for resultsIterator.HasNext() {
		responseRange, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to get next certificate: %v", err)
		}

		_, compositeKeyParts, err := ctx.GetStub().SplitCompositeKey(responseRange.Key)
		if err != nil {
			return nil, fmt.Errorf("failed to split composite key: %v", err)
		}

		certificateId := compositeKeyParts[1]
		certificate, err := s.GetCertificate(ctx, certificateId)
		if err != nil {
			return nil, err
		}

		certificates = append(certificates, certificate)
	}

	return certificates, nil
}

// GetAllCertificates returns all certificates in the world state
func (s *CertificateContract) GetAllCertificates(ctx contractapi.TransactionContextInterface) ([]*Certificate, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get state by range: %v", err)
	}
	defer resultsIterator.Close()

	var certificates []*Certificate
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to get next: %v", err)
		}

		// Skip composite keys, project keys, and group keys
		if len(queryResponse.Key) >= 8 && (queryResponse.Key[0:8] == "project~" || queryResponse.Key[0:8] == "project:" || queryResponse.Key[0:6] == "group:") {
			continue
		}

		var certificate Certificate
		err = json.Unmarshal(queryResponse.Value, &certificate)
		if err != nil {
			// Skip if not a certificate
			continue
		}

		certificates = append(certificates, &certificate)
	}

	return certificates, nil
}

// UpdateCertificateStatus updates the status of a certificate
func (s *CertificateContract) UpdateCertificateStatus(ctx contractapi.TransactionContextInterface, certificateId string, status string) error {
	certificate, err := s.GetCertificate(ctx, certificateId)
	if err != nil {
		return err
	}

	certificate.Status = status

	certificateJSON, err := json.Marshal(certificate)
	if err != nil {
		return fmt.Errorf("failed to marshal certificate: %v", err)
	}

	return ctx.GetStub().PutState(certificateId, certificateJSON)
}

// DeleteCertificate deletes a certificate from the world state
func (s *CertificateContract) DeleteCertificate(ctx contractapi.TransactionContextInterface, certificateId string) error {
	certificate, err := s.GetCertificate(ctx, certificateId)
	if err != nil {
		return err
	}

	// Delete project-certificate relationship
	projectCertKey, err := ctx.GetStub().CreateCompositeKey("project~certificate", []string{certificate.ProjectID, certificateId})
	if err != nil {
		return fmt.Errorf("failed to create composite key: %v", err)
	}

	err = ctx.GetStub().DelState(projectCertKey)
	if err != nil {
		return fmt.Errorf("failed to delete project-certificate relationship: %v", err)
	}

	// Delete group-certificate relationship
	if certificate.IPFSGroupID != "" {
		groupCertKey, err := ctx.GetStub().CreateCompositeKey("group~certificate", []string{certificate.IPFSGroupID, certificateId})
		if err == nil {
			ctx.GetStub().DelState(groupCertKey)
		}
	}

	// Delete certificate
	return ctx.GetStub().DelState(certificateId)
}

func main() {
	certificateContract, err := contractapi.NewChaincode(&CertificateContract{})
	if err != nil {
		fmt.Printf("Error creating certificate-registry chaincode: %v", err)
		return
	}

	if err := certificateContract.Start(); err != nil {
		fmt.Printf("Error starting certificate-registry chaincode: %v", err)
	}
}
