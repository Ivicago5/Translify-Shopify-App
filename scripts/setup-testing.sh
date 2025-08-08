#!/bin/bash

# 🚀 Translify Testing Setup Script
# This script helps prepare your app for testing on real Shopify stores

set -e

echo "🚀 Translify Testing Setup"
echo "=========================="

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

# Check if we're in the right directory
if [ ! -f "shopify.app.toml" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting Translify testing setup..."

# Step 1: Check prerequisites
print_status "Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
    print_error "git is not installed. Please install git first."
    exit 1
fi

print_success "Prerequisites check passed"

# Step 2: Install dependencies
print_status "Installing dependencies..."

# Install backend dependencies
if [ -d "backend" ]; then
    cd backend
    npm install
    cd ..
    print_success "Backend dependencies installed"
else
    print_warning "Backend directory not found"
fi

# Install frontend dependencies
if [ -d "web/frontend" ]; then
    cd web/frontend
    npm install
    cd ../..
    print_success "Frontend dependencies installed"
else
    print_warning "Frontend directory not found"
fi

# Step 3: Set up environment
print_status "Setting up environment..."

# Check if .env exists
if [ ! -f ".env" ]; then
    if [ -f "env.example" ]; then
        cp env.example .env
        print_success "Created .env file from template"
        print_warning "Please edit .env file with your actual values"
    else
        print_error "env.example not found"
        exit 1
    fi
else
    print_success ".env file already exists"
fi

# Step 4: Database setup
print_status "Setting up database..."

# Create data directory if it doesn't exist
mkdir -p data

# Check if database exists
if [ ! -f "data/translify.db" ]; then
    print_status "Creating SQLite database..."
    touch data/translify.db
    print_success "Database file created"
else
    print_success "Database file already exists"
fi

# Step 5: Build frontend
print_status "Building frontend..."

if [ -d "web/frontend" ]; then
    cd web/frontend
    npm run build
    cd ../..
    print_success "Frontend built successfully"
else
    print_warning "Frontend directory not found, skipping build"
fi

# Step 6: Check configuration
print_status "Checking configuration..."

# Check shopify.app.toml
if [ -f "shopify.app.toml" ]; then
    print_success "shopify.app.toml found"
else
    print_error "shopify.app.toml not found"
    exit 1
fi

# Check web/shopify.web.toml
if [ -f "web/shopify.web.toml" ]; then
    print_success "web/shopify.web.toml found"
else
    print_error "web/shopify.web.toml not found"
    exit 1
fi

# Step 7: Generate checklist
print_status "Generating testing checklist..."

cat > TESTING_CHECKLIST.md << 'EOF'
# 🧪 Translify Testing Checklist

## 📋 Pre-Testing Setup
- [ ] Development store created
- [ ] Sample products added (10-20 products)
- [ ] App installed on store
- [ ] Environment variables configured in .env
- [ ] Database migrations run
- [ ] Backend server running
- [ ] Frontend deployed

## 🔧 Environment Variables to Set
- [ ] SHOPIFY_API_KEY
- [ ] SHOPIFY_API_SECRET
- [ ] APP_URL
- [ ] GOOGLE_TRANSLATE_API_KEY
- [ ] DATABASE_URL
- [ ] SESSION_SECRET
- [ ] NODE_ENV=production

## 🧪 Functionality Testing
- [ ] App loads in Shopify admin
- [ ] Dashboard displays correctly
- [ ] Product translation works
- [ ] Theme extension loads
- [ ] Translation caching works
- [ ] Rate limiting handles load
- [ ] Error handling works

## 📊 Performance Testing
- [ ] Test with 50+ products
- [ ] Test translation speed
- [ ] Test concurrent users
- [ ] Monitor API usage
- [ ] Check database performance

## 🔒 Security Testing
- [ ] HTTPS working
- [ ] API keys secure
- [ ] Rate limiting active
- [ ] Input validation working
- [ ] SQL injection protection

## 🚨 Common Issues to Check
- [ ] App not loading (check app URL and SSL)
- [ ] Translations not working (check API keys)
- [ ] Rate limiting (increase limits if needed)
- [ ] Theme extension not showing (check installation)

## 📈 Success Metrics
- [ ] App load time < 3 seconds
- [ ] Translation response time < 2 seconds
- [ ] 99% uptime
- [ ] < 1% error rate
- [ ] Successful translation rate > 95%

## 🎯 Next Steps
1. Choose testing option (Development store recommended)
2. Set up your environment (follow DEPLOYMENT_GUIDE.md)
3. Deploy your app
4. Test thoroughly using this checklist
5. Monitor performance
6. Iterate and improve
EOF

print_success "Testing checklist generated: TESTING_CHECKLIST.md"

# Step 8: Final instructions
echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your actual values"
echo "2. Choose your testing option:"
echo "   - Option A: Development store (recommended)"
echo "   - Option B: Partner development store"
echo "   - Option C: Production store (advanced)"
echo "3. Follow the DEPLOYMENT_GUIDE.md for detailed instructions"
echo "4. Use TESTING_CHECKLIST.md to track your progress"
echo ""
echo "🔗 Useful resources:"
echo "- Shopify Partners: https://partners.shopify.com"
echo "- Google Cloud Console: https://console.cloud.google.com"
echo "- Let's Encrypt SSL: https://letsencrypt.org"
echo ""
echo "🚀 Ready to test your app!" 