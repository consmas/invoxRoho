package main

type Allocation struct {
	FunderID string
	Amount   float64
	Percent  float64
}

func EqualSplit(amount float64, funderIDs []string) []Allocation {
	if amount <= 0 || len(funderIDs) == 0 {
		return nil
	}
	perFunder := amount / float64(len(funderIDs))
	percent := 1 / float64(len(funderIDs))
	allocations := make([]Allocation, 0, len(funderIDs))
	for _, id := range funderIDs {
		allocations = append(allocations, Allocation{FunderID: id, Amount: perFunder, Percent: percent})
	}
	return allocations
}
