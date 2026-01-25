/*
 * Certificate Registry Chaincode
 *
 * Manages certificates for projects, milestones, and contracts
 * Stores IPFS hashes and transaction data on blockchain
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
	MilestoneID     string `json:"milestoneId"`
	IPFSHash        string `json:"ipfsHash"`
	TransactionHash string `json:"transactionHash"`
	FreelancerID    string `json:"freelancerId"`
	ClientID        string `json:"clientId"`
	Amount          string `json:"amount"`
	Timestamp       string `json:"timestamp"`
	Status          string `json:"status"`
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
	RegisteredAt   string   `json:"registeredAt"`
	Status         string   `json:"status"`
}

// RegisterCertificate creates a new certificate record
// Args: certificateId, projectId, milestoneId, ipfsHash, transactionHash, freelancerId, clientId, amount
func (s *CertificateContract) RegisterCertificate(ctx contractapi.TransactionContextInterface) error {
	args := ctx.GetStub().GetStringArgs()
	if len(args) != 9 {
		return fmt.Errorf("incorrect number of arguments. Expecting 8, got %d", len(args)-1)
	}

	certificateId := args[1]
	projectId := args[2]
	milestoneId := args[3]
	ipfsHash := args[4]
	transactionHash := args[5]
	freelancerId := args[6]
	clientId := args[7]
	amount := args[8]

	// Validate required fields
	if certificateId == "" || projectId == "" || ipfsHash == "" {
		return fmt.Errorf("certificateId, projectId, and ipfsHash are required")
	}

	// Check if certificate already exists
	certificateJSON, err := ctx.GetStub().GetState(certificateId)
	if err != nil {
		return fmt.Errorf("failed to read certificate: %v", err)
	}
	if certificateJSON != nil {
		return fmt.Errorf("certificate %s already exists", certificateId)
	}

	// Create certificate object
	certificate := Certificate{
		CertificateID:   certificateId,
		ProjectID:       projectId,
		MilestoneID:     milestoneId,
		IPFSHash:        ipfsHash,
		TransactionHash: transactionHash,
		FreelancerID:    freelancerId,
		ClientID:        clientId,
		Amount:          amount,
		Timestamp:       ctx.GetStub().GetTxTimestamp().AsTime().Format("2006-01-02T15:04:05Z"),
		Status:          "active",
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

	// Create composite key for project certificates
	projectCertKey, err := ctx.GetStub().CreateCompositeKey("project~certificate", []string{projectId, certificateId})
	if err != nil {
		return fmt.Errorf("failed to create composite key: %v", err)
	}

	// Save project-certificate relationship
	err = ctx.GetStub().PutState(projectCertKey, []byte{0x00})
	if err != nil {
		return fmt.Errorf("failed to put project-certificate relationship: %v", err)
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

// RegisterProject creates a new project record (uses certificate structure for compatibility)
// Args: projectId, title, description, category, clientId, totalBudget, deadline, skillsRequired (JSON), ipfsHash
func (s *CertificateContract) RegisterProject(ctx contractapi.TransactionContextInterface) error {
	args := ctx.GetStub().GetStringArgs()
	if len(args) != 10 {
		return fmt.Errorf("incorrect number of arguments. Expecting 9, got %d", len(args)-1)
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

	// Validate required fields
	if projectId == "" || title == "" || ipfsHash == "" {
		return fmt.Errorf("projectId, title, and ipfsHash are required")
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
			// If parsing fails, use empty array
			skillsRequired = []string{}
		}
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
		RegisteredAt:   ctx.GetStub().GetTxTimestamp().AsTime().Format("2006-01-02T15:04:05Z"),
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

		// Skip composite keys and project keys
		if queryResponse.Key[0:8] == "project~" || queryResponse.Key[0:8] == "project:" {
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
