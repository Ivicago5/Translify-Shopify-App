#!/bin/bash

# Translify Security Hardening Script
# This script implements security best practices for production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

# Configure firewall
configure_firewall() {
    print_status "Configuring firewall..."
    
    # Install ufw if not present
    apt-get install -y ufw
    
    # Reset to defaults
    ufw --force reset
    
    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (adjust port if needed)
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Enable firewall
    ufw --force enable
    
    print_success "Firewall configured"
}

# Configure fail2ban
configure_fail2ban() {
    print_status "Configuring fail2ban..."
    
    # Install fail2ban
    apt-get install -y fail2ban
    
    # Create custom jail configuration
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
filter = nginx-limit-req
logpath = /var/log/nginx/access.log
maxretry = 10
findtime = 600
bantime = 3600
EOF
    
    # Create nginx limit-req filter
    cat > /etc/fail2ban/filter.d/nginx-limit-req.conf << EOF
[Definition]
failregex = limiting requests, excess:.* by zone.*client: <HOST>
ignoreregex =
EOF
    
    # Restart fail2ban
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    print_success "Fail2ban configured"
}

# Configure system security
configure_system_security() {
    print_status "Configuring system security..."
    
    # Update system
    apt-get update && apt-get upgrade -y
    
    # Install security packages
    apt-get install -y unattended-upgrades
    
    # Configure automatic security updates
    cat > /etc/apt/apt.conf.d/50unattended-upgrades << EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
};
Unattended-Upgrade::Package-Blacklist {
};
Unattended-Upgrade::DevRelease "false";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF
    
    # Enable unattended upgrades
    dpkg-reconfigure -plow unattended-upgrades
    
    print_success "System security configured"
}

# Configure SSH security
configure_ssh_security() {
    print_status "Configuring SSH security..."
    
    # Backup original config
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    
    # Create secure SSH configuration
    cat > /etc/ssh/sshd_config << EOF
Port 22
Protocol 2
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key
UsePrivilegeSeparation yes
KeyRegenerationInterval 3600
ServerKeyBits 1024
SyslogFacility AUTH
LogLevel INFO
LoginGraceTime 120
PermitRootLogin no
StrictModes yes
RSAAuthentication yes
PubkeyAuthentication yes
AuthorizedKeysFile %h/.ssh/authorized_keys
IgnoreRhosts yes
RhostsRSAAuthentication no
HostbasedAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
PasswordAuthentication yes
X11Forwarding yes
X11DisplayOffset 10
PrintMotd no
PrintLastLog yes
TCPKeepAlive yes
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
UsePAM yes
EOF
    
    # Restart SSH
    systemctl restart ssh
    
    print_success "SSH security configured"
}

# Configure application security
configure_app_security() {
    print_status "Configuring application security..."
    
    # Create non-root user for application
    useradd -r -s /bin/false translify
    
    # Set proper permissions
    chown -R translify:translify /home/ivicahr/translify
    chmod -R 755 /home/ivicahr/translify
    
    # Create log directories
    mkdir -p /var/log/translify
    chown -R translify:translify /var/log/translify
    
    print_success "Application security configured"
}

# Configure monitoring
configure_monitoring() {
    print_status "Configuring monitoring..."
    
    # Install monitoring tools
    apt-get install -y htop iotop nethogs
    
    # Create monitoring script
    cat > /usr/local/bin/monitor-translify.sh << 'EOF'
#!/bin/bash
# Translify monitoring script

LOG_FILE="/var/log/translify/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check if app is running
if ! pgrep -f "node.*index.js" > /dev/null; then
    echo "[$DATE] ERROR: Translify app is not running" >> $LOG_FILE
    systemctl restart translify
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "[$DATE] WARNING: Disk usage is ${DISK_USAGE}%" >> $LOG_FILE
fi

# Check memory usage
MEM_USAGE=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
if (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
    echo "[$DATE] WARNING: Memory usage is ${MEM_USAGE}%" >> $LOG_FILE
fi
EOF
    
    chmod +x /usr/local/bin/monitor-translify.sh
    
    # Add to crontab (check every 5 minutes)
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/monitor-translify.sh") | crontab -
    
    print_success "Monitoring configured"
}

# Main execution
main() {
    print_status "Starting security hardening..."
    
    check_root
    configure_firewall
    configure_fail2ban
    configure_system_security
    configure_ssh_security
    configure_app_security
    configure_monitoring
    
    print_success "Security hardening completed!"
    print_warning "Please review and test the configuration"
}

main "$@" 