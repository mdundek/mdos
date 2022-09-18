# Installation & setup

## MDos platform

> **Warning:** At the moment, only Ubuntu >= 20.04 is supported. Debian and Alpine are planned next

First, clone this repo on your target machine:

```sh
git clone https://github.com/mdundek/mdos.git
```

### Master node & MDos control plane

Install the platform by calling the following script as root:

```sh
sudo ./mdos-setup/install.sh
```

During the installation of the CLI, you will be asked to provide a few details.  

#### Administrator credentials 

The platform will create a overall admin account on the platform. Please provide the admin username, email and password first:

```
Admin user account
-------------------------------------
Enter a admin username for the platform: mdundek

Enter the admin email address for the default keycloak client user: mdundek@mymail.com

Enter a admin password for the platform: supersecret
```

#### Domain & certificate setup

Some of the components such as the registry auth server require a TLS certificate to function.  
The installation script will give you multiple choices here:

1. You have a valid certificate at hand that you would like to use
2. You have a domain name on `Cloudflare`, and would like to set it up using `LetsEncrypt`
3. You have no certificate and would like to create a self-signed certificate (only suited for developement purposes)

> **Warning:** For developement purposes, you can have the platform generate a self signed certificate for you, but SSO / OIDC functionality will not work with a self-signed certificate.  
> For production, you will have to use a fully valid certificate in order to use all of MDos features. 

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

Please enter the local IP address for this machine: XXX.XXX.XXX.XXX
```

> **Note:** This example is based on the 3rd option, a self signed certificate. Other questions will be asked according to your choices.

#### Kubernetes workload storage directory path

When you deploy applications onto your Kubernetes cluster, chances are that your applications will require to use permanent / persisted storage. Containers by default do not persist data beyond a container restart, You will therefore have to persist your container data on Kubernetes managed storage.  
MDos uses `Longhorn` from Rancher for this as a storage class. Longhorn will allocate your container volumes in a dedicated directory on each Cluster Node. This is your chance to customize this directory path in case you want to store this data on an external hard drive that you mounted onto your host system:

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

MDos comes with a private registry where you can store your images on. The Kubernetes cluster is configured to use this registry if that's what you want to do in order to keep your images inhouse. This is also a must if you intend to run the platform in offline mode.  
The registry runs in Kubernetes, it therefore needs to allocate some storage to it so that it can persist it's data on your disk. Here you need to specify how much space you wish to allocate to this registry (in Gigabytes).

```
Private registry
-------------------------------------
MDos provides you with a private registry that you can use to store your application
images on. This registry is shared amongst all tenants on your cluster (ACL is
implemented to protect tenant specific images).

How many Gi (Gigabytes) do you want to allocate to your registry volume: 10
```

> **Note:** Please note that this storage capacity will be located on your main Kubernetes storage path specified above

#### FTP sync server for Kubernetes POD data provisionning

When running applications in kubernetes using CSI storage plugins, you usually end up with a blank volume once your pod starts for the first time. This is usually a pain point for many developers who end up using `hostPath` mount points instead. This is an antipatern and does not go well with multi-node cluster environements where you can not easiely predict where your pod is going to start.  
MDos provides you with a means to initialize your application pods with data pre-alocated to it's volumes. This can be very usefull for usecases such as (but not only):

* Provision a volume with a already pre-established database schema and data set for initialization purposes (or any other type of initialization data sets)
* Provision static data such as websites
* or for anything else for that matter...

This is achieved by providing a centralized storage space on the mdos platform where a FTP server will allow you to (using the mdos CLI) mirror your application volume data from your local machine to the centralized FTP storage device where Kubernetes will then mirror those data volumes onto your POD volumes using `initContainers` and the FTP protocol.  
Here you are being asked to provide a directory path to where this centralized data will be hosted.  
Again, this is your chance to customize this directory path in case you want to store this data on an external hard drive that you mounted onto your host system:

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

#### Configure Keycloak and set up the master token

After a few minutes (can take up to 10 minutes, depending on your internet speed), you will be asked to set up Keycloak and provide a secret token to the installation script.   
This token is necessary so that mdos can administer everything it needs on Keycload.  
The script provides you with detailed instructions on how to do so, simply follow them and enter the secret `token` from the Keycloak website.

```
To finalyze the setup, do the following:

  1. Open a browser and go to:
     https://keycloak.mydomain.com/admin/master/console/#/realms/master/clients
  2. From the 'Clients' section, click on the client 'master-realm'
  3. Change 'Access Type' value to 'confidential'
  4. Enable the boolean value 'Service Accounts Enabled'
  5. Set 'Valid Redirect URIs' value to '*'
  6. Save those changes (button at the bottom of the page)
  7. In tab 'Roles', Click on button 'edit' for role 'magage realm'.
     Enable 'Composite roles' and add 'admin' realm to associated roles
  8. Go to the 'Service Account Roles' tab and add the role 'admin' to the 'Assigned Roles' box
  9. Click on tab 'Credentials'
 10. When ready, copy and paste the 'Secret' value into this terminal, then press enter:

SECRET: cXXyx8EtGGL8BgCC9zVYQidKYuctzuXA
```

---

That's it, once the installation script is finished you are ready to use the platform.



### The MDos CLI

#### Linux & Mac OSX

The standalone install is a simple tarball with a binary. It contains its own node.js binary and autoupdates.

To set up the CLI in /usr/local/lib/mdos and /usr/local/bin/mdos, run the following script. The script requires sudo and isn’t Windows compatible.

```sh
curl https://raw.githubusercontent.com/mdundek/mdos/main/mdos-cli/infra/install-linux-mac.sh | sh
```

#### Windows

Comming soon


#### Verify Your Installation

To verify your CLI installation, use the mdos --version command:

```
mdos --version
mdos-cli/0.0.0 linux-x64 node-v18.9.0
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