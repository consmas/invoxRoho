FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod ./
COPY main.go ./
RUN go build -o pricing-engine .

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/pricing-engine /app/pricing-engine
EXPOSE 4001
CMD ["/app/pricing-engine"]
