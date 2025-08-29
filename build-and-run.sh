#!/bin/bash

# MyCars Backend - Docker Build and Run Script
# This script helps you build and run the backend in Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from env.example..."
        if [ -f env.example ]; then
            cp env.example .env
            print_warning "Please edit .env file with your actual configuration values"
            print_warning "Then run this script again"
            exit 1
        else
            print_error "env.example file not found. Please create .env file manually"
            exit 1
        fi
    fi
    print_success ".env file found"
}

# Build Docker image
build_image() {
    local target=${1:-production}
    
    print_status "Building Docker image for $target environment..."
    
    if [ "$target" = "development" ]; then
        docker build -f Dockerfile -t mycars-backend:dev .
    else
        docker build -f Dockerfile.prod -t mycars-backend:prod .
    fi
    
    print_success "Docker image built successfully"
}

# Run with Docker Compose
run_compose() {
    local mode=${1:-production}
    
    print_status "Starting backend with docker-compose in $mode mode..."
    
    if [ "$mode" = "development" ]; then
        docker-compose -f docker-compose.dev.yml up -d
        print_success "Development backend started successfully"
        print_status "View logs: docker-compose -f docker-compose.dev.yml logs -f backend-dev"
    else
        docker-compose up -d
        print_success "Production backend started successfully"
        print_status "View logs: docker-compose logs -f backend"
    fi
}

# Stop containers
stop_containers() {
    print_status "Stopping containers..."
    
    # Stop production containers
    if docker-compose ps | grep -q "mycars-backend"; then
        docker-compose down
        print_success "Production containers stopped"
    fi
    
    # Stop development containers
    if docker-compose -f docker-compose.dev.yml ps | grep -q "mycars-backend-dev"; then
        docker-compose -f docker-compose.dev.yml down
        print_success "Development containers stopped"
    fi
}

# Show status
show_status() {
    print_status "Container status:"
    echo ""
    
    # Production containers
    if docker-compose ps | grep -q "mycars-backend"; then
        docker-compose ps
    else
        print_warning "No production containers running"
    fi
    
    echo ""
    
    # Development containers
    if docker-compose -f docker-compose.dev.yml ps | grep -q "mycars-backend-dev"; then
        docker-compose -f docker-compose.dev.yml ps
    else
        print_warning "No development containers running"
    fi
}

# Show logs
show_logs() {
    local mode=${1:-production}
    
    if [ "$mode" = "development" ]; then
        docker-compose -f docker-compose.dev.yml logs -f backend-dev
    else
        docker-compose logs -f backend
    fi
}

# Clean up
cleanup() {
    print_status "Cleaning up Docker resources..."
    
    # Stop and remove containers
    stop_containers
    
    # Remove images
    docker rmi mycars-backend:prod 2>/dev/null || true
    docker rmi mycars-backend:dev 2>/dev/null || true
    
    # Remove dangling images
    docker image prune -f
    
    print_success "Cleanup completed"
}

# Show help
show_help() {
    echo "MyCars Backend - Docker Build and Run Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  build [production|development]  Build Docker image (default: production)"
    echo "  run [production|development]    Run with docker-compose (default: production)"
    echo "  start [production|development]  Build and run (default: production)"
    echo "  stop                            Stop all containers"
    echo "  status                          Show container status"
    echo "  logs [production|development]   Show logs (default: production)"
    echo "  cleanup                         Clean up Docker resources"
    echo "  help                            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start                        # Build and run production"
    echo "  $0 start development            # Build and run development"
    echo "  $0 logs development             # Show development logs"
    echo "  $0 cleanup                      # Clean up everything"
}

# Main script logic
main() {
    local command=${1:-help}
    local mode=${2:-production}
    
    case $command in
        "build")
            check_docker
            check_env
            build_image $mode
            ;;
        "run")
            check_docker
            check_env
            run_compose $mode
            ;;
        "start")
            check_docker
            check_env
            build_image $mode
            run_compose $mode
            ;;
        "stop")
            stop_containers
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs $mode
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"
