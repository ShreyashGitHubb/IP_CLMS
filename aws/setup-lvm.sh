#!/usr/bin/env bash
# ==============================================================================
# CLMS Logical Volume Manager (LVM) Setup Script (Exp 5 & Exp 6)
# Target: AWS EC2 Ubuntu 22.04 VM with 2x 5GB Attached EBS Volumes
# ==============================================================================

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root using 'sudo bash setup-lvm.sh'"
  exit 1
fi

echo "=== [Step 1] Inspecting Block Devices (lsblk) ==="
lsblk

# Devices might appear as /dev/xvdf or /dev/nvme1n1 depending on instance type
DEV1="/dev/xvdf"
DEV2="/dev/xvdg"

if [ ! -b "$DEV1" ] && [ -b "/dev/nvme1n1" ]; then
  DEV1="/dev/nvme1n1"
  DEV2="/dev/nvme2n1"
fi

echo "Detected target disks: $DEV1 and $DEV2"

# ----------------- Step 2: Create Physical Volumes (PV) -----------------
echo "=== [Step 2] Initializing Physical Volumes (pvcreate) ==="
pvcreate "$DEV1" "$DEV2"
pvdisplay

# ----------------- Step 3: Create Volume Group (VG) -----------------
echo "=== [Step 3] Creating Volume Group 'vg_clms' (vgcreate) ==="
vgcreate vg_clms "$DEV1" "$DEV2"
vgs
vgdisplay vg_clms

# ----------------- Step 4: Create Logical Volumes (LV) -----------------
echo "=== [Step 4] Creating Logical Volumes (lvcreate) ==="
# lv_logs: 4GB dedicated for application and server logs
lvcreate -L 4G -n lv_logs vg_clms
# lv_uploads: 4GB dedicated for equipment documents and file cache
lvcreate -L 4G -n lv_uploads vg_clms
lvs

# ----------------- Step 5: Format with ext4 Filesystem -----------------
echo "=== [Step 5] Formatting Logical Volumes with ext4 ==="
mkfs.ext4 /dev/vg_clms/lv_logs
mkfs.ext4 /dev/vg_clms/lv_uploads

# ----------------- Step 6: Create Mount Points & Mount -----------------
echo "=== [Step 6] Creating Mount Points and Mounting Volumes ==="
mkdir -p /var/log/clms
mkdir -p /var/data/clms_uploads

mount /dev/vg_clms/lv_logs /var/log/clms
mount /dev/vg_clms/lv_uploads /var/data/clms_uploads

chown -R ubuntu:ubuntu /var/log/clms /var/data/clms_uploads
chmod 775 /var/log/clms /var/data/clms_uploads

# ----------------- Step 7: Configure /etc/fstab for Persistence -----------------
echo "=== [Step 7] Updating /etc/fstab for Persistent Mounts Across Reboots ==="
if ! grep -q "lv_logs" /etc/fstab; then
  echo "/dev/vg_clms/lv_logs    /var/log/clms          ext4    defaults,nofail 0 2" >> /etc/fstab
fi

if ! grep -q "lv_uploads" /etc/fstab; then
  echo "/dev/vg_clms/lv_uploads /var/data/clms_uploads   ext4    defaults,nofail 0 2" >> /etc/fstab
fi

# ----------------- Step 8: Verify Filesystem Status -----------------
echo "=== [Step 8] LVM Verification and Filesystem Status ==="
df -h /var/log/clms /var/data/clms_uploads

echo ""
echo "================================================================="
echo " LVM SETUP SUCCESSFULLY COMPLETED! "
echo " Application Logs Mounted At : /var/log/clms (4 GB)"
echo " Equipment Uploads Mounted At: /var/data/clms_uploads (4 GB)"
echo " Available VG Free Space     : ~2 GB (run 'vgs' to view)"
echo " Dynamic Resize Demo Command : sudo lvextend -L +1G /dev/vg_clms/lv_logs && sudo resize2fs /dev/vg_clms/lv_logs"
echo "================================================================="
