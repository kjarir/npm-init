/*
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// EscrowContract provides functions for managing escrow contracts
type EscrowContract struct {
	contractapi.Contract
}

// EscrowContract represents an escrow agreement
type EscrowContractData struct {
	ContractID      string   `json:"contractId"`
	ProjectID       string   `json:"projectId"`
	ClientAddress   string   `json:"clientAddress"`
	FreelancerAddress string `json:"freelancerAddress"`
	TotalAmount     string   `json:"totalAmount"`
	LockedAmount    string   `json:"lockedAmount"`
	Status          string   `json:"status"` // CREATED, FUNDED, IN_PROGRESS, COMPLETED, REFUNDED
	Milestones      []Milestone `json:"milestones"`
	CreatedAt       string   `json:"createdAt"`
	UpdatedAt       string   `json:"updatedAt"`
}

// Milestone represents a project milestone
type Milestone struct {
	MilestoneID    string `json:"milestoneId"`
	Description    string `json:"description"`
	Amount         string `json:"amount"`
	Status         string `json:"status"` // PENDING, RELEASED, REFUNDED
	ReleasedAt     string `json:"releasedAt,omitempty"`
}

// InitLedger initializes the escrow contract
func (s *EscrowContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	return nil
}

// CreateContract creates a new escrow contract
func (s *EscrowContract) CreateContract(ctx contractapi.TransactionContextInterface, contractID string, projectID string, clientAddress string, freelancerAddress string, totalAmount string, milestonesJSON string) error {
	// Check if contract already exists
	contractJSON, err := ctx.GetStub().GetState(contractID)
	if err != nil {
		return fmt.Errorf("failed to read contract: %v", err)
	}
	if contractJSON != nil {
		return fmt.Errorf("contract %s already exists", contractID)
	}

	// Parse milestones
	var milestones []Milestone
	err = json.Unmarshal([]byte(milestonesJSON), &milestones)
	if err != nil {
		return fmt.Errorf("failed to parse milestones: %v", err)
	}

	// Initialize milestone statuses
	for i := range milestones {
		milestones[i].Status = "PENDING"
	}

	contract := EscrowContractData{
		ContractID:      contractID,
		ProjectID:       projectID,
		ClientAddress:   clientAddress,
		FreelancerAddress: freelancerAddress,
		TotalAmount:     totalAmount,
		LockedAmount:    "0",
		Status:          "CREATED",
		Milestones:      milestones,
		CreatedAt:       time.Now().UTC().Format(time.RFC3339),
		UpdatedAt:       time.Now().UTC().Format(time.RFC3339),
	}

	contractJSON, err = json.Marshal(contract)
	if err != nil {
		return fmt.Errorf("failed to marshal contract: %v", err)
	}

	err = ctx.GetStub().PutState(contractID, contractJSON)
	if err != nil {
		return fmt.Errorf("failed to put contract: %v", err)
	}

	// Create index for project lookup
	projectIndexKey, err := ctx.GetStub().CreateCompositeKey("project", []string{projectID, contractID})
	if err != nil {
		return fmt.Errorf("failed to create composite key: %v", err)
	}
	err = ctx.GetStub().PutState(projectIndexKey, []byte{0x00})
	if err != nil {
		return fmt.Errorf("failed to put project index: %v", err)
	}

	// Emit event
	eventPayload := fmt.Sprintf(`{"type":"ContractCreated","contractId":"%s","projectId":"%s"}`, contractID, projectID)
	ctx.GetStub().SetEvent("ContractCreated", []byte(eventPayload))

	return nil
}

// LockFunds locks funds for the escrow contract
// This should be called after transferring tokens from client to this contract
func (s *EscrowContract) LockFunds(ctx contractapi.TransactionContextInterface, contractID string, amount string) error {
	contract, err := s.GetContract(ctx, contractID)
	if err != nil {
		return err
	}

	if contract.Status != "CREATED" && contract.Status != "FUNDED" {
		return fmt.Errorf("contract must be in CREATED or FUNDED status to lock funds")
	}

	// Update locked amount
	contract.LockedAmount = amount
	contract.Status = "FUNDED"
	contract.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	contractJSON, err := json.Marshal(contract)
	if err != nil {
		return fmt.Errorf("failed to marshal contract: %v", err)
	}

	err = ctx.GetStub().PutState(contractID, contractJSON)
	if err != nil {
		return fmt.Errorf("failed to update contract: %v", err)
	}

	// Emit event
	eventPayload := fmt.Sprintf(`{"type":"FundsLocked","contractId":"%s","amount":"%s"}`, contractID, amount)
	ctx.GetStub().SetEvent("FundsLocked", []byte(eventPayload))

	return nil
}

// ReleaseMilestone releases payment for a specific milestone
func (s *EscrowContract) ReleaseMilestone(ctx contractapi.TransactionContextInterface, contractID string, milestoneID string) error {
	contract, err := s.GetContract(ctx, contractID)
	if err != nil {
		return err
	}

	if contract.Status != "FUNDED" && contract.Status != "IN_PROGRESS" {
		return fmt.Errorf("contract must be FUNDED or IN_PROGRESS to release milestone")
	}

	// Find milestone
	milestoneFound := false
	for i := range contract.Milestones {
		if contract.Milestones[i].MilestoneID == milestoneID {
			if contract.Milestones[i].Status != "PENDING" {
				return fmt.Errorf("milestone %s is not in PENDING status", milestoneID)
			}
			
			contract.Milestones[i].Status = "RELEASED"
			contract.Milestones[i].ReleasedAt = time.Now().UTC().Format(time.RFC3339)
			milestoneFound = true
			break
		}
	}

	if !milestoneFound {
		return fmt.Errorf("milestone %s not found", milestoneID)
	}

	// Update contract status
	allReleased := true
	for _, m := range contract.Milestones {
		if m.Status != "RELEASED" {
			allReleased = false
			break
		}
	}

	if allReleased {
		contract.Status = "COMPLETED"
	} else {
		contract.Status = "IN_PROGRESS"
	}

	contract.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	contractJSON, err := json.Marshal(contract)
	if err != nil {
		return fmt.Errorf("failed to marshal contract: %v", err)
	}

	err = ctx.GetStub().PutState(contractID, contractJSON)
	if err != nil {
		return fmt.Errorf("failed to update contract: %v", err)
	}

	// Emit event
	eventPayload := fmt.Sprintf(`{"type":"MilestoneReleased","contractId":"%s","milestoneId":"%s"}`, contractID, milestoneID)
	ctx.GetStub().SetEvent("MilestoneReleased", []byte(eventPayload))

	return nil
}

// RefundProject refunds the entire project to the client
func (s *EscrowContract) RefundProject(ctx contractapi.TransactionContextInterface, contractID string) error {
	contract, err := s.GetContract(ctx, contractID)
	if err != nil {
		return err
	}

	if contract.Status == "COMPLETED" {
		return fmt.Errorf("cannot refund a completed contract")
	}

	if contract.Status == "REFUNDED" {
		return fmt.Errorf("contract already refunded")
	}

	// Mark all pending milestones as refunded
	for i := range contract.Milestones {
		if contract.Milestones[i].Status == "PENDING" {
			contract.Milestones[i].Status = "REFUNDED"
		}
	}

	contract.Status = "REFUNDED"
	contract.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	contractJSON, err := json.Marshal(contract)
	if err != nil {
		return fmt.Errorf("failed to marshal contract: %v", err)
	}

	err = ctx.GetStub().PutState(contractID, contractJSON)
	if err != nil {
		return fmt.Errorf("failed to update contract: %v", err)
	}

	// Emit event
	eventPayload := fmt.Sprintf(`{"type":"ProjectRefunded","contractId":"%s","amount":"%s"}`, contractID, contract.LockedAmount)
	ctx.GetStub().SetEvent("ProjectRefunded", []byte(eventPayload))

	return nil
}

// GetContract returns the escrow contract details
func (s *EscrowContract) GetContract(ctx contractapi.TransactionContextInterface, contractID string) (*EscrowContractData, error) {
	contractJSON, err := ctx.GetStub().GetState(contractID)
	if err != nil {
		return nil, fmt.Errorf("failed to read contract: %v", err)
	}
	if contractJSON == nil {
		return nil, fmt.Errorf("contract %s does not exist", contractID)
	}

	var contract EscrowContractData
	err = json.Unmarshal(contractJSON, &contract)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal contract: %v", err)
	}

	return &contract, nil
}

// GetContractsByProject returns all contracts for a project
func (s *EscrowContract) GetContractsByProject(ctx contractapi.TransactionContextInterface, projectID string) ([]*EscrowContractData, error) {
	resultsIterator, err := ctx.GetStub().GetStateByPartialCompositeKey("project", []string{projectID})
	if err != nil {
		return nil, fmt.Errorf("failed to get contracts by project: %v", err)
	}
	defer resultsIterator.Close()

	var contracts []*EscrowContractData
	for resultsIterator.HasNext() {
		responseRange, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to get next contract: %v", err)
		}

		_, compositeKeyParts, err := ctx.GetStub().SplitCompositeKey(responseRange.Key)
		if err != nil {
			return nil, fmt.Errorf("failed to split composite key: %v", err)
		}

		contractID := compositeKeyParts[1]
		contract, err := s.GetContract(ctx, contractID)
		if err != nil {
			continue // Skip if contract not found
		}
		contracts = append(contracts, contract)
	}

	return contracts, nil
}

func main() {
	escrowContract, err := contractapi.NewChaincode(&EscrowContract{})
	if err != nil {
		fmt.Printf("Error creating Escrow contract: %v", err)
		return
	}

	if err := escrowContract.Start(); err != nil {
		fmt.Printf("Error starting Escrow contract: %v", err)
	}
}
