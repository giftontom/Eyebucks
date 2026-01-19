#!/bin/bash

# Eyebuckz LMS - Deployment Helper Script
# This script helps automate the deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main menu
show_menu() {
    clear
    print_header "Eyebuckz LMS - Deployment Helper"
    echo ""
    echo "1. Pre-deployment checks"
    echo "2. Prepare for deployment (build & test)"
    echo "3. Deploy to Railway (Backend)"
    echo "4. Deploy to Vercel (Frontend)"
    echo "5. View deployment guide"
    echo "6. Generate environment template"
    echo "7. Exit"
    echo ""
    read -p "Select an option (1-7): " choice
}

# Pre-deployment checks
pre_deployment_checks() {
    print_header "Running Pre-Deployment Checks"
    echo ""

    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node -v)
        print_success "Node.js installed: $NODE_VERSION"
    else
        print_error "Node.js not found. Please install Node.js 18+"
        exit 1
    fi

    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm -v)
        print_success "npm installed: $NPM_VERSION"
    else
        print_error "npm not found"
        exit 1
    fi

    # Check Git
    if command_exists git; then
        GIT_VERSION=$(git --version)
        print_success "Git installed: $GIT_VERSION"

        # Check if git repo
        if [ -d .git ]; then
            print_success "Git repository initialized"
        else
            print_warning "Not a git repository. Run: git init"
        fi
    else
        print_error "Git not found"
        exit 1
    fi

    # Check for uncommitted changes
    if [ -d .git ]; then
        if [[ -n $(git status -s) ]]; then
            print_warning "You have uncommitted changes"
            git status -s
        else
            print_success "No uncommitted changes"
        fi
    fi

    # Check for .env files
    if [ -f ".env.local" ]; then
        print_success "Frontend .env.local found"
    else
        print_warning "Frontend .env.local not found"
    fi

    if [ -f "server/.env" ]; then
        print_success "Backend .env found"
    else
        print_warning "Backend .env not found"
    fi

    # Check dependencies
    if [ -d "node_modules" ]; then
        print_success "Frontend dependencies installed"
    else
        print_warning "Frontend dependencies not installed. Run: npm install"
    fi

    if [ -d "server/node_modules" ]; then
        print_success "Backend dependencies installed"
    else
        print_warning "Backend dependencies not installed. Run: cd server && npm install"
    fi

    echo ""
    print_info "Pre-deployment checks complete!"
    read -p "Press enter to continue..."
}

# Prepare for deployment
prepare_deployment() {
    print_header "Preparing for Deployment"
    echo ""

    # Install dependencies
    print_info "Installing frontend dependencies..."
    npm install
    print_success "Frontend dependencies installed"

    print_info "Installing backend dependencies..."
    cd server
    npm install
    print_success "Backend dependencies installed"
    cd ..

    # Build frontend
    print_info "Building frontend..."
    npm run build
    print_success "Frontend build complete"

    # Build backend
    print_info "Building backend..."
    cd server
    npm run build
    print_success "Backend build complete"
    cd ..

    # Run Prisma generate
    print_info "Generating Prisma client..."
    cd server
    npm run prisma:generate
    print_success "Prisma client generated"
    cd ..

    echo ""
    print_success "All builds complete! Ready for deployment."
    read -p "Press enter to continue..."
}

# Deploy to Railway
deploy_railway() {
    print_header "Deploy Backend to Railway"
    echo ""

    if ! command_exists railway; then
        print_warning "Railway CLI not installed"
        echo ""
        echo "Install Railway CLI:"
        echo "  npm i -g @railway/cli"
        echo ""
        echo "Or deploy via Railway dashboard:"
        echo "  https://railway.app"
        echo ""
        read -p "Press enter to continue..."
        return
    fi

    print_info "Linking to Railway project..."
    railway link

    print_info "Deploying backend..."
    cd server
    railway up
    cd ..

    print_success "Backend deployed to Railway!"
    echo ""
    print_info "Get your backend URL:"
    echo "  railway status"
    echo ""
    read -p "Press enter to continue..."
}

# Deploy to Vercel
deploy_vercel() {
    print_header "Deploy Frontend to Vercel"
    echo ""

    if ! command_exists vercel; then
        print_warning "Vercel CLI not installed"
        echo ""
        echo "Install Vercel CLI:"
        echo "  npm i -g vercel"
        echo ""
        echo "Or deploy via Vercel dashboard:"
        echo "  https://vercel.com"
        echo ""
        read -p "Press enter to continue..."
        return
    fi

    print_info "Deploying to Vercel..."
    vercel --prod

    print_success "Frontend deployed to Vercel!"
    read -p "Press enter to continue..."
}

# View deployment guide
view_guide() {
    print_header "Deployment Guide"
    echo ""

    if [ -f "PRODUCTION_DEPLOYMENT.md" ]; then
        if command_exists less; then
            less PRODUCTION_DEPLOYMENT.md
        elif command_exists more; then
            more PRODUCTION_DEPLOYMENT.md
        else
            cat PRODUCTION_DEPLOYMENT.md
        fi
    else
        print_error "PRODUCTION_DEPLOYMENT.md not found"
    fi

    read -p "Press enter to continue..."
}

# Generate environment template
generate_env_template() {
    print_header "Generate Environment Template"
    echo ""

    # Backend .env.example
    cat > server/.env.example << 'EOF'
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# Server Configuration
NODE_ENV=production
PORT=4000

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# CORS
ALLOWED_ORIGINS=https://your-frontend-domain.com

# Razorpay (Optional - works in mock mode without these)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com

# Cloudinary (Optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx

# Resend (Optional)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Admin Configuration
ADMIN_EMAILS=admin@yourdomain.com
EOF

    # Frontend .env.example
    cat > .env.example << 'EOF'
# Backend API URL
VITE_API_URL=https://your-backend-domain.com

# Google OAuth (Optional)
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
EOF

    print_success "Created server/.env.example"
    print_success "Created .env.example"
    echo ""
    print_info "Copy these files to .env and fill in your values:"
    echo "  cp server/.env.example server/.env"
    echo "  cp .env.example .env.local"
    echo ""
    read -p "Press enter to continue..."
}

# Main loop
while true; do
    show_menu
    case $choice in
        1)
            pre_deployment_checks
            ;;
        2)
            prepare_deployment
            ;;
        3)
            deploy_railway
            ;;
        4)
            deploy_vercel
            ;;
        5)
            view_guide
            ;;
        6)
            generate_env_template
            ;;
        7)
            print_info "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid option"
            sleep 1
            ;;
    esac
done
