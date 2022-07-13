# Minio S3

## Use AWS CLI to work with Minio

### Configure client

``` sh title="Use for Minio S3 Client"
aws configure

# Values: 
AWS Access Key ID [****************W55N]: xxxx
AWS Secret Access Key [****************Bjdu]: xxxx
Default region name [None]: us-east-1
Default output format [None]:
```

Set s3 API endpoint for minio:

```sh
aws configure set default.s3.signature_version s3v4
```

### Usage

#### Create new bucket:

`aws --endpoint-url https://minio-backup.<yourdomain> s3 mb s3://mybucket`

#### List buckets:

`aws --endpoint-url https://minio-backup.<yourdomain> s3 ls`

#### Upload file to bucket:

`aws --endpoint-url https://minio-backup.<yourdomain> cp ./argparse-1.2.1.tar.gz s3://mybucket`

#### List bucket content:

`aws --endpoint-url https://minio-backup.<yourdomain> s3 ls s3://mybucket`

#### Remove item from bucket:

`aws --endpoint-url https://minio-backup.<yourdomain> rm s3://mybucket/argparse-1.2.1.tar.gz`

#### Delete bucket:

`aws --endpoint-url https://minio-backup.<yourdomain> s3 rb s3://mybucket`

#### Sync folder content with bucket:

`aws --endpoint-url https://minio-backup.<yourdomain> s3 sync . s3://mybucket/sync_folder/`