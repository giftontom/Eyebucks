#!/bin/bash

# ============================================
# EYEBUCKZ LMS - MODE SWITCHER
# ============================================
# This script helps you switch between development and production modes
# Usage: ./switch-mode.sh [dev|prod]

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to show current mode
show_current_mode() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  CURRENT MODE DETECTION"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check frontend .env
    if [ -f ".env" ]; then
        frontend_env=$(grep "^NODE_ENV=" .env 2>/dev/null | cut -d '=' -f2 || echo "not set")
        frontend_api=$(grep "^VITE_API_URL=" .env 2>/dev/null | cut -d '=' -f2 || echo "not set")
        print_info "Frontend NODE_ENV: $frontend_env"
        print_info "Frontend API URL: $frontend_api"
    else
        print_warning "Frontend .env file not found"
    fi

    echo ""

    # Check backend .env
    if [ -f "server/.env" ]; then
        backend_env=$(grep "^NODE_ENV=" server/.env 2>/dev/null | cut -d '=' -f2 || echo "not set")
        backend_port=$(grep "^PORT=" server/.env 2>/dev/null | cut -d '=' -f2 || echo "not set")
        print_info "Backend NODE_ENV: $backend_env"
        print_info "Backend PORT: $backend_port"
    else
        print_warning "Backend .env file not found"
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# Function to switch to development mode
switch_to_dev() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  SWITCHING TO DEVELOPMENT MODE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Frontend
    if [ -f ".env.development" ]; then
        cp .env.development .env
        print_success "Frontend: Copied .env.development → .env"
    else
        print_warning "Frontend: .env.development not found, using existing .env"
    fi

    # Backend
    if [ -f "server/.env.development" ]; then
        cp server/.env.development server/.env
        print_success "Backend: Copied .env.development → .env"
    else
        print_warning "Backend: .env.development not found, using existing .env"
    fi

    echo ""
    print_success "Development mode activated!"
    echo ""
    print_info "Development Features:"
    echo "  • Mock Google OAuth (no Google Console setup needed)"
    echo "  • Local PostgreSQL database"
    echo "  • Dev login buttons (User & Admin)"
    echo "  • Hot reload enabled"
    echo "  • CORS allows localhost"
    echo ""
    print_warning "Next Steps:"
    echo "  1. Ensure PostgreSQL is running: brew services start postgresql@16"
    echo "  2. Run migrations: cd server && npm run prisma:migrate"
    echo "  3. Start backend: cd server && npm run dev"
    echo "  4. Start frontend: npm run dev"
    echo ""
}

# Function to switch to production mode
switch_to_prod() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  SWITCHING TO PRODUCTION MODE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Frontend
    if [ -f ".env.production" ]; then
        cp .env.production .env
        print_success "Frontend: Copied .env.production → .env"
    else
        print_error "Frontend: .env.production not found!"
        echo "  Create it with: cp .env.production.example .env.production"
        exit 1
    fi

    # Backend
    if [ -f "server/.env.production" ]; then
        cp server/.env.production server/.env
        print_success "Backend: Copied .env.production → .env"
    else
        print_error "Backend: .env.production not found!"
        echo "  Create it with: cp server/.env.production.example server/.env.production"
        exit 1
    fi

    echo ""
    print_success "Production mode activated!"
    echo ""
    print_warning "⚠️  PRODUCTION CHECKLIST:"
    echo "  ☐ Update DATABASE_URL with production database"
    echo "  ☐ Set strong JWT_SECRET and SESSION_SECRET"
    echo "  ☐ Configure real GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
    echo "  ☐ Set up live Razorpay keys (not test keys)"
    echo "  ☐ Update ALLOWED_ORIGINS with production domain"
    echo "  ☐ Set ADMIN_EMAILS with real admin emails"
    echo "  ☐ Enable HTTPS in production"
    echo "  ☐ Run database migrations on production DB"
    echo ""
    print_warning "Security Reminders:"
    echo "  • Never commit .env files to Git"
    echo "  • Use environment variables in hosting platform"
    echo "  • Rotate secrets every 90 days"
    echo "  • Enable rate limiting"
    echo ""
}

# Function to show usage
show_usage() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  EYEBUCKZ LMS - MODE SWITCHER"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Usage: ./switch-mode.sh [command]"
    echo ""
    echo "Commands:"
    echo "  dev      Switch to development mode"
    echo "  prod     Switch to production mode"
    echo "  status   Show current mode configuration"
    echo "  help     Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./switch-mode.sh dev      # Switch to development"
    echo "  ./switch-mode.sh prod     # Switch to production"
    echo "  ./switch-mode.sh status   # Check current mode"
    echo ""
}

# Main script logic
case "${1:-help}" in
    dev|development)
        switch_to_dev
        ;;
    prod|production)
        switch_to_prod
        ;;
    status|current)
        show_current_mode
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac

exit 0
