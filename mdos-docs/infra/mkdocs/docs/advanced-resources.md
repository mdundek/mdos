---
hide:
  - navigation
---

# Advanced Resources

## Manage Namespaces, Users, Roles and Permissions

### Tenant Namespaces

![auth deploy](/mdos/img/keycloak/flow_overview.png){: style="width:450px" align=right }
Namespaces in Kubernetes are used to group resources together. You can manage your namespaces manually like you would on any Kubernetes cluster, but if you create them using the MDos CLI, then it will also create a new Client space in Keycload that is bound to the namespace in order to manage Users and roles for authentication and ACL management. This is the base for leveraging extra features on your cluster such as OIDC authentication, RBAC access control and other tenant segregation mechanisms to secure your cluster tenants.

If you have the MDos CLI installed on your machine, then you wont need to install the `kubectl` CLI to start managing the cluster. You can use the MDos CLI to create your tenants (and there respective kubernetes namespaces), and then create / manage your users and their permissions for those tenant namespaces using the same CLI (more on the Users, roles and permissions in the next section). Those users will then use the MDos CLI to install and configure their respective `kubectl` CLI according to their roles and permissions (RBAC).  

Simply create a new tenant / namespace like this:

```sh
mdos ns create
```

!!! note

    By default, only the platform `admin` can create namespaces. Once you have created other users on the platform, you can give them permissions to create tenant namespaces as well if you wish to delegate tenant management tasks to them.

### Namespace Users, Roles and Permissions

If you created a tenant namespace using the MDos CLI, then you will be able to manage users and user roles for this namespace using Keycloak (authentication is based on OIDC OAuth2).  
In Keycloak, you create `clients` and `users`, then for clients you can create client specific `roles`. Finally you will assign specific client `roles` to those `users`.  
MDos comes with a system client called `mdos` that is used to assign global administrative roles to your users. On top of this, every namespace you create using the MDos CLI will create it's own dedicated `client` in Keycloak. Those namespaces have a few pre-defined roles already available for tenant specific permission management, __but then you can then create your own roles inside this `client` space that you can leverage to implement your ACL layer inside your applications__ (more on this in the section [Securing applications using OIDC providers](/mdos/advanced-resources/#securing-applications-using-oidc-providers)).

![Clients and roles](/mdos/img/keycloak/client_roles.png){: style="width:410px" align=left }

| Keycloak client     | Role name         | Permissions  |
| :-----------------: | ----------------- | ------------ |
| `mdos`              | admin             | No limitations, can do everything |
| `mdos`              | create-namespace  | Create new clients / namespaces |
| `mdos`              | list-namespace    | List all clients / namespaces |
| `mdos`              | delete-namespace  | Delete a client / namespace |
| `mdos`              | create-users      | Create new users |
| `mdos`              | list-users        | List / read all users |
| `mdos`              | delete-users      | Delete users |
| `mdos`              | create-roles      | Create client roles for any client |
| `mdos`              | delete-roles      | Delete client roles from any client |
| `mdos`              | assign-roles      | Assign client roles for any client and to any user |
| `mdos`              | cm-cluster-issuer | Create and delete Cert-manager ClusterIssuers |
| `mdos`              | oidc-create       | Can create a new OIDC oauth2 endpoint for applications to use |
| `mdos`              | oidc-remove       | Can delete OIDC oauth2 endpoints |

| Keycloak client     | Role name         | Permissions  |
| :-----------------: | ----------------- | ------------ |
| `tenant-namespace`  | k8s-write         | Can deploy / delete / update applications on the client namespace using the Mdos API |
| `tenant-namespace`  | k8s-read          | Can list applications on the client namespace using the Mdos API |
| `tenant-namespace`  | admin             | Create / delete namespace specific client roles. Assign namespace specific client roles to any user. List all users for this client namespace. |
| `tenant-namespace`  | __-your own role-__ | Create your own custom role names to use within your applications |

#### :material-arrow-right-thin: Create a user

```sh
mdos auth user create
```

!!! note

    You will be given the opportunity to assign existing roles to your new user directly after the new user is created. Of course, you can choose not to for now, and use the command `mdos auth user add-role` to do so at any time.


#### :material-arrow-right-thin: Assign namespace specific roles to this new user

```sh hl_lines="1"
mdos auth user add-role
? Do you want to add a role from the Mdos admin client or from a tenant client? (Use arrow keys)
❯ Mdos admin client role
  Tenant client role
```

Here you have the choice between assigning roles from the Keycloak `mdos` client or from one of your own `tenant` spacific client. Let's choose to add a `mdos` client role to this ne user.

```sh
? Do you want to add a role from the Mdos admin client or from a tenant client? Mdos admin client role
? Select a role to add from this client: (Use arrow keys)
❯ create-roles
  create-users
  delete-namespace
  oidc-create
  assign-roles
  cm-cluster-issuer
  delete-users
```

Once you have choosen what role to assign to your user, enter that `username` to attach the role to:

```sh
? Select a role to add from this client: create-namespace
? What username do you wish to add this client role to: my-user-one
Add role to user... done
```

!!! note

    Refer to the table in the beginning of this chapter for more details on the various roles you can assign to your users.

#### :material-arrow-right-thin: Create namespace specific roles for your applications

```sh hl_lines="1"
mdos auth tenant create-role 

? Select a Client ID to create a Role for: food-shop
? Enter the client role name to create: edit-recipe

Creating Keycloak client role... done
```

Just like we added a `mdos` client specific role to our new user, you can now assign this new namespace scoped role `edit-recipe` to your users as well. For more information on how to use those custom roles, see the chapter (more on this in the section [Securing applications using OIDC providers](/mdos/advanced-resources/#securing-applications-using-oidc-providers).

---

## Securing applications using OIDC providers

You can protect your applications using OAuth2 OIDC without having to write a single line of code or modify your applications in any way. You have the option of a variaty of OIDC providers such as Keycloak, Google, GitHub and others.

![OIDC](/mdos/img/oidc.png)

### Secure your application using MDos Keycloak OIDC

While you can use various OIDC providers to protect your applications using OIDC authentication, using the integrated Keycloak deployment for your user authentication needs will allow you to also manage your application specific RBAC setup by defining roles and assigning them to your users. MDos uses the open-source solution [oauth2-proxy](https://github.com/oauth2-proxy/oauth2-proxy) to abstract away the complexity of implementing OAuth2 authentication workflows for your applications.

#### Secure your application using fine grained ACL supported by Keycloak & OIDC

Let's start by having a look at how you can leverage `Keycloak` and OIDC to implement your RBAC rules to your applications.  
The first step is to create a new `oauth2-proxy` provider instance for the integrated Keycloak deployment to your target namespace:

```sh hl_lines="1"
mdos oidc provider add

? What OIDC target do you want to add to the platform? Keycloak client
? Select a Client ID tenant-one

Creating Keycloak client & OIDC provider... done
```

Thats it, you application can now refer to it in order to implement authentication to your application without writing a single line of code. Here is an example that adds OIDC authentication to your specific ingress domain name for an application component:

```sh hl_lines="16 20 22"
schemaVersion: v1
tenantName: your-tenant-name
appName: my-app
uuid: XA74S-FXCDI
components:
  - name: secret-app-component
    image: your-tenant-name/my-app
    uuid: E5PLU-TQMBD
    tag: 1.1.0
    services:
      - name: http
        ports:
          - port: 80
    ingress:
      - name: main
        matchHost: secret.mydomain.com
        targetPort: 80
        trafficType: http
    oidc:
      provider: kc-tenant-one
      hosts:
        - secret.mydomain.com
```

In this example, we link our new oauth2-proxy `kc-tenant-one` to our application component `secret-app-component`, and protect the domain `secret.mydomain.com` with it.  

Once this application is deployed and you try to access it on the domain `secret.mydomain.com`, you will be redirected to the Keycloak login page. Once authenticated through Keycloak, you will gain access to your secret application.  

!!! info

    The domain name you protect has be be configured as an ingress to this application component as well, otherwise there is no access to this component to protect in the first place.

But that's not all we can do here, let's go one step further and have a look as of how you can leverage your user sessions and their associated roles using your own ACL / RBAC layer from within your application (creating users and roles, as well as assigning roles to those users is described in the chapter [Namespace Users, Roles and Permissions](/mdos/advanced-resources/#namespace-users-roles-and-permissions)).  
Once this user hits your application, the user is already authenticated and we are sure that we have a valid JWT token available in the header of the request under the property named `authorization`. So all we have to do now is to decode this JWT token using a language specific JWT library (all modern languages have such a library available, usually through a third party library). Once decoded, you will find all keycloak `clients` (corresponding to the application tenant namespace) this user has permissions for, as well as the specific roles added to this specific user in each respective client space. Simply use this information to allow / disallow fine grained access to the various features of your application:

```sh title="JWT token client roles once decoded"
resource_access.<CLIENT_NAMESPACE>.roles['role-1', 'role-2', ...]
```

!!! tip

    In the near future, it will be possible to specify global access to an application based on user roles directly from within your `mdos.yaml` configuration file. This will not allow you to do fine grained access control to specific users on specific parts of your application like the example we are showing you here, but il will allow you to restrict __global__ access to applications based on their user roles without having to implement anything on your side. This new feature is currently under developement.

#### Secure your application using third party OIDC providers

You can also leverage public OIDC providers for your authentication needs such as Google, Github and others. To do so, you will have to configure your external auth provider in order to get your access key, necessary to configure the `oauth2-proxy` instance dedicated for this external OIDC provider.  
For more information of how to configure your Google account for instance can be found [here](https://oauth2-proxy.github.io/oauth2-proxy/docs/configuration/oauth_provider/#google-auth-provider).  

Creating a Google auth based OIDC provider, use the command:

```sh
mdos oidc provider add -t google
```

and follow the directions.

!!! info

    As of now, only Google is available through the MDos platform as an external OIDC provider. Github authentication and others will follow soon.

---

## Managing your Issuers & TLS Certificates using Cert-Manager

---

## Managing your Domain specific Ingress-Gateways

---

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
