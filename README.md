# Welcome to the MDos platform

MDos is a Kubernetes based application runtime platform, it's aim is to greatly simplify the process of creating, building and deploying applications on a Kubernetes cluster without compromising on security and efficiency

<p align="center">
  <img src="https://github.com/mdundek/mdos/blob/main/mdos-docs/img/overview.png?raw=true">
</p>

---

<!-- ## Problem statement

I have been working with Kubernetes for some years now, it is an amazing platform, so versatile, extensible and powerfull. But with great power comes great responsability!  
I am and have been leading teams that are developing applications that are destined to run on Kubernetes. Over the years, it became obvious that even with the greatness of the platform, there was a major elephant in the room... Let's dig a bit deeper down that rabbit hole.
Creating container images and running them on `docker-compose` for instance is easy enougth. Most developers know how to get there without too much hassle. Kubernetes on the other hand is a whole other animal all together. A simple volume mount with some data, exposing a port to make your application accessible or simply wrapping your head around how everything fits together takes on a whole different meaning when you have to do it in Kubernetes. For those of you who had the opportunity to work with it, but who do not have a PhD in Kubernetes are probably very well aware of what I mean by this. But the complexity goes way beyong those simple examples.  
Putting an application into production is no easy task. Kubernetes has phantastic mechanisms in place to allow you to address the most chalanging aspects of production environements (auto scaling, network security, cluster support, endless extensibility ...). There is a reason why they call it a `Container Operating System` with cluster support rather than a simple container runtime engine, but this also brings tremendous complexity that often hinders developers and devops admins to use it efficiently, or to adopt it all together. Most developers tell me they know Kubernetes when I ask them about it. They believe that is they scheduled a Pod once and attached a volume to it, they have the basic understanding needed to work with it. Let's throw in a few more buzzwords, see if that triggeres a nervous twitching in your core:

* Role Based Access Control (I am sure not many people use it, way to complicated)
* Network Policies (Restricting network traffic between applications)
* Storage Classes (Ceph, NFS, Longhorn, HostPaths...)
* Storage types (WriteOnce, WriteMany...)
* Pods, Deployments, StatefulSets, DaemonSets, Services, VirtualServices, Gateways, Ingress, PVs, PVCs, Secrets, ConfigMaps, Roles, ClusterRoles, RoleMappings.............. (feeling dizzy)
* Debugging applications in Kubernetes (logs, state, resources...)
* ...

And those are some base core concepts, let's not forget third party tools such as Helm, logging agregators such as Loki, OAuth2 proxy for authentication and all the other goodies that this amazing community has produced over the years. On the subject of HELM, it's a great package manager for kubernetes workloads, but building your HELM charts is complex, even more so that simply creating Kubernetes deployment artefacts. Every app has a dedicated HELM chart, they are usually configured differently, yet using the same Kubernetes concepts under the hood. Why is that?

One of my favourites. `PersistetVolumes` and `PersistedVolumeClaims`, they allow you to persist your application data even when your application dies. Great, right! But then you start to wonder: Those volumes and files are hidden somewhere on the cluster out of your control, and every new PVC that is created for your application is completely empty at first! See where I am going with this? So what if I have some data that I would like to put into this volume that my application depends on? What if I want to copy this data for backup reasons fr instance? Initial database schema & dataset, a static website that serves as a base for my application etc. Let's face it, an empty volume is nice and all, but it needs data right? So what usually happens is that you have to complexify your app with all sorts of init mechanisms that detect an empty volume, and populate it before you can actually start using it. Bringing data to PVCs is difficult! 

Ok, I think you get the point. This is what I see everyday when a developer joins our team and discovers a production ready Kubernetes environement that he/she has to understand so that he/she can develop & test applications on. The amount of time I spend going over all those concepts is tremendous, it takes a while before those concepts become second nature to them. Then a developer quits because he found a better salery elsewhere, because he got valuable training on Kubernetes with us, so we have to replace them and start all over again.  

There are great flavors of managed Kubernetes implementations (EKS, Rancher, IKS...), they are all great to deploy a cluster with a simple click, but they all fall short helping you on your day to day interactions with the cluster, or to deploy workloads on it. The only one that offers a decent experience with it is OpenShift, but you need a licence, they are not cheap and the code base is closed.  

## What can we do about this?

Welcome to MDos! It's not a managed Kubernetes flavor, it's a packaged Kubernetes deployment, removing the clutter and focusing on the value with all sorts of automated tools and integrations to solve the most chalanging tasks. The aim is to deploy it anywhere, no vendor lockin, no cloud specific dependencies, you can run it on a Raspberry Pi if you have enougth memory on it. It also removes the complexity of kubernetes and provides a framework to package your applications in a simple way, but once deployed they use all the greatness that Kubernetes has to offer. Learn one simplified way of describing your applications and let MDos do the heavy lifting for you.  
MDos goes beyond just simplifying kubernetes deployments, it also adds mechanisms to deal with typicat tasks such as application authentication and authorization for instance, coupled with a popular user management system called `Keycloak` (which is also managed by `MDos` by the way, you won't have to learn about `Keycloak`) to allow you to add `OAuth2 OIDC` authentication to your applications or manage `Role Based Access Control` to your cluster and resources without having to write a single line of code. You also get a log aggregator OOTB to centralize all your logs and make them searchable, and a multi-tenant private registry is also set up in the cluster ready for you to use. The volume dilema I mentioned above is also addressed here, and debugging falty application deployments is becomming easy again. 
MDos is multi-tenant oriented, it is designed to be shared between teams, yet secured so that everyone has privacy and security on the cluster. -->

> **Warning**
> MDos is in beta stage at the moment, it is under developement and should not be used in production yet. Before investing more sweat and tears into this, I want to make sure that there is interest from the comunity first. Please test it, provide some feedback, or even better, join the party in developing it further. 

## In a Nutshell

* Build & deploy your applications on Kubernetes
* No Kubernetes skills needed to perform complex workflows
* Hassle free secure multi-tenant cluster usage and isolation
* Greatly simplifies complex Kubernetes application deployment patterns
* Provides tools to deal with hard to solve storage related challanges
* Protect your applications by delegating authentication to MDos using Oauth2 & OIDC
* Simply focus on your application RBAC logic by inspecting the user JWT token

<!-- ---

## Table of Contents

- [Why would you want to use it?](#why-would-you-want-to-use-it)
- [Features](#features)
    - [Application specific resource configurations](#1-application-specific-resource-configurations)
    - [Deploy and debug your applications](#2-deploy-and-debug-your-applications)
    - [Advanced volume and storage workflows](#3-advanced-volume-and-storage-workflows)
    - [Multi-tenant based segregation](#4-multi-tenant-based-segregation)
    - [OIDC / OAuth2 authentication & Application RBAC](#5-oidc-oauth2-authentication-application-rbac)
- [Installation & setup](./mdos-docs/installation.md)
    - [MDos platform](./mdos-docs/installation.md#install-the-mdos-server-platform)
        - [Master node & MDos control plane](./mdos-docs/installation.md#master-node--mdos-control-plane)
        - [Worker nodes](./mdos-docs/installation.md#worker-nodes)
    - [Install the MDos CLI](./mdos-docs/installation.md#install-the-mdos-cli)
        - [Linux & MacOSX](./mdos-docs/installation.md#linux--mac-osx)
        - [Windows](./mdos-docs/installation.md#windows)
        - [Special notes about self-signed certificates without a resolvable DNS name](./mdos-docs/installation.md)
- [Getting started](./mdos-docs/getting-started.md)
    - [Anathomy of a MDos application](./mdos-docs/getting-started.md)
    - [Configure your CLI to point to a MDos platform API host](./mdos-docs/getting-started.md)
    - [Create a new tenant namespace](./mdos-docs/getting-started.md#overview)
    - [Scaffold an application and application components](./mdos-docs/getting-started.md#overview)
    - [Deploy your application](./mdos-docs/getting-started.md#overview)
- [MDos CLI commands](#overview)
    - [Tenants namespaces](#overview)
    - [Tenant roles](#overview)
    - [Users and user-roles](#overview)
    - [Manage applications](#overview)
        - [Scaffold a new application workspace](#overview)
        - [Manage applcation components](#overview)
            - [Scaffold a new application component](#overview)
            - [Work with application configurations](#overview)
            - [Work with application secrets](#overview)
            - [Configure service ports](#overview)
            - [Configure ingress rules](#overview)
            - [Configure volumes](#overview)
            - [Define network isolation levels for your components (firewall)](#overview)
        - [Build & Deploy applications](#overview)
        - [Delete deployed applications](#overview)
        - [List deployed applications](#overview)
- [POD Storage solutions](#overview)
    - [Mirror static data with your POD volumes](#overview)
    - [Share volumes between PODs (WriteMany)](#overview)
- [OIDC OAuth2 Providers](#overview)
    - [Deploy a new OIDC OAuth2 proxy provider](#overview)
        - [Keycloak OIDC](#overview)
        - [Google OIDC](#overview)
    - [List all deployed OIDC OAuth2 proxy providers](#overview)
    - [Delete a deployed OIDC OAuth2 proxy provider](#overview)
- [Protect your applications](#overview)
      - [Add OIDC OAuth2 user authentication for your application components](#overview)
      - [Implement Role Based Access Control (RBAC ACL) in your application code](#overview)
- [Debugging application & accessing logs](#overview)
    - [Deployment status & log access](#overview)
    - [Access centralized logs with Loki](#overview) -->

---

### Why would you want to use it?

Let's face it, Kubernetes is great, most probably one of the best Container runtime platforms ever build with almost endless capabilities. It is no surprising that 70% of all companies use Kubernetes in production somewhere in their public / private cloud environement.  
That said, it's complexity is often a deterant, and leads to badly designed deployment scenarios, regularly exposing security threaths as well as miss-usage of certain cluster based capabilities, leading to under-utilization of it's capabilities.  

Companies often end up provisioning multiple Kubernetes clusters to manage multi-tenant scenarios because properly segregating users and projects in a secure way on a single cluster can be complicated to achieve and maintain.  

<ins>Other pain points faced by non kubernetes experts are plentyfull:</ins>

* How do you provision your static application volume content to your Pods?
* How do you secure your applications on the network level?
* How do you implement SSO and authentication / authorization mechanisms on your applications?
* My application does not deploy on Kubernetes, I have no idea why that is and how to fix it?
* The list goes on and on...  

After having worked on Kubernetes for several years now and managed teams of developers and architects that had to develop and maintain Kubernetes instances, it became clear for me that something had to change.  
Companies hire developers to build applications that will run on Kubernetes, but in order to develop applications for Kubernetes, you need to have some solid experience in the domain, making you a rather experienced cloud developer with a undeniable high price tag. Unexperienced developers tend to loose alot of time on understanding Kubernetes in the first place, even more time in learning how to use it properly, leading to very expensive developement cycles to get basic applications up and running.  
Financially, this does not make much sense. If every company had to only hire experienced kubernetes developers to get anything done with it, project costs would rapidly spiral out of control, without mentioning the fact that there are not that many skilled kubernetes experts available in the first place.  

**MDos is an attempt to solve some of those complexity issues for developers and companies, letting them focus on developing applications and not about how to get them running securely on Kubernetes.**

---

### Features

Those can be split into 5 families:

1. Application specific resource configurations
2. Deploy and debug your applications
3. Advanced volume and storage workflows
4. Multi-tenant based segregation
5. OIDC / OAuth2 authentication & Application RBAC

#### 1. Application specific resource configurations

Using the MDos CLI and a unified `mdos.yaml` application descriptor file, you can build complex Kubernetes deployment senarios without any knowledge of Kubernetes resource definition types such as `Deployments`, `StatefulSets`, `Pods`, `Services`, `PV & PVCs`, `VirtualServices`, `Secrets`, `ConfigMaps`, `NetworkPolicies` ... (just to name a few)  
Therefore, build your applications using higher level artefacts that will translate to lower level Kubernetes resource definitions based on Kubernetes best practices.  
Amongst other things, the MDos CLI allows you to:

* Scaffold a new `application` workspace
* Scaffold a application `component` inside your mdos `application`
* Add config files & environement variables to your application components
* Add secret (sensitive) files and environement variables to your application components
* Expose your application components to other resources within the cluster 
* Configure hostname based ingress rules to allow access to your application components from outside of the cluster
* Mount various volume types to your application components

#### 2. Deploy and debug your applications

* One mdos CLI command to deploy your applications and sync static volumes with your pods
* Get real-time detailed feedback on your deployments, providing valuable feedback on what might go wrong in order to fix it
* Get all application component logs, including init container logs in case of a failed deployment for instant debugging
* Aggregate all application & platform logs in Loki, accessible through a dedicated API (TODO)

#### 3. Advanced volume and storage workflows

* Synchronize / provision static local data with your application component volumes before they start in Kubernetes
* Provision shared filesystem volumes for your application components (TODO)

#### 4. Multi-tenant based segregation

* A tenant will get a Kubernetes namespace as well as a dedicated Keycloak client (for user management)
* You can create users on the platform and link them to one or more tenants
* Manage user permissions (RBAC) specifcally for each tenant namespace / keycloak client 
* Kubernetes namespaces let you take advantage of network and resource segregation mechanisms for each tenant

#### 5. OIDC / OAuth2 authentication & Application RBAC

* Provision OIDC / OAuth2 based Authentication providers to your cluster ready to use (Keycloak internal or Google only for now)
* Link OIDC / OAuth2 provisioned providers to your application components to protect those resources (no app changes needed)
* Assign roles to your users specifically on each tenant / keycloak client, allowing you to implement your ACL logic without having to deal with authentication at all