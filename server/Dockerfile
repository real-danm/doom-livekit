FROM golang:1.18-alpine as builder

ARG TARGETPLATFORM
ARG TARGETARCH
RUN echo building for "$TARGETPLATFORM"

WORKDIR /workspace

# Copy the Go Modules manifests
COPY go.mod go.mod
COPY go.sum go.sum
# cache deps before building and copying source so that we don't need to re-download as much
# and so that source changes don't invalidate our downloaded layer
RUN go mod download

COPY pkg/ pkg/

RUN CGO_ENABLED=0 GOOS=linux GOARCH=$TARGETARCH GO111MODULE=on go build -a -o lk-doom ./pkg/main.go

FROM alpine

COPY --from=builder /workspace/lk-doom /lk-doom
EXPOSE 8001
# Run the binary.
ENTRYPOINT ["/lk-doom"]
