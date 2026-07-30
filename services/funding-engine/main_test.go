package main

import "testing"

func TestEqualSplit(t *testing.T) {
	allocations := EqualSplit(900, []string{"a", "b", "c"})
	if len(allocations) != 3 {
		t.Fatalf("expected 3 allocations, got %d", len(allocations))
	}
	if allocations[0].Amount != 300 {
		t.Fatalf("expected 300 per funder, got %f", allocations[0].Amount)
	}
}
