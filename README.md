# mdundek.network

## Cloudflare credentials

```
mdundek@gmail.com
dns_cloudflare_api_key = fe5beef86732475a7073b122139f64f9f49ee
```

Need to configure Cloudflare DNS resolution for target host to redirect to home IP address. Also configure router to route ports 80 & 443 to this machine.

## Istio updates

Set ingress-gateway nodeports to 30977, 30978, 30979

## disk mounts

```sh
# Create mount folders
mkdir /media/storage
mkdir /media/multimedia
mkdir /media/backup

# Get partition UUIDs
# lsblk -o NAME,FSTYPE,UUID

# Open fstab file
vi /etc/fstab

echo "UUID=5dd2af09-b490-43bf-a688-e8c5f6a557ef /media/storage ext4 defaults 0 2" >> /etc/fstab
echo "UUID=445d3106-669d-492e-b537-b444e9a666b2 /media/multimedia ext4 defaults 0 2" >> /etc/fstab
echo "UUID=67643a4b-4bb9-45b2-9530-838bb48deb05 /media/backup ext4 defaults 0 2" >> /etc/fstab

mount -a
```


## Configure Cloudflare IP update Cronjob

Open crontab with `sudo crontab -e`, and append:

```
5 6 * * * /home/mdundek/workspaces/mdundek.network/scripts/90_update_ip_cloudflare.sh
```

Restart crontab service:
`
```
sudo /etc/init.d/cron restart
```

## Use AWS CLI to work with Minio examples

```sh
aws configure
```

Values:

```sh
AWS Access Key ID [****************W55N]: xxxx
AWS Secret Access Key [****************Bjdu]: xxxx
Default region name [None]: us-east-1
Default output format [None]:
```

Set s3 API endpoint for minio:

```sh
aws configure set default.s3.signature_version s3v4
```

Create new bucket:

```sh
aws --endpoint-url https://minio.mdundek.network s3 mb s3://mybucket
```

List buckets:

```sh
aws --endpoint-url https://minio.mdundek.network s3 ls
```

Upload file to bucket:

```
aws --endpoint-url https://minio.mdundek.network cp ./argparse-1.2.1.tar.gz s3://mybucket
```

List bucket content:

```
aws --endpoint-url https://minio.mdundek.network s3 ls s3://mybucket
```

Remove item from bucket:

```
aws --endpoint-url https://minio.mdundek.network rm s3://mybucket/argparse-1.2.1.tar.gz
```

Delete bucket:

```
aws --endpoint-url https://minio.mdundek.network s3 rb s3://mybucket
```



Sync folder content with bucket:

```
aws --endpoint-url https://minio.mdundek.network s3 sync . s3://mybucket/sync_folder/
```