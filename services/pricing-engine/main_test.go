package main

import "testing"

func TestCalculatePricing(t *testing.T) {
	res, err := calculate(pricingRequest{
		InvoiceAmount:      100000,
		AnnualRate:         0.18,
		OfferDate:          "2026-07-01",
		InvoiceDueDate:     "2026-07-31",
		PlatformFeeFlat:    0,
		PlatformFeePercent: 0.01,
	})
	if err != nil {
		t.Fatalf("calculate returned error: %v", err)
	}
	if res.DaysAccelerated != 30 {
		t.Fatalf("expected 30 days accelerated, got %d", res.DaysAccelerated)
	}
	if res.PlatformFee != 1000 {
		t.Fatalf("expected platform fee 1000, got %f", res.PlatformFee)
	}
	if res.NetProceeds <= 0 || res.NetProceeds >= res.InvoiceAmount {
		t.Fatalf("unexpected net proceeds: %f", res.NetProceeds)
	}
}

func TestCalculateRejectsInvalidAmount(t *testing.T) {
	_, err := calculate(pricingRequest{
		InvoiceAmount:  -1,
		AnnualRate:     0.18,
		OfferDate:      "2026-07-01",
		InvoiceDueDate: "2026-07-31",
	})
	if err == nil {
		t.Fatal("expected invalid amount error")
	}
}
