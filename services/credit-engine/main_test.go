package main

import "testing"

func TestCanApproveWithinLimit(t *testing.T) {
	if !CanApprove(LimitCheck{LimitAmount: 1000, UtilisedAmount: 200, Requested: 300}) {
		t.Fatal("expected request inside available limit to pass")
	}
}

func TestCanApproveRejectsLimitBreach(t *testing.T) {
	if CanApprove(LimitCheck{LimitAmount: 1000, UtilisedAmount: 900, Requested: 200}) {
		t.Fatal("expected request above available limit to fail")
	}
}
