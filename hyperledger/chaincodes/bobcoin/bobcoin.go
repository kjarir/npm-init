/*
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
	"encoding/json"
	"fmt"
	"math/big"
	"strings"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// BobCoinContract provides functions for managing a token
type BobCoinContract struct {
	contractapi.Contract
}

// Token represents a token with metadata
type Token struct {
	Name       string `json:"name"`
	Symbol     string `json:"symbol"`
	Decimals   int    `json:"decimals"`
	TotalSupply string `json:"totalSupply"`
}

// Balance represents a user's token balance
type Balance struct {
	Address string `json:"address"`
	Amount  string `json:"amount"`
}

// InitLedger initializes the token contract with default values
func (s *BobCoinContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	token := Token{
		Name:       "BobCoin",
		Symbol:     "BOB",
		Decimals:   18,
		TotalSupply: "0",
	}

	tokenJSON, err := json.Marshal(token)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState("TOKEN_METADATA", tokenJSON)
	if err != nil {
		return fmt.Errorf("failed to put token metadata: %v", err)
	}

	return nil
}

// Mint creates new tokens and adds them to the specified address
func (s *BobCoinContract) Mint(ctx contractapi.TransactionContextInterface, to string, amount string) error {
	// Check if caller has minter role (in production, implement proper access control)
	_, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get client MSP ID: %v", err)
	}

	// Parse amount using big.Int (handles any size, NO overflow!)
	mintAmount, err := parseAmount(amount)
	if err != nil {
		return fmt.Errorf("failed to parse mint amount: %v", err)
	}

	// Validate amount is positive
	if mintAmount.Sign() <= 0 {
		return fmt.Errorf("mint amount must be positive")
	}

	// Get current total supply
	totalSupply, err := s.TotalSupply(ctx)
	if err != nil {
		return err
	}

	// Get token metadata
	tokenJSON, err := ctx.GetStub().GetState("TOKEN_METADATA")
	if err != nil {
		return fmt.Errorf("failed to read token metadata: %v", err)
	}
	if tokenJSON == nil {
		return fmt.Errorf("token metadata does not exist. Initialize first")
	}

	// Calculate new total supply using big.Int
	currentSupply, err := parseAmount(totalSupply)
	if err != nil {
		return fmt.Errorf("failed to parse current supply: %v", err)
	}

	// Add minted amount (big.Int math - always correct!)
	newSupply := new(big.Int)
	newSupply.Add(currentSupply, mintAmount)

	// Update total supply
	token := Token{}
	err = json.Unmarshal(tokenJSON, &token)
	if err != nil {
		return err
	}
	token.TotalSupply = newSupply.String()
	tokenJSON, err = json.Marshal(token)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState("TOKEN_METADATA", tokenJSON)
	if err != nil {
		return fmt.Errorf("failed to update total supply: %v", err)
	}

	// Add tokens to recipient's balance
	currentBalance, err := s.BalanceOf(ctx, to)
	if err != nil {
		return err
	}

	balance, err := parseAmount(currentBalance)
	if err != nil {
		return fmt.Errorf("failed to parse balance: %v", err)
	}

	// Add minted amount to balance (big.Int math - always correct!)
	newBalance := new(big.Int)
	newBalance.Add(balance, mintAmount)
	err = s.setBalance(ctx, to, newBalance.String())
	if err != nil {
		return err
	}

	// Emit event
	eventPayload := fmt.Sprintf(`{"type":"Mint","to":"%s","amount":"%s","totalSupply":"%s"}`, to, amount, token.TotalSupply)
	ctx.GetStub().SetEvent("Mint", []byte(eventPayload))

	return nil
}

// Burn destroys tokens from the specified address
func (s *BobCoinContract) Burn(ctx contractapi.TransactionContextInterface, from string, amount string) error {
	// Get current balance
	currentBalance, err := s.BalanceOf(ctx, from)
	if err != nil {
		return err
	}

	balance, err := parseAmount(currentBalance)
	if err != nil {
		return fmt.Errorf("failed to parse balance: %v", err)
	}

	burnAmount, err := parseAmount(amount)
	if err != nil {
		return fmt.Errorf("failed to parse burn amount: %v", err)
	}

	// Validate amount is positive
	if burnAmount.Sign() <= 0 {
		return fmt.Errorf("burn amount must be positive")
	}

	// Check sufficient balance using big.Int comparison
	if balance.Cmp(burnAmount) < 0 {
		return fmt.Errorf("insufficient balance to burn")
	}

	// Update balance using big.Int subtraction
	newBalance := new(big.Int)
	newBalance.Sub(balance, burnAmount)
	err = s.setBalance(ctx, from, newBalance.String())
	if err != nil {
		return err
	}

	// Update total supply
	totalSupply, err := s.TotalSupply(ctx)
	if err != nil {
		return err
	}

	currentSupply, err := parseAmount(totalSupply)
	if err != nil {
		return fmt.Errorf("failed to parse total supply: %v", err)
	}

	// Subtract burned amount from total supply
	newSupply := new(big.Int)
	newSupply.Sub(currentSupply, burnAmount)

	// Update token metadata
	tokenJSON, err := ctx.GetStub().GetState("TOKEN_METADATA")
	if err != nil {
		return fmt.Errorf("failed to read token metadata: %v", err)
	}

	token := Token{}
	err = json.Unmarshal(tokenJSON, &token)
	if err != nil {
		return err
	}
	token.TotalSupply = newSupply.String()
	tokenJSON, err = json.Marshal(token)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState("TOKEN_METADATA", tokenJSON)
	if err != nil {
		return fmt.Errorf("failed to update total supply: %v", err)
	}

	// Emit event
	eventPayload := fmt.Sprintf(`{"type":"Burn","from":"%s","amount":"%s","totalSupply":"%s"}`, from, amount, token.TotalSupply)
	ctx.GetStub().SetEvent("Burn", []byte(eventPayload))

	return nil
}

// Transfer moves tokens from one address to another
func (s *BobCoinContract) Transfer(ctx contractapi.TransactionContextInterface, from string, to string, amount string) error {
	// Parse transfer amount using big.Int
	transferAmount, err := parseAmount(amount)
	if err != nil {
		return fmt.Errorf("failed to parse transfer amount: %v", err)
	}

	// Validate amount is positive
	if transferAmount.Sign() <= 0 {
		return fmt.Errorf("transfer amount must be positive")
	}

	// Get sender's balance
	senderBalance, err := s.BalanceOf(ctx, from)
	if err != nil {
		return err
	}

	balance, err := parseAmount(senderBalance)
	if err != nil {
		return fmt.Errorf("failed to parse sender balance: %v", err)
	}

	// Check sufficient balance using big.Int comparison
	if balance.Cmp(transferAmount) < 0 {
		return fmt.Errorf("insufficient balance")
	}

	// Update sender balance using big.Int subtraction
	newSenderBalance := new(big.Int)
	newSenderBalance.Sub(balance, transferAmount)
	err = s.setBalance(ctx, from, newSenderBalance.String())
	if err != nil {
		return err
	}

	// Update recipient balance
	recipientBalance, err := s.BalanceOf(ctx, to)
	if err != nil {
		return err
	}

	recipientBal, err := parseAmount(recipientBalance)
	if err != nil {
		return fmt.Errorf("failed to parse recipient balance: %v", err)
	}

	// Add to recipient balance using big.Int addition
	newRecipientBalance := new(big.Int)
	newRecipientBalance.Add(recipientBal, transferAmount)
	err = s.setBalance(ctx, to, newRecipientBalance.String())
	if err != nil {
		return err
	}

	// Emit event
	eventPayload := fmt.Sprintf(`{"type":"Transfer","from":"%s","to":"%s","amount":"%s"}`, from, to, amount)
	ctx.GetStub().SetEvent("Transfer", []byte(eventPayload))

	return nil
}

// BalanceOf returns the token balance of the specified address
// Always returns raw big.Int string (no decimal formatting)
func (s *BobCoinContract) BalanceOf(ctx contractapi.TransactionContextInterface, address string) (string, error) {
	balanceKey := fmt.Sprintf("BALANCE_%s", address)
	balanceJSON, err := ctx.GetStub().GetState(balanceKey)
	if err != nil {
		return "", fmt.Errorf("failed to read balance: %v", err)
	}

	if balanceJSON == nil {
		return "0", nil
	}

	var balance Balance
	err = json.Unmarshal(balanceJSON, &balance)
	if err != nil {
		return "", fmt.Errorf("failed to unmarshal balance: %v", err)
	}

	// Parse the stored amount (may be decimal string from old version) and return raw big.Int string
	amount, err := parseAmount(balance.Amount)
	if err != nil {
		return "", fmt.Errorf("failed to parse balance amount: %v", err)
	}

	// Return raw big.Int string (no decimal formatting)
	return amount.String(), nil
}

// TotalSupply returns the total supply of tokens
func (s *BobCoinContract) TotalSupply(ctx contractapi.TransactionContextInterface) (string, error) {
	tokenJSON, err := ctx.GetStub().GetState("TOKEN_METADATA")
	if err != nil {
		return "", fmt.Errorf("failed to read token metadata: %v", err)
	}
	if tokenJSON == nil {
		return "0", nil
	}

	var token Token
	err = json.Unmarshal(tokenJSON, &token)
	if err != nil {
		return "", fmt.Errorf("failed to unmarshal token: %v", err)
	}

	return token.TotalSupply, nil
}

// GetTokenInfo returns token metadata
func (s *BobCoinContract) GetTokenInfo(ctx contractapi.TransactionContextInterface) (*Token, error) {
	tokenJSON, err := ctx.GetStub().GetState("TOKEN_METADATA")
	if err != nil {
		return nil, fmt.Errorf("failed to read token metadata: %v", err)
	}
	if tokenJSON == nil {
		return nil, fmt.Errorf("token metadata does not exist")
	}

	var token Token
	err = json.Unmarshal(tokenJSON, &token)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal token: %v", err)
	}

	return &token, nil
}

// setBalance is a helper function to set balance for an address
func (s *BobCoinContract) setBalance(ctx contractapi.TransactionContextInterface, address string, amount string) error {
	balanceKey := fmt.Sprintf("BALANCE_%s", address)
	balance := Balance{
		Address: address,
		Amount:  amount,
	}

	balanceJSON, err := json.Marshal(balance)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(balanceKey, balanceJSON)
}

// Helper functions for amount parsing using big.Int
func parseAmount(amountStr string) (*big.Int, error) {
	// Handle empty or zero
	if amountStr == "" || amountStr == "0" {
		return big.NewInt(0), nil
	}

	// Remove any whitespace
	amountStr = strings.TrimSpace(amountStr)

	// Split by decimal point
	parts := strings.Split(amountStr, ".")
	if len(parts) > 2 {
		return nil, fmt.Errorf("invalid amount format: %s", amountStr)
	}

	wholePart := parts[0]
	decimalPart := "0"
	if len(parts) == 2 {
		decimalPart = parts[1]
		// Pad or truncate to 18 decimals
		if len(decimalPart) < 18 {
			decimalPart = decimalPart + strings.Repeat("0", 18-len(decimalPart))
		} else if len(decimalPart) > 18 {
			decimalPart = decimalPart[:18]
		}
	} else {
		decimalPart = strings.Repeat("0", 18)
	}

	// Combine whole and decimal parts
	combined := wholePart + decimalPart

	// Parse as big.Int (handles any size, NO overflow!)
	amount := new(big.Int)
	amount, ok := amount.SetString(combined, 10)
	if !ok {
		return nil, fmt.Errorf("failed to parse amount: %s", amountStr)
	}

	return amount, nil
}

func formatAmount(amount *big.Int) string {
	// Handle zero
	if amount.Sign() == 0 {
		return "0"
	}

	// Convert to string with padding for decimals
	amountStr := amount.String()

	// Pad with zeros to ensure we have at least 18 digits for decimal part
	if len(amountStr) <= 18 {
		amountStr = strings.Repeat("0", 19-len(amountStr)) + amountStr
	}

	// Split into whole and decimal parts
	wholePart := amountStr[:len(amountStr)-18]
	decimalPart := amountStr[len(amountStr)-18:]

	// Remove trailing zeros from decimal part
	decimalPart = strings.TrimRight(decimalPart, "0")

	// If no decimal part, return whole part only
	if decimalPart == "" {
		return wholePart
	}

	// Return formatted amount
	return wholePart + "." + decimalPart
}

func main() {
	bobCoinContract, err := contractapi.NewChaincode(&BobCoinContract{})
	if err != nil {
		fmt.Printf("Error creating BobCoin contract: %v", err)
		return
	}

	if err := bobCoinContract.Start(); err != nil {
		fmt.Printf("Error starting BobCoin contract: %v", err)
	}
}
