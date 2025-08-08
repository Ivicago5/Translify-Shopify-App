# 🔒 SSL/HTTPS Configuration Guide

This guide provides comprehensive instructions for setting up SSL/HTTPS for the Translify Shopify app in production.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Domain Setup](#domain-setup)
3. [SSL Certificate Setup](#ssl-certificate-setup)
4. [Nginx Configuration](#nginx-configuration)
5. [Security Hardening](#security-hardening)
6. [Testing & Verification](#testing--verification)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

## 🎯 Prerequisites

### Server Requirements
- Ubuntu 20.04+ or Debian 11+
- Root access or sudo privileges
- Domain name pointing to your server
- Port 80 and 443 open

### Domain Requirements
- Domain registered and configured
- DNS A record pointing to your server IP
- Allow 24-48 hours for DNS propagation

## 🌐 Domain Setup

### 1. Domain Configuration

```bash
# Example DNS configuration
# A Record: translify.app -> YOUR_SERVER_IP
# A Record: www.translify.app -> YOUR_SERVER_IP
# CNAME Record: api.translify.app -> translify.app
```

### 2. Verify Domain Resolution

```bash
# Check if domain resolves correctly
nslookup translify.app
dig translify.app

# Test HTTP access
curl -I http://translify.app
```

## 🔐 SSL Certificate Setup

### Option 1: Automated Setup (Recommended)

```bash
# Make script executable
chmod +x scripts/ssl-setup.sh

# Run SSL setup
sudo ./scripts/ssl-setup.sh
```

### Option 2: Manual Setup

#### 1. Install Certbot

```bash
# Update package list
sudo apt update

# Install certbot and nginx plugin
sudo apt install -y certbot python3-certbot-nginx nginx
```

#### 2. Obtain Certificate

```bash
# Stop nginx temporarily
sudo systemctl stop nginx

# Obtain certificate
sudo certbot certonly \
    --standalone \
    --email admin@translify.app \
    --agree-tos \
    --no-eff-email \
    --domains translify.app,www.translify.app
```

#### 3. Configure Nginx

```bash
# Copy production nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/translify

# Enable the site
sudo ln -sf /etc/nginx/sites-available/translify /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## 🛡️ Nginx Configuration

### Production Configuration Features

The `nginx.conf` includes:

- **SSL/TLS Security**: Modern cipher suites and protocols
- **Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- **Rate Limiting**: API and web traffic protection
- **CORS Configuration**: Shopify admin integration
- **Compression**: Gzip for better performance
- **WebSocket Support**: Real-time features
- **Error Handling**: Custom error pages

### Key Security Headers

```nginx
# HSTS (HTTP Strict Transport Security)
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# Content Security Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com; style-src 'self' 'unsafe-inline' https://cdn.shopify.com; img-src 'self' data: https: https://cdn.shopify.com; font-src 'self' https://cdn.shopify.com; connect-src 'self' https://api.shopify.com https://cdn.shopify.com; frame-src https://admin.shopify.com; object-src 'none'; base-uri 'self'; form-action 'self';" always;

# X-Frame-Options
add_header X-Frame-Options DENY always;

# X-Content-Type-Options
add_header X-Content-Type-Options nosniff always;

# X-XSS-Protection
add_header X-XSS-Protection "1; mode=block" always;
```

### Rate Limiting

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=web:10m rate=30r/s;

# Apply to API endpoints
location /api/ {
    limit_req zone=api burst=20 nodelay;
    # ... other configuration
}
```

## 🔒 Security Hardening

### 1. Run Security Hardening Script

```bash
# Make script executable
chmod +x scripts/security-hardening.sh

# Run security hardening
sudo ./scripts/security-hardening.sh
```

### 2. Manual Security Steps

#### Firewall Configuration

```bash
# Install and configure UFW
sudo apt install -y ufw

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH, HTTP, HTTPS
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

#### Fail2ban Configuration

```bash
# Install fail2ban
sudo apt install -y fail2ban

# Create custom configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit configuration for your needs
sudo nano /etc/fail2ban/jail.local

# Restart fail2ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

#### SSH Security

```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config

# Key security settings:
# PermitRootLogin no
# PasswordAuthentication yes (or no for key-only)
# Port 22 (or change to custom port)
# MaxAuthTries 3

# Restart SSH
sudo systemctl restart ssh
```

## 🧪 Testing & Verification

### 1. SSL Certificate Test

```bash
# Test SSL certificate
curl -I https://translify.app

# Check certificate details
openssl s_client -connect translify.app:443 -servername translify.app

# Test with SSL Labs (online)
# https://www.ssllabs.com/ssltest/analyze.html?d=translify.app
```

### 2. Security Headers Test

```bash
# Check security headers
curl -I https://translify.app | grep -E "(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options|Content-Security-Policy)"

# Expected output:
# Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: default-src 'self'; ...
```

### 3. Performance Test

```bash
# Test with Apache Bench
ab -n 1000 -c 10 https://translify.app/

# Test with wrk
wrk -t12 -c400 -d30s https://translify.app/
```

### 4. Shopify Integration Test

```bash
# Test CORS headers
curl -H "Origin: https://admin.shopify.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS https://translify.app/api/translations
```

## 📊 Monitoring & Maintenance

### 1. Certificate Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Manual renewal
sudo certbot renew

# Check renewal status
sudo certbot certificates
```

### 2. Log Monitoring

```bash
# Monitor nginx access logs
tail -f /var/log/nginx/translify.access.log

# Monitor nginx error logs
tail -f /var/log/nginx/translify.error.log

# Monitor fail2ban logs
tail -f /var/log/fail2ban.log
```

### 3. Performance Monitoring

```bash
# Check nginx status
sudo systemctl status nginx

# Check SSL certificate expiration
echo | openssl s_client -servername translify.app -connect translify.app:443 2>/dev/null | openssl x509 -noout -dates

# Monitor system resources
htop
iotop
nethogs
```

### 4. Automated Monitoring

The security hardening script creates a monitoring script that runs every 5 minutes:

```bash
# Check monitoring logs
tail -f /var/log/translify/monitor.log

# Manual monitoring check
/usr/local/bin/monitor-translify.sh
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Certificate Not Obtained

**Problem:** Certbot fails to obtain certificate
**Solution:**
```bash
# Check domain resolution
nslookup translify.app

# Check if port 80 is accessible
sudo netstat -tlnp | grep :80

# Check nginx configuration
sudo nginx -t

# Try standalone mode
sudo certbot certonly --standalone --domains translify.app
```

#### 2. Nginx Configuration Errors

**Problem:** Nginx fails to start
**Solution:**
```bash
# Test nginx configuration
sudo nginx -t

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx
```

#### 3. SSL Certificate Expired

**Problem:** Certificate expired or not renewing
**Solution:**
```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Check renewal logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

#### 4. Security Headers Missing

**Problem:** Security headers not appearing
**Solution:**
```bash
# Check nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Test headers
curl -I https://translify.app
```

### Debug Commands

```bash
# Check SSL certificate
openssl s_client -connect translify.app:443 -servername translify.app

# Check nginx processes
ps aux | grep nginx

# Check open ports
sudo netstat -tlnp

# Check firewall status
sudo ufw status

# Check fail2ban status
sudo fail2ban-client status
```

## 📚 Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [SSL Labs SSL Test](https://www.ssllabs.com/ssltest/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Shopify App Security Requirements](https://shopify.dev/apps/getting-started/app-requirements)

## ✅ Checklist

- [ ] Domain DNS configured and propagated
- [ ] SSL certificate obtained and installed
- [ ] Nginx configured with SSL
- [ ] Security headers implemented
- [ ] Rate limiting configured
- [ ] Firewall enabled
- [ ] Fail2ban configured
- [ ] SSH security hardened
- [ ] Monitoring set up
- [ ] Certificate auto-renewal configured
- [ ] Performance tested
- [ ] Security tested
- [ ] Documentation updated

---

**Note:** This SSL/HTTPS setup provides enterprise-grade security suitable for Shopify App Store deployment. Regular monitoring and maintenance are essential for ongoing security. 