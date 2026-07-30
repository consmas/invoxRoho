package main

type LimitCheck struct {
	LimitAmount    float64
	UtilisedAmount float64
	Requested      float64
}

func AvailableLimit(input LimitCheck) float64 {
	return input.LimitAmount - input.UtilisedAmount
}

func CanApprove(input LimitCheck) bool {
	return input.Requested > 0 && AvailableLimit(input) >= input.Requested
}
