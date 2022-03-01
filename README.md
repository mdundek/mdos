# mdundek.network

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