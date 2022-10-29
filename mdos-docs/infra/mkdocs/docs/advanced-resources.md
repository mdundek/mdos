---
hide:
  - navigation
---

# Advanced Resources

## Populate static volume data for your applications

![Volume sync](/mdos/img/volume-sync.png){: style="width:600px" align=right }
Every new volume that is created for your application is completely empty at first! This is how Kubernetees deals with volumes (also known as Persisted Volumes in the Kubernetes world)? So what if I have some data that I would like to put into this volume that my application depends on? Initial database schema & dataset, a static website that serves as a base for my application etc. Often it is exactly what you want in a persisted volme, but sometimes your volumes need data to be present at application startup. So what usually happens is that you have to complexify your app with all sorts of init mechanisms that detect an empty volume, and populate it before you can actually start using it. Bringing data to PVCs is difficult!  
MDos provides an efficient way for dealing with those use-cases. An MDos application project can have volumes declared that contain data you wish to pre-load onto your PODs before your application starts on the cluster. You will simply have to add the flag `syncVolume: true` to the declared volume inside your application component in your `mdos.yaml` file, and mdos will automatically sync this volume data to your pod volume before it starts your application component (see [Pre-populate volumes](/mdos/reference-documentation/#pre-populate-volumes) in the reference documentation for an example configuration for your `mdos.yaml` file).  

Let's have a look at the above example to see in details what actually happens here:

| Step        | Description                          |
| :---------: | ---------------------------------- |
| `1`         | When the user runs the command `mdos application deploy`, the CLI will look for `volumes` that are flagged with the attribute `syncVolume: true` in all application components.  |
| `2`         | The MDos CLI will then initiate a ftp mirror command to synchronize your local volume files with the MDos FTP server |
| `3`         | Then your application is deployed onto the cluster |
| `4`         | Before the application actually starts, it will first mirror back your volume data from the MDos FTP server to your application `Persisted Volume` |
| `5`         | Once the data is fully synchronized, your application starts up and has access to your pre-loaded files |

!!! note

    All this happens automatically with the command `mdos application deploy`, you do not need to worry about these steps, nevertheless it is usefull for you to understant what is actually happening under the hood.

## Manage Namespaces, Users, Roles and Permissions

## Securing applications using OIDC providers

You can protect your applications using OAuth2 OIDC without having to write a single line of code or modify your applications in any way. You have the option of a variaty of OIDC providers such as Keycloak, Google, GitHub and others.
Once configured

## Managing your Issuers & TLS Certificates using Cert-Manager

## Managing your Domain specific Ingress-Gateways

## Accessing your application logs using Loki
