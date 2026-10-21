#!/usr/bin/env bash
# ==============================================================================
# CLMS Frontend AWS EC2 Deployment Script (Replacing Vercel with AWS EC2)
# Course: Professional Skills II (Generic Track: Cloud Infrastructure-I)
# Code: HME - COMP-PS301 | TCET Autonomous (CBCGS-HME 2023)
# ==============================================================================

set -euo pipefail

# ----------------- Configuration Variables -----------------
AWS_REGION="ap-south-1"                 # Mumbai region
KEY_NAME="clms-frontend-key"
INSTANCE_TYPE="t2.micro"                # 100% Free Tier (750 hours/month)
SG_NAME="clms-frontend-sg"
BACKEND_API_URL="https://ip-clms.onrender.com"

echo "================================================================="
echo " CLMS FRONTEND DEPLOYMENT ON AWS EC2 (FREE TIER) "
echo "================================================================="

echo "=== [Step 1] Verifying AWS CLI and Credentials ==="
aws sts get-caller-identity --output table

# ----------------- Step 2: VPC & Security Group -----------------
echo "=== [Step 2] Configuring Security Group for Web (Port 80) and SSH (Port 22) ==="
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)
echo "Using Default VPC: ${VPC_ID}"

if ! SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=${SG_NAME}" --query "SecurityGroups[0].GroupId" --output text 2>/dev/null) || [ "$SG_ID" == "None" ] || [ -z "$SG_ID" ]; then
  SG_ID=$(aws ec2 create-security-group \
    --group-name "${SG_NAME}" \
    --description "Security group for CLMS Next.js Frontend on EC2" \
    --vpc-id "${VPC_ID}" \
    --query 'GroupId' --output text)

  aws ec2 authorize-security-group-ingress --group-id "${SG_ID}" --protocol tcp --port 22 --cidr 0.0.0.0/0
  aws ec2 authorize-security-group-ingress --group-id "${SG_ID}" --protocol tcp --port 80 --cidr 0.0.0.0/0
  echo "Created Security Group: ${SG_ID} with Ports 22 and 80 open."
else
  echo "Reusing existing Security Group: ${SG_ID}"
fi

# ----------------- Step 3: SSH Key Pair (Exp 3) -----------------
echo "=== [Step 3] Checking SSH Key Pair ==="
if [ ! -f "${KEY_NAME}.pem" ]; then
  if aws ec2 describe-key-pairs --key-names "${KEY_NAME}" >/dev/null 2>&1; then
    aws ec2 delete-key-pair --key-name "${KEY_NAME}"
  fi
  aws ec2 create-key-pair --key-name "${KEY_NAME}" --query 'KeyMaterial' --output text > "${KEY_NAME}.pem"
  chmod 400 "${KEY_NAME}.pem"
  echo "Generated new private key: ${KEY_NAME}.pem"
else
  echo "Existing key pair ${KEY_NAME}.pem found."
fi

# ----------------- Step 4: Resolve Ubuntu 22.04 LTS AMI -----------------
echo "=== [Step 4] Resolving Official Ubuntu 22.04 LTS AMI ==="
UBUNTU_AMI_ID=$(aws ssm get-parameter --name /aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id --query "Parameter.Value" --output text)
echo "Resolved AMI: ${UBUNTU_AMI_ID}"

# ----------------- Step 5: Prepare Cloud-Init User-Data -----------------
echo "=== [Step 5] Preparing EC2 Automated Provisioning Script ==="
USER_DATA_FILE="/tmp/clms-user-data.sh"

cat << 'EOF' > "${USER_DATA_FILE}"
#!/bin/bash
set -ex

# 1. Setup 2GB Swap Memory (Prevents OOM during build on t2.micro)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 2. Install Node.js 22 LTS, Nginx, and build dependencies
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get update
apt-get install -y nodejs nginx git

# 3. Install pnpm and pm2
npm install -g pnpm pm2

# 4. Clone CLMS Repository
cd /home/ubuntu
git clone https://github.com/ShreyashGitHubb/IP_CLMS.git
chown -R ubuntu:ubuntu /home/ubuntu/IP_CLMS

# 5. Build Next.js Frontend
cd /home/ubuntu/IP_CLMS
sudo -u ubuntu pnpm install
sudo -u ubuntu NEXT_PUBLIC_API_URL="https://ip-clms.onrender.com" pnpm run build

# 6. Start Frontend with PM2 as ubuntu user
sudo -u ubuntu pm2 start "pnpm start" --name "clms-frontend"
env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
sudo -u ubuntu pm2 save

# 7. Configure Nginx Reverse Proxy
cat << 'NGINX' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

nginx -t
systemctl restart nginx
EOF

# ----------------- Step 6: Launch Free-Tier EC2 Instance -----------------
echo "=== [Step 6] Launching EC2 Instance (t2.micro - Free Tier) ==="
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "${UBUNTU_AMI_ID}" \
  --count 1 \
  --instance-type "${INSTANCE_TYPE}" \
  --key-name "${KEY_NAME}" \
  --security-group-ids "${SG_ID}" \
  --user-data file://"${USER_DATA_FILE}" \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=CLMS-Frontend-EC2}]' \
  --query 'Instances[0].InstanceId' --output text)

rm -f "${USER_DATA_FILE}"

echo "Instance launched: ${INSTANCE_ID}. Waiting for running state..."
aws ec2 wait instance-running --instance-ids "${INSTANCE_ID}"

PUBLIC_IP=$(aws ec2 describe-instances --instance-ids "${INSTANCE_ID}" --query "Reservations[0].Instances[0].PublicIpAddress" --output text)
PUBLIC_DNS=$(aws ec2 describe-instances --instance-ids "${INSTANCE_ID}" --query "Reservations[0].Instances[0].PublicDnsName" --output text)

echo "================================================================="
echo " CLMS FRONTEND SUCCESSFULLY PROVISIONED ON AWS! "
echo "================================================================="
echo " Instance ID   : ${INSTANCE_ID}"
echo " Instance Type : ${INSTANCE_TYPE} (100% Free Tier)"
echo " Public IP     : ${PUBLIC_IP}"
echo " Web URL       : http://${PUBLIC_IP}"
echo " SSH Command   : ssh -i ${KEY_NAME}.pem ubuntu@${PUBLIC_IP}"
echo ""
echo "=== [MANDATORY ACTION ON RENDER] ==="
echo "Add this origin to 'APP_ORIGINS' in your Render Dashboard:"
echo "http://${PUBLIC_IP}"
echo "================================================================="
