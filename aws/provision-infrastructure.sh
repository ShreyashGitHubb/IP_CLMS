#!/usr/bin/env bash
# ==============================================================================
# CLMS AWS Infrastructure Automation Script (Exp 11 - AWS CLI Automation)
# Course: Professional Skills II (Generic Track: Cloud Infrastructure-I)
# Code: HME - COMP-PS301 | TCET Autonomous (CBCGS-HME 2023)
# ==============================================================================

set -euo pipefail

# ----------------- Configuration Variables -----------------
AWS_REGION="ap-south-1"                 # Mumbai region
KEY_NAME="clms-key"
INSTANCE_TYPE="t2.micro"                # Free Tier eligible (750 hours/month)
UBUNTU_AMI_ID=""                        # Auto-resolved below
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
BUCKET_NAME="clms-equipment-docs-${ACCOUNT_ID}"
EC2_SG_NAME="clms-ec2-sg"
IAM_ROLE_NAME="CLMS-EC2-Role"
IAM_PROFILE_NAME="CLMS-EC2-Profile"

echo "=== [Step 1] Verifying AWS CLI and Credentials ==="
aws sts get-caller-identity --output table
echo "Target AWS Region : ${AWS_REGION}"
echo "S3 Bucket Name    : ${BUCKET_NAME}"

# ----------------- Step 2: IAM Role & Profile (Exp 12) -----------------
echo "=== [Step 2] Creating IAM EC2 Role and Instance Profile (Exp 12) ==="
if ! aws iam get-role --role-name "${IAM_ROLE_NAME}" 2>/dev/null; then
  aws iam create-role --role-name "${IAM_ROLE_NAME}" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {"Service": "ec2.amazonaws.com"},
          "Action": "sts:AssumeRole"
        }
      ]
    }'
  
  aws iam attach-role-policy --role-name "${IAM_ROLE_NAME}" --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
  aws iam attach-role-policy --role-name "${IAM_ROLE_NAME}" --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
fi

if ! aws iam get-instance-profile --instance-profile-name "${IAM_PROFILE_NAME}" 2>/dev/null; then
  aws iam create-instance-profile --instance-profile-name "${IAM_PROFILE_NAME}"
  aws iam add-role-to-instance-profile --instance-profile-name "${IAM_PROFILE_NAME}" --role-name "${IAM_ROLE_NAME}"
fi

# ----------------- Step 3: VPC & Security Groups -----------------
echo "=== [Step 3] Configuring Security Groups for EC2 and RDS ==="
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)
echo "Using Default VPC: ${VPC_ID}"

# EC2 Security Group
if ! EC2_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=${EC2_SG_NAME}" --query "SecurityGroups[0].GroupId" --output text 2>/dev/null) || [ "$EC2_SG_ID" == "None" ]; then
  EC2_SG_ID=$(aws ec2 create-security-group \
    --group-name "${EC2_SG_NAME}" \
    --description "CLMS Web and Application Security Group" \
    --vpc-id "${VPC_ID}" \
    --query 'GroupId' --output text)

  aws ec2 authorize-security-group-ingress --group-id "${EC2_SG_ID}" --protocol tcp --port 22 --cidr 0.0.0.0/0
  aws ec2 authorize-security-group-ingress --group-id "${EC2_SG_ID}" --protocol tcp --port 80 --cidr 0.0.0.0/0
  aws ec2 authorize-security-group-ingress --group-id "${EC2_SG_ID}" --protocol tcp --port 443 --cidr 0.0.0.0/0
  aws ec2 authorize-security-group-ingress --group-id "${EC2_SG_ID}" --protocol tcp --port 8080 --cidr 0.0.0.0/0
fi
echo "EC2 Security Group ID: ${EC2_SG_ID}"

# ----------------- Step 4: SSH Key Pair (Exp 3) -----------------
echo "=== [Step 4] Checking SSH Key Pair (Exp 3) ==="
if [ ! -f "${KEY_NAME}.pem" ]; then
  aws ec2 create-key-pair --key-name "${KEY_NAME}" --query 'KeyMaterial' --output text > "${KEY_NAME}.pem"
  chmod 400 "${KEY_NAME}.pem"
  echo "Created private key: ${KEY_NAME}.pem"
else
  echo "Key pair ${KEY_NAME}.pem already exists."
fi

# ----------------- Step 5: Query Latest Ubuntu AMI -----------------
echo "=== [Step 5] Resolving Ubuntu 22.04 LTS AMI ==="
UBUNTU_AMI_ID=$(aws ssm get-parameter --name /aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id --query "Parameter.Value" --output text)
echo "Resolved AMI: ${UBUNTU_AMI_ID}"

# ----------------- Step 6: Launch EC2 Instance (Exp 3, 4) -----------------
echo "=== [Step 6] Launching EC2 Cloud Virtual Machine (Exp 3, 4) ==="
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "${UBUNTU_AMI_ID}" \
  --count 1 \
  --instance-type "${INSTANCE_TYPE}" \
  --key-name "${KEY_NAME}" \
  --security-group-ids "${EC2_SG_ID}" \
  --iam-instance-profile Name="${IAM_PROFILE_NAME}" \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=CLMS-App-Server}]' \
  --query 'Instances[0].InstanceId' --output text)

echo "EC2 Instance launched: ${INSTANCE_ID}. Waiting for running state..."
aws ec2 wait instance-running --instance-ids "${INSTANCE_ID}"

PUBLIC_IP=$(aws ec2 describe-instances --instance-ids "${INSTANCE_ID}" --query "Reservations[0].Instances[0].PublicIpAddress" --output text)
INSTANCE_AZ=$(aws ec2 describe-instances --instance-ids "${INSTANCE_ID}" --query "Reservations[0].Instances[0].Placement.AvailabilityZone" --output text)
echo "Instance is RUNNING!"
echo "Public IP: ${PUBLIC_IP}"
echo "Availability Zone: ${INSTANCE_AZ}"

# ----------------- Step 7: Create & Attach EBS Volumes (Exp 5, 6) -----------------
echo "=== [Step 7] Creating 2x EBS gp3 Volumes for LVM (Exp 5, 6) ==="
VOL1_ID=$(aws ec2 create-volume \
  --availability-zone "${INSTANCE_AZ}" \
  --size 5 \
  --volume-type gp3 \
  --encrypted \
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=CLMS-Vol-1}]' \
  --query 'VolumeId' --output text)

VOL2_ID=$(aws ec2 create-volume \
  --availability-zone "${INSTANCE_AZ}" \
  --size 5 \
  --volume-type gp3 \
  --encrypted \
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=CLMS-Vol-2}]' \
  --query 'VolumeId' --output text)

echo "Created Volume 1: ${VOL1_ID}"
echo "Created Volume 2: ${VOL2_ID}"

aws ec2 wait volume-available --volume-ids "${VOL1_ID}" "${VOL2_ID}"

echo "Attaching volumes to instance..."
aws ec2 attach-volume --volume-id "${VOL1_ID}" --instance-id "${INSTANCE_ID}" --device /dev/sdf
aws ec2 attach-volume --volume-id "${VOL2_ID}" --instance-id "${INSTANCE_ID}" --device /dev/sdg

# ----------------- Step 8: S3 Object Storage with Lifecycle & Versioning (Exp 7) -----------------
echo "=== [Step 8] Creating S3 Bucket with Versioning & Lifecycle Rules (Exp 7) ==="
aws s3api create-bucket --bucket "${BUCKET_NAME}" --region "${AWS_REGION}" --create-bucket-configuration LocationConstraint="${AWS_REGION}"
aws s3api put-bucket-versioning --bucket "${BUCKET_NAME}" --versioning-configuration Status=Enabled

cat << 'EOF' > /tmp/clms-s3-lifecycle.json
{
  "Rules": [
    {
      "ID": "CLMSArchivePolicy",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "Transitions": [
        {"Days": 30, "StorageClass": "STANDARD_IA"},
        {"Days": 90, "StorageClass": "GLACIER"}
      ],
      "NoncurrentVersionExpiration": {"NoncurrentDays": 180}
    }
  ]
}
EOF
aws s3api put-bucket-lifecycle-configuration --bucket "${BUCKET_NAME}" --lifecycle-configuration file:///tmp/clms-s3-lifecycle.json
rm -f /tmp/clms-s3-lifecycle.json
echo "S3 Bucket created: ${BUCKET_NAME} with Versioning & Lifecycle active."

# ----------------- Summary Output -----------------
echo "================================================================="
echo " CLMS AWS INFRASTRUCTURE DEPLOYMENT COMPLETE! "
echo "================================================================="
echo " EC2 Instance ID   : ${INSTANCE_ID}"
echo " Public IP Address : ${PUBLIC_IP}"
echo " SSH Command       : ssh -i ${KEY_NAME}.pem ubuntu@${PUBLIC_IP}"
echo " EBS Volume 1      : ${VOL1_ID} (/dev/sdf)"
echo " EBS Volume 2      : ${VOL2_ID} (/dev/sdg)"
echo " S3 Storage Bucket : ${BUCKET_NAME}"
echo " Next Step         : SSH into VM and run 'sudo bash setup-lvm.sh'"
echo "================================================================="
