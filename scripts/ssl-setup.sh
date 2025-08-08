#!/bin/bash

# Translify SSL Setup Script
# This script sets up SSL certificates using Let's Encrypt

set -e

# Configuration
DOMAIN="translify.app"
EMAIL="admin@translify.app"
WEBROOT="/var/www/html"

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

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

# Install required packages
install_packages() {
    print_status "Installing required packages..."
    
    # Update package list
    apt-get update
    
    # Install certbot and nginx
    apt-get install -y certbot python3-certbot-nginx nginx
    
    print_success "Packages installed successfully"
}

# Create webroot directory
create_webroot() {
    print_status "Creating webroot directory..."
    
    mkdir -p $WEBROOT
    chown -R www-data:www-data $WEBROOT
    chmod -R 755 $WEBROOT
    
    # Create a simple index.html for verification
    cat > $WEBROOT/index.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Translify - SSL Verification</title>
</head>
<body>
    <h1>Translify SSL Setup</h1>
    <p>This page is used for SSL certificate verification.</p>
</body>
</html>
EOF
    
    print_success "Webroot directory created"
}

# Configure Nginx for certificate verification
configure_nginx_certbot() {
    print_status "Configuring Nginx for certificate verification..."
    
    # Create temporary Nginx configuration
    cat > /etc/nginx/sites-available/translify-temp << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    root $WEBROOT;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ =404;
    }
    
    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root $WEBROOT;
    }
}
EOF
    
    # Enable the site
    ln -sf /etc/nginx/sites-available/translify-temp /etc/nginx/sites-enabled/
    
    # Test and reload Nginx
    nginx -t
    systemctl reload nginx
    
    print_success "Nginx configured for certificate verification"
}

# Obtain SSL certificate
obtain_certificate() {
    print_status "Obtaining SSL certificate from Let's Encrypt..."
    
    # Stop Nginx temporarily for standalone verification
    systemctl stop nginx
    
    # Obtain certificate using standalone mode
    certbot certonly \
        --standalone \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --domains $DOMAIN,www.$DOMAIN \
        --pre-hook "systemctl stop nginx" \
        --post-hook "systemctl start nginx"
    
    print_success "SSL certificate obtained successfully"
}

# Configure Nginx with SSL
configure_nginx_ssl() {
    print_status "Configuring Nginx with SSL..."
    
    # Copy our production Nginx configuration
    cp nginx.conf /etc/nginx/sites-available/translify
    
    # Enable the site
    ln -sf /etc/nginx/sites-available/translify /etc/nginx/sites-enabled/
    
    # Remove temporary configuration
    rm -f /etc/nginx/sites-enabled/translify-temp
    
    # Test and reload Nginx
    nginx -t
    systemctl reload nginx
    
    print_success "Nginx configured with SSL"
}

# Set up automatic renewal
setup_renewal() {
    print_status "Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > /usr/local/bin/renew-ssl.sh << 'EOF'
#!/bin/bash
certbot renew --quiet --post-hook "systemctl reload nginx"
EOF
    
    chmod +x /usr/local/bin/renew-ssl.sh
    
    # Add to crontab (renew twice daily)
    (crontab -l 2>/dev/null; echo "0 2,14 * * * /usr/local/bin/renew-ssl.sh") | crontab -
    
    print_success "Automatic renewal configured"
}

# Test SSL configuration
test_ssl() {
    print_status "Testing SSL configuration..."
    
    # Test Nginx configuration
    if nginx -t; then
        print_success "Nginx configuration is valid"
    else
        print_error "Nginx configuration is invalid"
        exit 1
    fi
    
    # Test SSL certificate
    if curl -s -I https://$DOMAIN > /dev/null; then
        print_success "SSL certificate is working"
    else
        print_warning "SSL certificate test failed - check your domain DNS"
    fi
    
    # Test security headers
    print_status "Testing security headers..."
    curl -s -I https://$DOMAIN | grep -E "(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options)"
}

# Main execution
main() {
    print_status "Starting SSL setup for Translify..."
    
    check_root
    install_packages
    create_webroot
    configure_nginx_certbot
    obtain_certificate
    configure_nginx_ssl
    setup_renewal
    test_ssl
    
    print_success "SSL setup completed successfully!"
    print_status "Your app is now available at: https://$DOMAIN"
    print_status "Certificate will auto-renew twice daily"
}

# Run main function
main "$@" 