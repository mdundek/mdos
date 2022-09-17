# Installation & setup

## MDos platform

> :warning: **Warning:** At the moment, only Ubuntu >= 20.04 is supported. Debian and Alpine are planned next

First, clone this repo on your target machine:

```sh
git clone https://github.com/mdundek/mdos.git
```

### Master node & MDos control plane

Then, install the platform by calling the following script as root:

```sh
sudo ./mdos-setup/install.sh
```

During the installation of the CLI, you will be asked to provide a few details.  

#### Administrator credentials 

```
Admin user account
-------------------------------------
Enter a admin username for the platform: mdundek

Enter the admin email address for the default keycloak client user: mdundek@mymail.com

Enter a admin password for the platform: supersecret
```


#### Domain & certificate setup

```
Domain name and certificate
-------------------------------------
>   You already have a certificate and a wild card domain
>   You have a Cloudflare domain, but no certificates
>   Generate and use self signed, do not have a domain

Enter your DNS root domain name (ex. mydomain.com): mydomain.com

Is your domain "mydomain.com" resolvable through a public or private DNS server?
>   Yes
>   No

MDos will need to know how to reach it's FTP server from within the
cluster without DNS resolution. An IP address is therefore required.

Please enter the local IP address for this machine: 192.168.50.177
```

#### Kubernetes workload storage directory path

```
Kubernetes Storage
-------------------------------------
MDos uses Longhorn as the primary storage class for your Kubernetes workload data volumes.
You can use Longhorn's default storage folder for this (/var/lib/longhorn), or specify
your own folder path in case you want to mount a external disk as the storage target for
your platform storage needs.

Would you like to customize the directory path used by longhorn to mount your filesystems at?
>   Yes
>   No

Specify the path where you wish to store your cluster storage data at (absolute path): /content/kubestorage

WARN: This directory path does not exist.
Would you like to create this folder?
>   Yes
>   No
```

#### Private registry max size

```
Private registry
-------------------------------------
MDos provides you with a private registry that you can use to store your application
images on. This registry is shared amongst all tenants on your cluster (ACL is
implemented to protect tenant specific images).

How many Gi (Gigabytes) do you want to allocate to your registry volume: 10
```

> :memo: **Note:** Please note that this storage capacity will be located on your main Kubernetes storage path specified above

#### FTP sync server for Kubernetes POD data provisionning

```
FTP volume sync server
-------------------------------------
Users will be able to easiely synchronize / mirror their static datasets with application
during deployments. This requires that the data is stored on the MDos platform so that
the user who deploys his/her applications can synchronize that data with the platform
upfront. Once done, the deploying application can automatically update / mirror those
changes to your PODs before your application actually starts.
Please note that this data will remain on the MDos platform until the namespace / tenant
is deleted, or that you explicitely requested a volume folder to be deleted.
Keeping the data available enables you to easiely do delta sync operations iteratively
without having to upload it all every time you change your datasets.
You can store this buffered data on any partition folder you like.

Enter a full path to use to store all tenant/namespace volume data for synchronization purposes: /content/ftpstorage

WARN: This directory path does not exist.
Would you like to create this folder?
>   Yes
>   No
```


<!-- 
## Set up the MDos platform

To install the platform, you can use the `mdos` CLI to do so. For a more granual installation, the setup is split into multiple steps:

* Install and create your `Cloudflare - Certbot SSL certificate` & auto-renewal for your domain
* Install `Code-server` so that you can develop your applications using your favorite browser
* Install the `K3S & Calico` application runtime environement
* Install `HELM` for Kubernetes
* Install `Istio` for ingress
* Install a local `NGinx` server as a reverse proxy for your platform (also used to load-balance between nodes if you have more than one)
* Install a local `private Docker regisytry` on the K3S cluster
* Install `Pure-ftpd` stack using docker-compose

The CLI command that will allow you to install each one of these components is `mdos core-setup`:

![CLI](img/setup/cli.png)

> You need to execute each one of those commands in the right order. Each component might ask for extra parameters to accomplish it's specific setup.

### 01 - Cloudflare & certbot SSL

Select `01_certbot` as the target installation step. You will be asked to enter your:

* Cloudflare email address
* Cloudflare API token

Your SSL certificate is now setup and will automatically renew when necessary.  
Your crontab has also been updated to automatically update your public IP address on Cloudflare.

#### Router config

> Make sure you configured your router to route ports 80 & 443 to this machine before moving forward with this script.  

#### Cloudflare DNS config 
  
> Also make sure your domain is configured on CloudFlare:
> ![Cloudflare](img/setup/cloudflare.png)

#### Cloudflare API config

> Create a CloudFlare API key as well, you will need it here (`My Profile -> API Token`):  
> ![Cloudflare API](img/setup/cloudflare_api.png)


### 02 - Code-server setup

Select `02_codeserver` as the target installation step. You will be asked to specify a code-server password.

> Once done, your code-server instance will be up and running, but you will have to wait untill you set up NGinx before being able to access it.  
> Once that is done, you will be able to access your Code-server instance on the following URL: `https://cs.<your domain>`

### 03 - K3S & Calico setup

Select `03_k3s` as the target installation step. You will be asked to enter your:

* The private docker registry username
* The private docker registry password

> Those will be used to set up your self signed registry certificate, along with your docker daemon and K3S containerd exceptions for the certificate.

### 04 - HELM setup

Select `04_helm` as the target installation step.  
This is straight forward, HELM is used to install applications on the mdos platform.

### 05 - Istio Ingress setup

Select `05_istio` as the target installation step. 

> If you update the istio HELM yaml files, make sure to set the ingress-gateway nodeports to 30977 (status-port), 30978 (http2) & 30979 (https) in the yaml file `files/istio_helm/gateways/istio-ingress/values.yaml`

### 06 - NGinx reverse proxy setup

Select `06_nginx` as the target installation step. You will be asked to enter your:

* WAN facing username
* WAN facing password

This NGinx server will capture traffic on port 443 on your machine, and forward this traffic to your local code-server, as well as to all applications running on your K3S cluster. Segregagtion happens on the HOST subdomain used with your CloudFlare main domain name.  
Unless configured otherwise, the NGinx server will also enforce user authentication for all application it serves except for Minio who comes with's it's own authentication mechanism.

> NOTE: NGinx is installed navively on the host, rather than as a container in the cluster. 

### 07 - Private docker registry setup

Select `07_registry` as the target installation step. 

> This registry is used by Kubernetes to store and distribute your private application images

### 08 - Minio S3 backup server setup

Select `08_minio` as the target installation step. You will be asked to enter your:

* The minio storage path to use
* Minio ACCESS_KEY to use
* Minio SECRET_KEY to use

> Once that is done, you will be able to access:
>  
> * The Minio console: `https://minio-console.<your domain>`
> * The Minio S3 server: `https://minio-backup.<your domain>`

## Extra

### disk mounts

```sh title="Example of disk mounts in linux"
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
``` -->