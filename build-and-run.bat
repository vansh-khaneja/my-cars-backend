@echo off
REM MyCars Backend - Docker Build and Run Script for Windows
REM This script helps you build and run the backend in Docker

setlocal enabledelayedexpansion

REM Colors for output (Windows doesn't support ANSI colors, so we'll use text formatting)
set "INFO=[INFO]"
set "SUCCESS=[SUCCESS]"
set "WARNING=[WARNING]"
set "ERROR=[ERROR]"

REM Function to print colored output
:print_status
echo %INFO% %~1
goto :eof

:print_success
echo %SUCCESS% %~1
goto :eof

:print_warning
echo %WARNING% %~1
goto :eof

:print_error
echo %ERROR% %~1
goto :eof

REM Check if Docker is running
:check_docker
docker info >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker is not running. Please start Docker and try again."
    exit /b 1
)
call :print_success "Docker is running"
goto :eof

REM Check if .env file exists
:check_env
if not exist .env (
    call :print_warning ".env file not found. Creating from env.example..."
    if exist env.example (
        copy env.example .env >nul
        call :print_warning "Please edit .env file with your actual configuration values"
        call :print_warning "Then run this script again"
        exit /b 1
    ) else (
        call :print_error "env.example file not found. Please create .env file manually"
        exit /b 1
    )
)
call :print_success ".env file found"
goto :eof

REM Build Docker image
:build_image
set "target=%~1"
if "%target%"=="" set "target=production"

call :print_status "Building Docker image for %target% environment..."

if "%target%"=="development" (
    docker build -f Dockerfile -t mycars-backend:dev .
) else (
    docker build -f Dockerfile.prod -t mycars-backend:prod .
)

if errorlevel 1 (
    call :print_error "Failed to build Docker image"
    exit /b 1
)

call :print_success "Docker image built successfully"
goto :eof

REM Run with Docker Compose
:run_compose
set "mode=%~1"
if "%mode%"=="" set "mode=production"

call :print_status "Starting backend with docker-compose in %mode% mode..."

if "%mode%"=="development" (
    docker-compose -f docker-compose.dev.yml up -d
    if errorlevel 1 (
        call :print_error "Failed to start development backend"
        exit /b 1
    )
    call :print_success "Development backend started successfully"
    call :print_status "View logs: docker-compose -f docker-compose.dev.yml logs -f backend-dev"
) else (
    docker-compose up -d
    if errorlevel 1 (
        call :print_error "Failed to start production backend"
        exit /b 1
    )
    call :print_success "Production backend started successfully"
    call :print_status "View logs: docker-compose logs -f backend"
)
goto :eof

REM Stop containers
:stop_containers
call :print_status "Stopping containers..."

REM Stop production containers
docker-compose ps | findstr "mycars-backend" >nul 2>&1
if not errorlevel 1 (
    docker-compose down
    call :print_success "Production containers stopped"
)

REM Stop development containers
docker-compose -f docker-compose.dev.yml ps | findstr "mycars-backend-dev" >nul 2>&1
if not errorlevel 1 (
    docker-compose -f docker-compose.dev.yml down
    call :print_success "Development containers stopped"
)
goto :eof

REM Show status
:show_status
call :print_status "Container status:"
echo.

REM Production containers
docker-compose ps | findstr "mycars-backend" >nul 2>&1
if not errorlevel 1 (
    docker-compose ps
) else (
    call :print_warning "No production containers running"
)

echo.

REM Development containers
docker-compose -f docker-compose.dev.yml ps | findstr "mycars-backend-dev" >nul 2>&1
if not errorlevel 1 (
    docker-compose -f docker-compose.dev.yml ps
) else (
    call :print_warning "No development containers running"
)
goto :eof

REM Show logs
:show_logs
set "mode=%~1"
if "%mode%"=="" set "mode=production"

if "%mode%"=="development" (
    docker-compose -f docker-compose.dev.yml logs -f backend-dev
) else (
    docker-compose logs -f backend
)
goto :eof

REM Clean up
:cleanup
call :print_status "Cleaning up Docker resources..."

REM Stop and remove containers
call :stop_containers

REM Remove images
docker rmi mycars-backend:prod 2>nul
docker rmi mycars-backend:dev 2>nul

REM Remove dangling images
docker image prune -f

call :print_success "Cleanup completed"
goto :eof

REM Show help
:show_help
echo MyCars Backend - Docker Build and Run Script for Windows
echo.
echo Usage: %~nx0 [COMMAND] [OPTIONS]
echo.
echo Commands:
echo   build [production^|development]  Build Docker image (default: production^)
echo   run [production^|development]    Run with docker-compose (default: production^)
echo   start [production^|development]  Build and run (default: production^)
echo   stop                            Stop all containers
echo   status                          Show container status
echo   logs [production^|development]   Show logs (default: production^)
echo   cleanup                         Clean up Docker resources
echo   help                            Show this help message
echo.
echo Examples:
echo   %~nx0 start                        # Build and run production
echo   %~nx0 start development            # Build and run development
echo   %~nx0 logs development             # Show development logs
echo   %~nx0 cleanup                      # Clean up everything
goto :eof

REM Main script logic
set "command=%~1"
set "mode=%~2"

if "%command%"=="" set "command=help"
if "%mode%"=="" set "mode=production"

if "%command%"=="build" (
    call :check_docker
    call :check_env
    call :build_image %mode%
) else if "%command%"=="run" (
    call :check_docker
    call :check_env
    call :run_compose %mode%
) else if "%command%"=="start" (
    call :check_docker
    call :check_env
    call :build_image %mode%
    call :run_compose %mode%
) else if "%command%"=="stop" (
    call :stop_containers
) else if "%command%"=="status" (
    call :show_status
) else if "%command%"=="logs" (
    call :show_logs %mode%
) else if "%command%"=="cleanup" (
    call :cleanup
) else (
    call :show_help
)

endlocal
