package main

import (
	"encoding/json"
	"errors"
	"log"
	"math"
	"net/http"
	"time"
)

type pricingRequest struct {
	InvoiceAmount      float64 `json:"invoiceAmount"`
	AnnualRate         float64 `json:"annualRate"`
	OfferDate          string  `json:"offerDate"`
	InvoiceDueDate     string  `json:"invoiceDueDate"`
	PlatformFeeFlat    float64 `json:"platformFeeFlat"`
	PlatformFeePercent float64 `json:"platformFeePercent"`
}

type pricingResponse struct {
	InvoiceAmount   float64 `json:"invoiceAmount"`
	DaysAccelerated int     `json:"daysAccelerated"`
	DiscountAmount  float64 `json:"discountAmount"`
	PlatformFee     float64 `json:"platformFee"`
	NetProceeds     float64 `json:"netProceeds"`
	AnnualRate      float64 `json:"annualRate"`
}

type errorResponse struct {
	Error string `json:"error"`
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", healthHandler)
	mux.HandleFunc("POST /pricing/calculate", pricingHandler)

	log.Println("pricing-engine listening on :4001")
	if err := http.ListenAndServe(":4001", mux); err != nil {
		log.Fatal(err)
	}
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"service": "pricing-engine",
	})
}

func pricingHandler(w http.ResponseWriter, r *http.Request) {
	var req pricingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid JSON body"})
		return
	}

	res, err := calculate(req)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, res)
}

func calculate(req pricingRequest) (pricingResponse, error) {
	if req.InvoiceAmount <= 0 {
		return pricingResponse{}, errors.New("invoiceAmount must be greater than zero")
	}
	if req.AnnualRate < 0 {
		return pricingResponse{}, errors.New("annualRate cannot be negative")
	}

	offerDate, err := time.Parse(time.DateOnly, req.OfferDate)
	if err != nil {
		return pricingResponse{}, errors.New("offerDate must use YYYY-MM-DD format")
	}
	dueDate, err := time.Parse(time.DateOnly, req.InvoiceDueDate)
	if err != nil {
		return pricingResponse{}, errors.New("invoiceDueDate must use YYYY-MM-DD format")
	}
	if dueDate.Before(offerDate) {
		return pricingResponse{}, errors.New("invoiceDueDate cannot be before offerDate")
	}

	daysAccelerated := int(dueDate.Sub(offerDate).Hours() / 24)
	discountAmount := req.InvoiceAmount * req.AnnualRate * float64(daysAccelerated) / 365
	platformFee := req.PlatformFeeFlat + (req.InvoiceAmount * req.PlatformFeePercent)
	netProceeds := req.InvoiceAmount - discountAmount - platformFee

	return pricingResponse{
		InvoiceAmount:   roundMoney(req.InvoiceAmount),
		DaysAccelerated: daysAccelerated,
		DiscountAmount:  roundMoney(discountAmount),
		PlatformFee:     roundMoney(platformFee),
		NetProceeds:     roundMoney(netProceeds),
		AnnualRate:      req.AnnualRate,
	}, nil
}

func roundMoney(value float64) float64 {
	return math.Round(value*100) / 100
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		log.Printf("failed to write response: %v", err)
	}
}
