#!/bin/bash

# Build script for Nexlayer Dagger Runner
# This script builds the Go binary for container image building

set -e

echo "🔨 Building Nexlayer Dagger Runner..."

# Check if we're in the right directory
if [ ! -f "go.mod" ]; then
    echo "❌ Error: go.mod not found. Run this script from the dagger-runner directory."
    exit 1
fi

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Error: Go is not installed. Please install Go 1.21 or later."
    exit 1
fi

# Clean any existing binary
if [ -f "nexlayer-dagger-runner" ]; then
    echo "🧹 Cleaning existing binary..."
    rm nexlayer-dagger-runner
fi

# Download dependencies
echo "📦 Downloading dependencies..."
go mod tidy

# Build the binary
echo "🏗️  Building binary..."
go build -o nexlayer-dagger-runner -ldflags="-s -w" .

# Check if build was successful
if [ -f "nexlayer-dagger-runner" ]; then
    echo "✅ Build successful! Binary: nexlayer-dagger-runner"
    echo "📏 Binary size: $(du -h nexlayer-dagger-runner | cut -f1)"
    
    # Make executable
    chmod +x nexlayer-dagger-runner
    
    echo ""
    echo "🚀 Usage:"
    echo "  ./nexlayer-dagger-runner /path/to/repository"
    echo ""
    echo "💡 Prerequisites:"
    echo "  - Docker daemon running"
    echo "  - Repository with client/ or server/ directories"
    echo "  - Network access to ttl.sh registry"
else
    echo "❌ Build failed!"
    exit 1
fi