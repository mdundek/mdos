#!/bin/bash

sudo su
apt-get update -y && apt-get upgrade -yes

# Firewall
ufw allow ssh
ufw allow http
ufw allow https

ufw enable

# Create mount folders
mkdir /media/storage
mkdir /media/multimedia
mkdir /media/backup

# Get partition UUIDs
lsblk -o NAME,FSTYPE,UUID

# Open fstab file
vi /etc/fstab

echo "UUID=5dd2af09-b490-43bf-a688-e8c5f6a557ef /media/storage ext4 defaults 0 2" >> /etc/fstab
echo "UUID=445d3106-669d-492e-b537-b444e9a666b2 /media/multimedia ext4 defaults 0 2" >> /etc/fstab
echo "UUID=67643a4b-4bb9-45b2-9530-838bb48deb05 /media/backup ext4 defaults 0 2" >> /etc/fstab

mount -a