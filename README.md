# Welcome to the MDos platform

![logo](docs/img/mdos.png)

MDos is a application runtime platform, it's aim is to greatly simplify the process of creating, building and deploying applications on a Kubernetes cluster. 

* [Install platform](docs/installation.md)
* [Getting started](docs/getting-started.md)
* [Minio S3](docs/minio.md)


## CLI Suggestions (admin)

### OIDC provider management

> Add new oidc provider config to cluster

- mdos oidc-provider add (KC client, Google, Github...)
- mdos oidc-provider remove

### User management (Keycloak only)

> To be defined & tested, roles vs groups

- mdos oidc-user add (linked to client)
- mdos oidc-user edit (roles / groups)
- mdos oidc-user remove


## CLI Suggestions (none admin)

### Configure kubeconfig

- mdos setup kubeconfig (reeequires RBAC rules for production, start with admin kubeconfig and no auth)

### Generate applications & components

- mdos generate application
- mdos generate component
- mdos build
- mdos deploy
