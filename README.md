# Welcome to the MDos platform

MDos is a Kubernetes-based application runtime platform, it's aim is to greatly simplify the process of creating, building and deploying applications on a Kubernetes cluster without compromising on security and efficiency

## MDos as a fully managed cluster stack or simply as a deployment framework

### 1. As a fully managed cluster

<img align="right" width="500" style="margin-left:50px" src="https://github.com/mdundek/mdos/blob/main/mdos-docs/infra/mkdocs/docs/img/overview.png?raw=true">
The full instance of MDos is packed with extensions and features that go beyond the basic application deployment needs. It allows you to abstract away concepts such as SSO, certificate management, multi-tenancy on one single cluster along with advanced RBAC features, a private secured registry and more. This is useful if you start from scratch and you are managing your Kubernetes cluster yourself versus using a managed Kubernetes cluster such as EKS, GKE, Openshift and so on.  

---

### 2. Or as an application deployment framework only (onto your own cluster)

<img align="left" width="450" style="margin-right:50px" src="https://github.com/mdundek/mdos/blob/framework_mode/mdos-docs/infra/mkdocs/docs/img/mdosyaml.png?raw=true"> 
If you are managing your own cluster, but you would like to leverage the MDos application deployment framework to manage and deploy your applications onto the cluster, then this is the mode for you.  
One single and easy to understand YAML file for everything you need, no deep kubernetes knowledge needed, no scattered low level kubernetes resource yaml files and no complex resource matching patterns needed.  

Managed Kubernetes Clusters such as EKS and Openshift often already come with a few integrated extensions of their own in order to leverage platform specific features such as Ingress, Certificate management and so on. What those platforms do not provide is a framework to simplify your application configuration and deployments with. Developers and devops engineers still need a very good understanding of Kubernetes artifacts and resources in order to deploy their applications onto Kubernetes. Even experienced Kubernetes folks still have to deal with allot of overhead when digging into those yaml files for some advanced use cases.  

> **Limitations**
> When deploying MDos in framework only mode, you won't get advanced features such as OIDC SSO authentication, Automated certificate management, managed multi-tenancy and RBAC support or a private registry OOTB. This deployment focuses on the application framework only.

With the MDos framework & CLI, this is what a application deployment looks like for yaml config file just like the one on the left:

```sh
mdos application deploy
```  

This will:

1. Build your docker image
2. Push it to the target registry
3. Deploy everything on your Kubernetes cluster
4. Provide you with feedback of how the deployment is going

---

> **Warning**
> MDos is in under development at the moment, it should not be used in production yet. Before investing more sweat and tears into this, I want to make sure that there is interest from the comunity first.  
> 
> __Please test it, provide some feedback, or even better, join the party in developing it further.__  
>
> If you encounter some miss-behavior, or if you believe something needs to be adapted, create an issue and I will come back to you shortly.

## In a Nutshell

* Build & deploy your applications on Kubernetes
* No Kubernetes skills needed to perform complex workflows
* Hassle-free secure multi-tenant cluster usage and isolation
* Greatly simplifies complex Kubernetes application deployment patterns
* Provides tools to deal with hard-to-solve storage-related challenges
* Protect your applications by delegating authentication to MDos using Oauth2 & OIDC
* Hassle-free TLS certificate management

### Why would you want to use it?

Let's face it, Kubernetes is great, most probably one of the best Container runtime platforms ever build with almost endless capabilities. It is no surprise that 70% of all companies use Kubernetes in production somewhere in their public / private cloud environment.  
That said, its complexity is often a deterrent, and leads to badly designed deployment scenarios, regularly exposing security threats as well as miss-usage of certain cluster-based capabilities, leading to under-utilization of its capabilities.  

Companies often end up provisioning multiple Kubernetes clusters to manage multi-tenant scenarios because properly segregating users and projects securely on a single cluster can be complicated to achieve and maintain.  

<ins>Other pain points faced by non-Kubernetes experts are plentiful:</ins>

* How do you provision your static application volume content to your Pods?
* How do you secure your applications on the network level?
* How do you implement SSO and authentication/authorization mechanisms on your applications?
* My application does not deploy on Kubernetes, I have no idea why that is and how to fix it?
* The list goes on and on...  

After having worked on Kubernetes for several years now and managing teams of developers and architects that had to develop and maintain Kubernetes instances, it became clear to me that something had to change.  
Companies hire developers to build applications that will run on Kubernetes, but to develop applications for Kubernetes, you need to have some solid experience in the domain, making you a rather experienced cloud developer with an undeniably high price tag. Unexperienced developers tend to lose a lot of time in understanding Kubernetes in the first place, and even more time in learning how to use it properly, leading to very expensive development cycles to get basic applications up and running.  
Financially, this does not make much sense. If every company had to only hire experienced Kubernetes developers to get anything done with it, project costs would rapidly spiral out of control, without mentioning the fact that there are not that many skilled Kubernetes experts available in the first place.  

**MDos is an attempt to solve some of those complex issues for developers and companies, letting them focus on developing applications and not about how to get them running securely on Kubernetes.**

---

## Features

Those can be split into 5 families:

1. Application specific resource configurations
2. Deploy and debug your applications
3. Advanced volume and storage workflows
4. Multi-tenant based segregation
5. OIDC / OAuth2 authentication & Application RBAC
6. Cert-Manager for TLS certificate issuer and secret management

### 1. Application specific resource configurations

Using the MDos CLI and a unified `mdos.yaml` application descriptor file, you can build complex Kubernetes deployment senarios without any knowledge of Kubernetes resource definition types such as `Deployments`, `StatefulSets`, `Pods`, `Services`, `PV & PVCs`, `VirtualServices`, `Secrets`, `ConfigMaps`, `NetworkPolicies` ... (just to name a few)  
Therefore, build your applications using higher level artefacts that will translate to lower level Kubernetes resource definitions based on Kubernetes best practices.  

* Scaffold a new `application` workspace
* Scaffold a application `component` inside your mdos `application`
* Add config files & environment variables to your application components
* Add secret (sensitive) files and environment variables to your application components
* Expose your application components to other resources within the cluster 
* Configure hostname based ingress rules to allow access to your application components from outside of the cluster
* Mount various volume types to your application components
* ...

### 2. Deploy and debug your applications

* One mdos CLI command to deploy your applications and sync static volumes with your pods
* Get real-time detailed feedback on your deployments, providing valuable feedback on what might go wrong in order to fix it
* Get all application component logs, including init container logs in case of a failed deployment for instant debugging
* Aggregate all application & platform logs in Loki, accessible through a dedicated API (TODO)

### 3. Advanced volume and storage workflows

* Synchronize / provision static local data with your application component volumes before they start in Kubernetes
* Provision shared filesystem volumes for your application components (TODO)

### 4. Multi-tenant based segregation

* A tenant will get a Kubernetes namespace as well as a dedicated Keycloak client (for user management)
* You can create users on the platform and link them to one or more tenants
* Manage user permissions (RBAC) specifcally for each tenant namespace / keycloak client 
* Kubernetes namespaces let you take advantage of network and resource segregation mechanisms for each tenant

### 5. OIDC / OAuth2 authentication & Application RBAC

* Provision OIDC / OAuth2 based Authentication providers to your cluster ready to use
* Link OIDC / OAuth2 provisioned providers to your application components to protect those resources (no app changes needed)
* Assign roles to your users specifically on each tenant / keycloak client, allowing you to implement your ACL logic without having to deal with authentication at all

### 6. Cert-Manager for TLS certificate issuer and secret management

* Register Cert-Manager Issuers onto your cluster or namespace
* Generate and manage certificates / secrets from your Issuers

## Installation & Documentation

The project documentation is hosted separately, you can access it [here](https://mdundek.github.io/mdos/)  
Instructions on how to install the platform is also described there, please refer to [this](https://mdundek.github.io/mdos/installation/) page for more details.
