.PHONY: all build run test lint clean dev web-dev web-build web-install docs-dev

VERSION := 0.1.0
BINARY := mygreatcircle
GO := go
GOFLAGS := -ldflags "-s -w -X main.Version=$(VERSION)"

all: build

build:
	$(GO) build $(GOFLAGS) -o $(BINARY) ./cmd/mygreatcircle

run: build
	./$(BINARY)

test:
	$(GO) test -v ./...

lint:
	golangci-lint run

clean:
	rm -f $(BINARY)
	rm -rf web/dist web/node_modules

# Development
dev:
	@echo "Starting backend and frontend..."
	@make -j2 run web-dev

# Web frontend
web-install:
	cd web && npm install

web-dev: web-install
	cd web && npm run dev

web-build: web-install
	cd web && npm run build

# Documentation
docs-dev:
	cd docs && mkdocs serve

docs-build:
	cd docs && mkdocs build
