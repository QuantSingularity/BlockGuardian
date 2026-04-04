#!/bin/bash
# User Data Script for Financial-Grade Instance Hardening
# This script implements security hardening measures for PCI DSS, SOC 2, and ISO 27001 compliance

set -euo pipefail

# Variables from template
ENVIRONMENT="${environment}"
APP_NAME="${app_name}"
CLOUDWATCH_CONFIG="${cloudwatch_config}"
SECRETS_MANAGER_ARN="${secrets_manager_arn}"
KMS_KEY_ID="${kms_key_id}"
LOG_GROUP_NAME="${log_group_name}"
ENABLE_SSM="${enable_ssm}"
COMPLIANCE_MODE="${compliance_mode}"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /var/log/user-data.log
}

log "Starting instance hardening for $APP_NAME in $ENVIRONMENT environment"

# Update system packages
log "Updating system packages..."
yum update -y

# Install essential security packages
log "Installing security packages..."
yum install -y \
    aide \
    audit \
    fail2ban \
    rkhunter \
    chkrootkit \
    clamav \
    clamav-update \
    chrony \
    rsyslog \
    logrotate \
    htop \
    iotop \
    tcpdump \
    strace \
    lsof

# Install AWS CLI v2
log "Installing AWS CLI v2..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
rm -rf aws awscliv2.zip

# Install CloudWatch Agent if enabled
if [ "$CLOUDWATCH_CONFIG" = "true" ]; then
    log "Installing CloudWatch Agent..."
    wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
    rpm -U ./amazon-cloudwatch-agent.rpm
    rm -f ./amazon-cloudwatch-agent.rpm
fi

# Install SSM Agent if enabled
if [ "$ENABLE_SSM" = "true" ]; then
    log "Installing SSM Agent..."
    yum install -y amazon-ssm-agent
    systemctl enable amazon-ssm-agent
    systemctl start amazon-ssm-agent
fi

# Configure time synchronization
log "Configuring time synchronization..."
systemctl enable chronyd
systemctl start chronyd
chrony sources -v

# Configure audit daemon
log "Configuring audit daemon..."
cat > /etc/audit/rules.d/audit.rules << 'EOF'
# Delete all existing rules
-D

# Buffer Size
-b 8192

# Failure Mode
-f 1

# Audit the audit logs themselves
-w /var/log/audit/ -p wa -k auditlog

# Audit the use of audit management tools
-w /sbin/auditctl -p x -k audittools
-w /sbin/auditd -p x -k audittools

# Kernel parameters
-w /etc/sysctl.conf -p wa -k sysctl

# Kernel module loading and unloading
-a always,exit -F arch=b64 -S init_module,delete_module -k modules
-a always,exit -F arch=b32 -S init_module,delete_module -k modules

# System administrator actions
-w /etc/sudoers -p wa -k scope
-w /etc/sudoers.d/ -p wa -k scope

# Login configuration and information
-w /etc/login.defs -p wa -k login
-w /etc/securetty -p wa -k login
-w /var/log/faillog -p wa -k login
-w /var/log/lastlog -p wa -k login
-w /var/log/tallylog -p wa -k login

# Network Environment
-a always,exit -F arch=b64 -S sethostname,setdomainname -k network
-a always,exit -F arch=b32 -S sethostname,setdomainname -k network
-w /etc/issue -p wa -k network
-w /etc/issue.net -p wa -k network
-w /etc/hosts -p wa -k network
-w /etc/sysconfig/network -p wa -k network

# System startup scripts
-w /etc/inittab -p wa -k init
-w /etc/init.d/ -p wa -k init
-w /etc/init/ -p wa -k init

# Library search paths
-w /etc/ld.so.conf -p wa -k libpath

# Systemwide library preloads (LD_PRELOAD)
-w /etc/ld.so.preload -p wa -k libpath

# Pam configuration
-w /etc/pam.d/ -p wa -k pam
-w /etc/security/limits.conf -p wa -k pam
-w /etc/security/pam_env.conf -p wa -k pam
-w /etc/security/namespace.conf -p wa -k pam
-w /etc/security/namespace.init -p wa -k pam

# SSH configuration
-w /etc/ssh/sshd_config -p wa -k sshd

# Crontab (scheduled jobs)
-w /var/spool/cron/root -p wa -k cron
-w /etc/crontab -p wa -k cron
-w /etc/cron.d/ -p wa -k cron
-w /etc/cron.daily/ -p wa -k cron
-w /etc/cron.hourly/ -p wa -k cron
-w /etc/cron.monthly/ -p wa -k cron
-w /etc/cron.weekly/ -p wa -k cron

# User, group, password databases
-w /etc/group -p wa -k etcgroup
-w /etc/passwd -p wa -k etcpasswd
-w /etc/gshadow -k etcgroup
-w /etc/shadow -k etcpasswd
-w /etc/security/opasswd -k opasswd

# Mount operations
-a always,exit -F arch=b64 -S mount -F auid>=1000 -F auid!=4294967295 -k mounts
-a always,exit -F arch=b32 -S mount -F auid>=1000 -F auid!=4294967295 -k mounts

# File deletions
-a always,exit -F arch=b64 -S unlink -S unlinkat -S rename -S renameat -F auid>=1000 -F auid!=4294967295 -k delete
-a always,exit -F arch=b32 -S unlink -S unlinkat -S rename -S renameat -F auid>=1000 -F auid!=4294967295 -k delete

# Changes to system administration scope
-w /etc/sudoers -p wa -k scope
-w /etc/sudoers.d/ -p wa -k scope

# Kernel module loading and unloading
-w /sbin/insmod -p x -k modules
-w /sbin/rmmod -p x -k modules
-w /sbin/modprobe -p x -k modules

# Make the configuration immutable
-e 2
EOF

systemctl enable auditd
systemctl restart auditd

# Configure SSH hardening
log "Hardening SSH configuration..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
cat > /etc/ssh/sshd_config << 'EOF'
# SSH Configuration for Financial-Grade Security

Port 22
Protocol 2

# Hostkeys for protocol version 2
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key

# Ciphers and keying
RekeyLimit default none
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,hmac-sha2-256,hmac-sha2-512
KexAlgorithms curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512

# Logging
SyslogFacility AUTHPRIV
LogLevel VERBOSE

# Authentication
LoginGraceTime 60
PermitRootLogin no
StrictModes yes
MaxAuthTries 3
MaxSessions 2
PubkeyAuthentication yes
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes

# Kerberos options
KerberosAuthentication no
KerberosOrLocalPasswd no
KerberosTicketCleanup yes

# GSSAPI options
GSSAPIAuthentication no
GSSAPICleanupCredentials yes

# Accept locale-related environment variables
AcceptEnv LANG LC_CTYPE LC_NUMERIC LC_TIME LC_COLLATE LC_MONETARY LC_MESSAGES
AcceptEnv LC_PAPER LC_NAME LC_ADDRESS LC_TELEPHONE LC_MEASUREMENT
AcceptEnv LC_IDENTIFICATION LC_ALL LANGUAGE
AcceptEnv XMODIFIERS

# Allow client to pass locale environment variables
AcceptEnv LANG LC_*

# override default of no subsystems
Subsystem sftp /usr/libexec/openssh/sftp-server

# Disable unused authentication methods
HostbasedAuthentication no
IgnoreUserKnownHosts yes
IgnoreRhosts yes
PermitUserEnvironment no
Compression no
ClientAliveInterval 300
ClientAliveCountMax 2
AllowTcpForwarding no
AllowAgentForwarding no
GatewayPorts no
X11Forwarding no
PermitTunnel no
Banner /etc/issue.net
EOF

# Create security banner
cat > /etc/issue.net << 'EOF'
***************************************************************************
                            NOTICE TO USERS

This computer system is the private property of its owner, whether
individual, corporate or government.  It is for authorized use only.
Users (authorized or unauthorized) have no explicit or implicit
expectation of privacy.

Any or all uses of this system and all files on this system may be
intercepted, monitored, recorded, copied, audited, inspected, and/or
disclosed to your employer, to authorized site, government, and law
enforcement personnel, as well as authorized officials of government
agencies, both domestic and foreign.

By using this system, the user consents to such interception, monitoring,
recording, copying, auditing, inspection, and disclosure at the
discretion of such personnel or officials.  Unauthorized or improper use
of this system may result in civil and criminal penalties and
administrative or disciplinary action, as appropriate. By continuing to
use this system you indicate your awareness of and consent to these terms
and conditions of use. LOG OFF IMMEDIATELY if you do not agree to the
conditions stated in this warning.

****************************************************************************
EOF

systemctl restart sshd

# Configure fail2ban
log "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s
EOF

systemctl enable fail2ban
systemctl start fail2ban

# Configure system limits
log "Configuring system limits..."
cat >> /etc/security/limits.conf << 'EOF'
# Security limits for financial applications
* soft core 0
* hard core 0
* soft nproc 65536
* hard nproc 65536
* soft nofile 65536
* hard nofile 65536
EOF

# Configure kernel parameters for security
log "Configuring kernel security parameters..."
cat > /etc/sysctl.d/99-security.conf << 'EOF'
# IP Spoofing protection
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.rp_filter = 1

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Ignore send redirects
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Disable source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0

# Log Martians
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Ignore ICMP ping requests
net.ipv4.icmp_echo_ignore_all = 1

# Ignore Directed pings
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Disable IPv6 if not needed
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1

# Enable TCP SYN Cookies
net.ipv4.tcp_syncookies = 1

# Restrict core dumps
fs.suid_dumpable = 0

# Hide kernel pointers
kernel.kptr_restrict = 2

# Restrict dmesg access
kernel.dmesg_restrict = 1

# Restrict access to kernel logs
kernel.printk = 3 3 3 3

# Enable ASLR
kernel.randomize_va_space = 2
EOF

sysctl -p /etc/sysctl.d/99-security.conf

# Configure log rotation
log "Configuring log rotation..."
cat > /etc/logrotate.d/security << 'EOF'
/var/log/audit/audit.log {
    daily
    rotate 90
    compress
    delaycompress
    missingok
    create 0600 root root
    postrotate
        /sbin/service auditd restart 2> /dev/null > /dev/null || true
    endscript
}

/var/log/secure {
    daily
    rotate 90
    compress
    delaycompress
    missingok
    create 0600 root root
}

/var/log/messages {
    daily
    rotate 90
    compress
    delaycompress
    missingok
    create 0644 root root
}
EOF

# Initialize AIDE database
log "Initializing AIDE database..."
aide --init
mv /var/lib/aide/aide.db.new.gz /var/lib/aide/aide.db.gz

# Configure ClamAV
log "Configuring ClamAV..."
freshclam
systemctl enable clamd@scan
systemctl start clamd@scan

# Setup CloudWatch Agent configuration if enabled
if [ "$CLOUDWATCH_CONFIG" = "true" ]; then
    log "Configuring CloudWatch Agent..."
    cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF
{
    "agent": {
        "metrics_collection_interval": 60,
        "run_as_user": "cwagent"
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/messages",
                        "log_group_name": "$LOG_GROUP_NAME",
                        "log_stream_name": "{instance_id}/messages"
                    },
                    {
                        "file_path": "/var/log/secure",
                        "log_group_name": "$LOG_GROUP_NAME",
                        "log_stream_name": "{instance_id}/secure"
                    },
                    {
                        "file_path": "/var/log/audit/audit.log",
                        "log_group_name": "$LOG_GROUP_NAME",
                        "log_stream_name": "{instance_id}/audit"
                    },
                    {
                        "file_path": "/var/log/user-data.log",
                        "log_group_name": "$LOG_GROUP_NAME",
                        "log_stream_name": "{instance_id}/user-data"
                    }
                ]
            }
        }
    },
    "metrics": {
        "namespace": "CWAgent",
        "metrics_collected": {
            "cpu": {
                "measurement": [
                    "cpu_usage_idle",
                    "cpu_usage_iowait",
                    "cpu_usage_user",
                    "cpu_usage_system"
                ],
                "metrics_collection_interval": 60,
                "totalcpu": false
            },
            "disk": {
                "measurement": [
                    "used_percent"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "diskio": {
                "measurement": [
                    "io_time"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "mem": {
                "measurement": [
                    "mem_used_percent"
                ],
                "metrics_collection_interval": 60
            },
            "netstat": {
                "measurement": [
                    "tcp_established",
                    "tcp_time_wait"
                ],
                "metrics_collection_interval": 60
            },
            "swap": {
                "measurement": [
                    "swap_used_percent"
                ],
                "metrics_collection_interval": 60
            }
        }
    }
}
EOF

    # Start CloudWatch Agent
    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
        -a fetch-config \
        -m ec2 \
        -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
        -s
fi

# Create application user with restricted permissions
log "Creating application user..."
useradd -r -s /bin/false -d /opt/$APP_NAME $APP_NAME
mkdir -p /opt/$APP_NAME
chown $APP_NAME:$APP_NAME /opt/$APP_NAME
chmod 750 /opt/$APP_NAME

# Set up application directories
mkdir -p /opt/$APP_NAME/{bin,config,logs,data}
chown -R $APP_NAME:$APP_NAME /opt/$APP_NAME
chmod -R 750 /opt/$APP_NAME

# Configure rsyslog for centralized logging
log "Configuring rsyslog..."
cat > /etc/rsyslog.d/49-security.conf << 'EOF'
# Security event logging
auth,authpriv.*                 /var/log/auth.log
*.*;auth,authpriv.none          /var/log/syslog
daemon.notice                   /var/log/daemon.log
kern.*                          /var/log/kern.log
mail.*                          /var/log/mail.log
user.*                          /var/log/user.log
*.emerg                         :omusrmsg:*

# Forward logs to CloudWatch if configured
# This would be configured via CloudWatch Agent
EOF

systemctl restart rsyslog

# Final security checks
log "Running final security checks..."

# Check for rootkits
rkhunter --update
rkhunter --propupd
rkhunter --check --skip-keypress --report-warnings-only

# Set proper file permissions
chmod 600 /etc/ssh/ssh_host_*_key
chmod 644 /etc/ssh/ssh_host_*_key.pub
chmod 644 /etc/ssh/sshd_config

# Remove unnecessary packages and clean up
yum remove -y gcc gcc-c++ make kernel-devel
yum autoremove -y
yum clean all

# Clear bash history
history -c
cat /dev/null > ~/.bash_history

log "Instance hardening completed successfully for $APP_NAME in $ENVIRONMENT environment"

# Signal completion
/opt/aws/bin/cfn-signal -e $? --stack $APP_NAME-$ENVIRONMENT --resource AutoScalingGroup --region $(curl -s http://169.254.169.254/latest/meta-data/placement/region) || true

log "User data script execution completed"
