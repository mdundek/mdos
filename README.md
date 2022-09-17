# Welcome to the MDos platform

MDos is a Kubernetes based application runtime platform, it's aim is to greatly simplify the process of creating, building and deploying applications on a Kubernetes cluster without compromising on security and efficiency

---

## Overview

<div style="display: flex; align-items: center; justify-content: center">
  <div style="flex-basis: 50%; order: 2;background-color: #ffffff; text-align: center;">
    <img src="https://github.com/mdundek/mdos/blob/main/mdos-docs/img/overview.png?raw=true" style="max-width: 100%">
  </div>
  <div style="padding-right: 20px;">
    <ul>
      <li>Build & deploy your applications on Kubernetes</li>
      <li>No Kubernetes skills needed to perform complex workflows</li>
      <li>Hassle free secure multi-tenant cluster usage and isolation</li>
      <li>Greatly simplifies complex Kubernetes application deployment patterns</li>
      <li>Provides tools to deal with hard to solve storage related challanges</li>
      <li>Protect your applications by delegating authentication to MDos using Oauth2 & OIDC</li>
      <li>Simply focus on your application RBAC logic by inspecting the user JWT token</li>
    </ul>
  </div>
</div>

---

## Table of Contents

- [Why would you want to use it?](#why-would-you-want-to-use-it)
- [Features](#features)
    - [Application specific resource configurations](#1-application-specific-resource-configurations)
    - [Deploy and debug your applications](#2-deploy-and-debug-your-applications)
    - [Advanced volume and storage workflows](#3-advanced-volume-and-storage-workflows)
    - [Multi-tenant based segregation](#4-multi-tenant-based-segregation)
    - [OIDC / OAuth2 authentication & Application RBAC](#5-oidc-oauth2-authentication-application-rbac)
- [Installation & setup](./mdos-docs/installation.md)
    - [MDos platform](#overview)
        - [Master node & MDos control plane](#overview)
        - [Worker nodes](#overview)
    - [Install the MDos CLI](#overview)
- [Getting started](#overview)
    - [Hello world](#overview)
        - [Create a new tenant namespace](#overview)
        - [Scaffold an application and application component](#overview)
        - [Deploy your hello world application](#overview)
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
        - [Access centralized logs with Loki](#overview)

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