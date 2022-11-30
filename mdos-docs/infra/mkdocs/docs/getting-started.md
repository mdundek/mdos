---
hide:
  - navigation
---

# Getting Started

We will build a similar `hello world` example application now, but to keep thinks simple, we will not deploy a backend component along with the frontend component, and not work with volumes yet. Those will be subjects for later on.  

!!! info "Choose according to your MDos platform deployment type"

    There are two ways to install the MDos Platform:

    1. __MDos managed cluster mode__
    2. __MDos Framework only mode__

    This `getting started` section has an example for both MDos deployment types

## 1. MDos managed cluster: "Hello World" example

<object width="100%" height="800"><param name="movie" value="https://www.youtube.com/v/W7PUZd0LD_o&hl=en&fs=1&vq=hd720"></param><param name="allowFullScreen" value="true"></param><embed src="https://www.youtube.com/v/W7PUZd0LD_o&hl=en&fs=1&vq=hd720" type="application/x-shockwave-flash" allowfullscreen="true" width="100%" height="800"></embed></object>

### Configure your CLI to point to a MDos platform API host

Before we can start using the mdos CLI, we need to tell it what MDos API server to talk to.

!!! info "Self signed certificates and domain names"

    If you installed the platform using a self-signed certificate without any valid domain names configured, then you will have to ensure that all required platform hostname are configured on your local machine `hosts` file before you proceed.  
    In Linux and Mac OSX, your can configure those in your `/etc/hosts` file. In Windows, this file is located under `c:\Windows\System32\Drivers\etc\hosts`.  
    For more information, please refer to the chapter [Special notes about self-signed certificates without a resolvable DNS name](/mdos/installation/#special-notes-about-self-signed-certificates-without-a-resolvable-dns-name)

To configure the target MDos platform API server endpoint with your CLI, use the following command:

```
mdos configure api-endpoint https://mdos-api.mydomain.com
```

!!! info "Note"

    Replace `mydomain.com` with your actual root domain name used during the platform installation procedure.  

You are now ready to start using the platform.

### Create a tenant namespace

In Kubernetes, `namespaces` are used to group assets together so that they can be properly administered & run in their own scoped context.  
In MDos, we assign a dedicated `namespace` to each tenant on the platform. Applications belong to a tenant namespace, without the namespace we can not deploy our application.  

To create a new tenant namespace called `a-team`, run the following command:

``` hl_lines="1"
mdos namespace create

WARN : Your current token has expired or is invalid. You need to re-authenticate

? Please enter your username: admin-username
? Please enter your password: [hidden]

? Enter a namespace name to create: a-team
Creating namespace... done
```

!!! info "Authentication"

    If this is the first time you interact with the platform (or if your JWT token has expired like in the example above), you will be asked to authenticate yourself first. In our case, we did not add any platform users yet, so we will simply use the `admin` user account that was used during the platform installation procedure (in this example, the admin username is called `admin-username`).  
    If you already have your own user account on the platform, and you have sufficient permissions to create new tenant namespaces and deploy applications, then please go ahead and use this one instead.  

When using MDos in it's managed cluster mode, what happened on the platform side when you create a namespace using the MDos CLI? Here are some high level details:

1. Create a new Client in Keycloak, required to manage users that will interact with this namespace
2. Create available default roles for this Keycloak client / namespace (`admin`, `k8s-write`, `k8s-read`, `ftp-write`, `registry-pull`, `registry-push`)
3. Create namespace in Kubernetes
4. Create namespace roles so that we can apply RBAC permissions to users
5. Configure service account / credentials in Keycloak for `ftpd` and `registry` access for this namespace

!!! info "Note"

    Details about these concepts are out of scope in this chapter

### Create a new application

Let's create a new application project using the `mdos` CLI command:

``` hl_lines="1"
mdos generate application
? Enter a application name: hello-world
? Enter a tenant name that this application belongs to: a-team
```

This will create a new folder with the `mdos.yaml` configuration file in it. We are now ready to create application components.

### Create a new application component

Inside your application project folder, run the following command:

``` hl_lines="3"
cd hello-world

mdos generate component
? Enter a application component name: hello-world-server
```

The CLI will ask you a couple of things about some base configuration parameters.

This will create a new component folder with an empty `Dockerfile` for you to use, as well as update the `mdos.yaml` file referencing the component as part of the overall application project along with it's configuration parameters.  

You can now go ahead and implement your `hello-world-server` application component. Let's do just that. We will create a basic NodeJS HTTP server for this demonstration that will return "hello world" when invoked.  

Create a new file: `hello-world/hello-world-server/index.js` 

``` javascript linenums="1" title="index.js"
const http = require('http'); // Loads the http module 

http.createServer((request, response) => {
    
    // 1. Tell the browser everything is OK (Status code 200), and the data is in plain text
    response.writeHead(200, {
        'Content-Type': 'text/plain'
    });

    // 2. Write the announced text to the body of the page
    response.write('Hello, World!\n');

    // 3. Tell the server that all of the response headers and body have been sent
    response.end();

}).listen(8080); // 4. Tells the server what port to be on

```

Last but not least, we need to populate our component `Dockerfile` so that we can build our container image during deployments. Open the `Dockerfile` that is inside the `hello-world-server` folder and set it's content to the following:

``` dockerfile linenums="1" title="Dockerfile"
FROM node:16

# Create app directory
WORKDIR /usr/src/app

# Bundle app source
COPY ./server.js .

EXPOSE 8080
CMD [ "node", "server.js" ]
```

Ok, we have an application ready to use now. Next, we need to tell our `mdos` application that we want to expose port `8080`, and set up an ingress config to expose it outside of the cluster using the hostname `hello-world.mydomain.com`.

!!! info "Custom domain names"

    As of now, MDos uses the platform wildcard domain name that was configured during the installation of the platform in order to expose any application you deploy on it.  
    You can of course add other domain names for your various applications if you like, to do so you will have to create a new `ingress-gateway` configuration in your namespace, but this is out of scope in this example. 

Let's start with exposing port `8080` for our application component, which can be done with a kubernetes `service`. Move into the `hello-world-server` component folder and execute the following command:

``` hl_lines="1"
mdos generate service
? Enter a name for the service to add a port to: http
? Specify a port number on which your application needs to be accessible on: 8080
```

And finally, the ingress so that we have a hostname configured to access this application:

``` hl_lines="1"
mdos generate ingress
? Enter a name for the ingress: http-ingress
? What hostname do you want to use to access your component port: hello-world.mydomain.com
? Do you want to match a subpath for this host? No
? What target port should this traffic be redirected to? 8080
? What type of traffic will this ingress handle? http
```

!!! info "Note"

    Again, replace `mydomain.com` with whatever domain you configured during the platform installation.

That's it, this is what your project file structure should look like now:

``` title="Project structure"
hello-world
├── hello-world-server
│   ├── Dockerfile
│   └── server.js
├── mdos.yaml
└── volumes
    └── README.md
```

Let's have a look at the generated code in the `mdos.yaml` file:

``` yaml linenums="1" title="mdos.yaml"
schemaVersion: v1
tenantName: a-team
appName: hello-world
uuid: mvx10-x2wip
components:
  - name: hello-world-server
    image: hello-world
    uuid: qx8su-jwqvi
    tag: 0.0.1
    services:
      - name: http
        ports:
          - port: 8080
    ingress:
      - name: http-ingress
        matchHost: hello-world.mydomain.com
        targetPort: 8080
        trafficType: http
```

!!! info

    All application configuration features will live inside this `yaml` file, even for the most advanced use-cases and config needs, everything will be here. No need to get dirty with low level kubernetes assets to make it all happen, the platform will translate it all into the proper artefact for you.  
    To learn more about everything that you can configure for your deployments in this yaml file, please check out the [MDos application reference documentation](/reference-documentation)

### Deploy your `hello-world` application on the cluster

!!! info "Note"

    Since this is a basic example, we will skip user management, authentication or any other advanced topics for now. Since we authenticated with the MDos admin user account, we can deploy onto this namespace without creating / assigning users & permissions for this namespace.

Move into the `hello-world` application and execute the command:

``` hl_lines="1"
mdos application deploy

Synching volumes... done

To push your images to the mdos registry, you need to provide your mdos username and password first

? Username: admin-username
? Password: ********

Building application image registry.mydomain.com/a-team/hello-world:0.0.1... done
Pushing application image registry.mydomain.com/a-team/hello-world:0.0.1... done
Deploying application... scheduled

Pod: hello-world-server
    Phase: Running
    Container: hello-world-hello-world-server
        State: running
        Details: n/a

SUCCESS : Application deployed
```

That's it, your application should now be accessible on the following domain: `https://hello-world.mydomain.com`

![Hello world](/mdos/img/getting-started/hello-world.png)

!!! info "Next steps"

    Please have a look at the chapter [MDos application reference documentation](/mdos/reference-documentation/) for a complete list of what you can configure in the `mdos.yaml` file, as well as the chapter [Advanced Resources](/mdos/advanced-resources/) to find out how to maximize usage of the platform for more advanced use-cases and features. 

## 2. MDos framework only: "Hello World" example

### Configure your CLI to point to a MDos platform API host

Before we can start using the mdos CLI, we need to tell it what MDos API server to talk to.

To configure the target MDos platform API server endpoint with your CLI, use the following command:

```
mdos configure api-endpoint https://mdos-api.mydomain.com
```

!!! info "Note"

    If you installed the MDos Framework platform using the `mdos` CLI onto your cluster from the same machine than the one you are doing this tutorial from, then you can skip this step since the CLI is already configured. Otherwise, replace the endpoint URL `https://mdos-api.mydomain.com` with the actual URL you configured to access the MDos API server 

You are now ready to start using the platform.

### Create a tenant namespace

In Kubernetes, `namespaces` are used to group assets together so that they can be properly administered & run in their own scoped context.  
In MDos, we assign a dedicated `namespace` to each tenant on the platform. Applications belong to a tenant namespace, without the namespace we can not deploy our application.  

To create a new tenant namespace called `a-team`, run the following command:

``` hl_lines="1"
mdos namespace create

? Enter a namespace name to create: a-team
Creating namespace... done
```

### Create a new application

Let's create a new application project using the `mdos` CLI command:

``` hl_lines="1"
mdos generate application
? Enter a application name: hello-world
? Enter a tenant name that this application belongs to: a-team
```

This will create a new folder with the `mdos.yaml` configuration file in it. We are now ready to create application components.

### Create a new application component

Inside your application project folder, run the following command:

``` hl_lines="3"
cd hello-world

mdos generate component
? Enter a application component name: hello-world-server
? What network policy do you want to apply to this component: private (No one can talk to this component)
? Is the component image accessible publicly? Yes
? Does your target registry require authentication to pull images? No
```

!!! info "Private / Public Registries"

    In MDos framework only mode, there is no private registry available with the platform. Therefore the CLI will ask you a couple of extra questions in order to specify a potential private registry of your own. If that registry requires you to authenticate with it in order to pull & push images from / to the registry, you will have the possibility to specify a `secret` reference name that holds those credentials as well.

This will create a new component folder with an empty `Dockerfile` for you to use, as well as update the `mdos.yaml` file referencing the component as part of the overall application project along with it's configuration parameters.  

You can now go ahead and implement your `hello-world-server` application component. Let's do just that. We will create a basic NodeJS HTTP server for this demonstration that will return "hello world" when invoked.  

Create a new file: `hello-world/hello-world-server/index.js` 

``` javascript linenums="1" title="index.js"
const http = require('http'); // Loads the http module 

http.createServer((request, response) => {
    
    // 1. Tell the browser everything is OK (Status code 200), and the data is in plain text
    response.writeHead(200, {
        'Content-Type': 'text/plain'
    });

    // 2. Write the announced text to the body of the page
    response.write('Hello, World!\n');

    // 3. Tell the server that all of the response headers and body have been sent
    response.end();

}).listen(8080); // 4. Tells the server what port to be on

```

Last but not least, we need to populate our component `Dockerfile` so that we can build our container image during deployments. Open the `Dockerfile` that is inside the `hello-world-server` folder and set it's content to the following:

``` dockerfile linenums="1" title="Dockerfile"
FROM node:16

# Create app directory
WORKDIR /usr/src/app

# Bundle app source
COPY ./index.js .

EXPOSE 8080
CMD [ "node", "index.js" ]
```

Ok, we have an application ready to use now. Next, we need to tell our `mdos` application that we want to expose port `8080`, and set up an ingress config to expose it outside of the cluster using the hostname `hello-world.mydomain.com`.

Let's start with exposing port `8080` for our application component, which can be done with a kubernetes `service`. Move into the `hello-world-server` component folder and execute the following command:

``` hl_lines="1"
mdos generate service
? Enter a name for the service to add a port to: http
? Specify a port number on which your application needs to be accessible on: 8080
```

And finally, the ingress so that we have a hostname configured to access this application:

``` hl_lines="1"
mdos generate ingress
? Enter a name for the ingress: http-ingress
? What hostname do you want to use to access your component port: hello-world.mydomain.com
? Do you want to match a subpath for this host? No
? What target port should this traffic be redirected to? 8080
? What type of traffic will this ingress handle? http
```

!!! info "Note on domain name and DNS resolution"

    It is up to you to make sure that the domain name you choose is resolved by your DNS configuration to point to the Kubernetes cluster IP address. the ingress config will take care of redirecting the traffic to your application component.

That's it, this is what your project file structure should look like now:

``` title="Project structure"
hello-world
├── hello-world-server
│   ├── Dockerfile
│   └── server.js
└── mdos.yaml
```

Let's have a look at the generated code in the `mdos.yaml` file:

``` yaml linenums="1" title="mdos.yaml"
schemaVersion: v1
tenantName: a-team
appName: hello-world
uuid: mvx10-x2wip
components:
  - name: hello-world-server
    image: hello-world
    uuid: qx8su-jwqvi
    tag: 0.0.1
    services:
      - name: http
        ports:
          - port: 8080
    ingress:
      - name: http-ingress
        matchHost: hello-world.mydomain.com
        targetPort: 8080
        trafficType: HTTP
```

!!! info "Note"

    All application configuration features will live inside this `yaml` file, even for the most advanced use-cases and config needs, everything will be here. No need to get dirty with low level kubernetes assets to make it all happen, the platform will translate it all into the proper artefact for you.  
    To learn more about everything that you can configure for your deployments in this yaml file, please check out the [MDos application reference documentation](/reference-documentation)

### Deploy your `hello-world` application on the cluster

Move into the `hello-world` application and execute the command:

``` hl_lines="1"
mdos application deploy

Synching volumes... done

To push your images to your registry, you need to provide your docker hub username and password first

? Username: foobar
? Password: ********

Building application image hello-world:0.0.1... done
Pushing application image hello-world:0.0.1... done
Deploying application... scheduled

Pod: hello-world-server
    Phase: Running
    Container: hello-world-hello-world-server
        State: running
        Details: n/a

SUCCESS : Application deployed
```

That's it, your application should now be accessible on the following domain: `https://hello-world.mydomain.com`

![Hello world](/mdos/img/getting-started/hello-world.png)

!!! info "Next steps"

    Please have a look at the chapter [MDos application reference documentation](/mdos/reference-documentation/) for a complete list of what you can configure in the `mdos.yaml` file.