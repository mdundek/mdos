  # Usage

  <!-- usage -->
```sh-session
$ npm install -g mdos-cli
$ mdos COMMAND
running command...
$ mdos (--version)
mdos-cli/2.0.2 darwin-x64 node-v18.9.0
$ mdos --help [COMMAND]
USAGE
  $ mdos COMMAND
...
```
<!-- usagestop -->

  # Commands

  <!-- commands -->
* [`mdos add client`](#mdos-add-client)
* [`mdos add conf`](#mdos-add-conf)
* [`mdos add config`](#mdos-add-config)
* [`mdos add configuration`](#mdos-add-configuration)
* [`mdos add env`](#mdos-add-env)
* [`mdos add ingress`](#mdos-add-ingress)
* [`mdos add namespace`](#mdos-add-namespace)
* [`mdos add ns`](#mdos-add-ns)
* [`mdos add port`](#mdos-add-port)
* [`mdos add secret`](#mdos-add-secret)
* [`mdos add service`](#mdos-add-service)
* [`mdos add storage`](#mdos-add-storage)
* [`mdos add volume`](#mdos-add-volume)
* [`mdos app delete`](#mdos-app-delete)
* [`mdos app deploy`](#mdos-app-deploy)
* [`mdos app list`](#mdos-app-list)
* [`mdos app protect`](#mdos-app-protect)
* [`mdos app sso`](#mdos-app-sso)
* [`mdos application delete`](#mdos-application-delete)
* [`mdos application deploy`](#mdos-application-deploy)
* [`mdos application list`](#mdos-application-list)
* [`mdos application protect`](#mdos-application-protect)
* [`mdos applications delete`](#mdos-applications-delete)
* [`mdos applications deploy`](#mdos-applications-deploy)
* [`mdos applications list`](#mdos-applications-list)
* [`mdos apps list`](#mdos-apps-list)
* [`mdos auth tenant create-role`](#mdos-auth-tenant-create-role)
* [`mdos auth tenant delete-role`](#mdos-auth-tenant-delete-role)
* [`mdos auth tenant list-roles`](#mdos-auth-tenant-list-roles)
* [`mdos auth user add-role`](#mdos-auth-user-add-role)
* [`mdos auth user create`](#mdos-auth-user-create)
* [`mdos auth user delete`](#mdos-auth-user-delete)
* [`mdos auth user list`](#mdos-auth-user-list)
* [`mdos auth user list-roles`](#mdos-auth-user-list-roles)
* [`mdos auth user remove-role`](#mdos-auth-user-remove-role)
* [`mdos client add`](#mdos-client-add)
* [`mdos client add-role`](#mdos-client-add-role)
* [`mdos client add role`](#mdos-client-add-role-1)
* [`mdos client create`](#mdos-client-create)
* [`mdos client create-role`](#mdos-client-create-role)
* [`mdos client create role`](#mdos-client-create-role-1)
* [`mdos client delete`](#mdos-client-delete)
* [`mdos client delete-role`](#mdos-client-delete-role)
* [`mdos client delete role`](#mdos-client-delete-role-1)
* [`mdos client list`](#mdos-client-list)
* [`mdos client list-roles`](#mdos-client-list-roles)
* [`mdos client list roles`](#mdos-client-list-roles-1)
* [`mdos client remove`](#mdos-client-remove)
* [`mdos client remove-role`](#mdos-client-remove-role)
* [`mdos client remove role`](#mdos-client-remove-role-1)
* [`mdos client show`](#mdos-client-show)
* [`mdos client show-roles`](#mdos-client-show-roles)
* [`mdos client show roles`](#mdos-client-show-roles-1)
* [`mdos cm cert create`](#mdos-cm-cert-create)
* [`mdos cm cert delete`](#mdos-cm-cert-delete)
* [`mdos cm cert list`](#mdos-cm-cert-list)
* [`mdos cm certificate create`](#mdos-cm-certificate-create)
* [`mdos cm certificate delete`](#mdos-cm-certificate-delete)
* [`mdos cm certificate list`](#mdos-cm-certificate-list)
* [`mdos cm crt create`](#mdos-cm-crt-create)
* [`mdos cm crt delete`](#mdos-cm-crt-delete)
* [`mdos cm crt list`](#mdos-cm-crt-list)
* [`mdos cm issuer create`](#mdos-cm-issuer-create)
* [`mdos cm issuer delete`](#mdos-cm-issuer-delete)
* [`mdos cm issuer list`](#mdos-cm-issuer-list)
* [`mdos conf add`](#mdos-conf-add)
* [`mdos conf generate`](#mdos-conf-generate)
* [`mdos config add`](#mdos-config-add)
* [`mdos config generate`](#mdos-config-generate)
* [`mdos configuration add`](#mdos-configuration-add)
* [`mdos configuration generate`](#mdos-configuration-generate)
* [`mdos configure api-endpoint [URI]`](#mdos-configure-api-endpoint-uri)
* [`mdos create app`](#mdos-create-app)
* [`mdos create application`](#mdos-create-application)
* [`mdos create client`](#mdos-create-client)
* [`mdos create comp`](#mdos-create-comp)
* [`mdos create component`](#mdos-create-component)
* [`mdos create namespace`](#mdos-create-namespace)
* [`mdos create ns`](#mdos-create-ns)
* [`mdos delete app`](#mdos-delete-app)
* [`mdos delete application`](#mdos-delete-application)
* [`mdos delete applications`](#mdos-delete-applications)
* [`mdos delete client`](#mdos-delete-client)
* [`mdos delete namespace`](#mdos-delete-namespace)
* [`mdos delete ns`](#mdos-delete-ns)
* [`mdos deploy app`](#mdos-deploy-app)
* [`mdos deploy application`](#mdos-deploy-application)
* [`mdos deploy applications`](#mdos-deploy-applications)
* [`mdos env add`](#mdos-env-add)
* [`mdos env generate`](#mdos-env-generate)
* [`mdos gateway add`](#mdos-gateway-add)
* [`mdos gateway create`](#mdos-gateway-create)
* [`mdos gateway list`](#mdos-gateway-list)
* [`mdos gateway remove`](#mdos-gateway-remove)
* [`mdos gen app`](#mdos-gen-app)
* [`mdos gen comp`](#mdos-gen-comp)
* [`mdos generate app`](#mdos-generate-app)
* [`mdos generate application`](#mdos-generate-application)
* [`mdos generate comp`](#mdos-generate-comp)
* [`mdos generate component`](#mdos-generate-component)
* [`mdos generate conf`](#mdos-generate-conf)
* [`mdos generate config`](#mdos-generate-config)
* [`mdos generate configuration`](#mdos-generate-configuration)
* [`mdos generate env`](#mdos-generate-env)
* [`mdos generate ingress`](#mdos-generate-ingress)
* [`mdos generate port`](#mdos-generate-port)
* [`mdos generate secret`](#mdos-generate-secret)
* [`mdos generate service`](#mdos-generate-service)
* [`mdos generate storage`](#mdos-generate-storage)
* [`mdos generate volume`](#mdos-generate-volume)
* [`mdos help [COMMAND]`](#mdos-help-command)
* [`mdos ingress-gateway add`](#mdos-ingress-gateway-add)
* [`mdos ingress-gateway create`](#mdos-ingress-gateway-create)
* [`mdos ingress-gateway list`](#mdos-ingress-gateway-list)
* [`mdos ingress-gateway remove`](#mdos-ingress-gateway-remove)
* [`mdos ingress add`](#mdos-ingress-add)
* [`mdos ingress generate`](#mdos-ingress-generate)
* [`mdos install-framework`](#mdos-install-framework)
* [`mdos kc client add-role`](#mdos-kc-client-add-role)
* [`mdos kc client add role`](#mdos-kc-client-add-role-1)
* [`mdos kc client create role`](#mdos-kc-client-create-role)
* [`mdos kc client delete role`](#mdos-kc-client-delete-role)
* [`mdos kc client list roles`](#mdos-kc-client-list-roles)
* [`mdos kc client remove-role`](#mdos-kc-client-remove-role)
* [`mdos kc client remove role`](#mdos-kc-client-remove-role-1)
* [`mdos kc client show-roles`](#mdos-kc-client-show-roles)
* [`mdos kc client show roles`](#mdos-kc-client-show-roles-1)
* [`mdos kc user add`](#mdos-kc-user-add)
* [`mdos kc user add role`](#mdos-kc-user-add-role)
* [`mdos kc user create role`](#mdos-kc-user-create-role)
* [`mdos kc user delete role`](#mdos-kc-user-delete-role)
* [`mdos kc user list roles`](#mdos-kc-user-list-roles)
* [`mdos kc user remove`](#mdos-kc-user-remove)
* [`mdos kc user remove role`](#mdos-kc-user-remove-role)
* [`mdos kc user show-roles`](#mdos-kc-user-show-roles)
* [`mdos kc user show roles`](#mdos-kc-user-show-roles-1)
* [`mdos list app`](#mdos-list-app)
* [`mdos list application`](#mdos-list-application)
* [`mdos list applications`](#mdos-list-applications)
* [`mdos list apps`](#mdos-list-apps)
* [`mdos list client`](#mdos-list-client)
* [`mdos list namespace`](#mdos-list-namespace)
* [`mdos list namespaces`](#mdos-list-namespaces)
* [`mdos list ns`](#mdos-list-ns)
* [`mdos login`](#mdos-login)
* [`mdos logout`](#mdos-logout)
* [`mdos namespace create`](#mdos-namespace-create)
* [`mdos namespace delete`](#mdos-namespace-delete)
* [`mdos namespace list`](#mdos-namespace-list)
* [`mdos namespace show`](#mdos-namespace-show)
* [`mdos namespaces add`](#mdos-namespaces-add)
* [`mdos namespaces remove`](#mdos-namespaces-remove)
* [`mdos namespaces show`](#mdos-namespaces-show)
* [`mdos ns add`](#mdos-ns-add)
* [`mdos ns create`](#mdos-ns-create)
* [`mdos ns delete`](#mdos-ns-delete)
* [`mdos ns list`](#mdos-ns-list)
* [`mdos ns remove`](#mdos-ns-remove)
* [`mdos ns show`](#mdos-ns-show)
* [`mdos oidc create`](#mdos-oidc-create)
* [`mdos oidc delete`](#mdos-oidc-delete)
* [`mdos oidc list`](#mdos-oidc-list)
* [`mdos oidc provider add`](#mdos-oidc-provider-add)
* [`mdos oidc provider create`](#mdos-oidc-provider-create)
* [`mdos oidc provider delete`](#mdos-oidc-provider-delete)
* [`mdos oidc provider list`](#mdos-oidc-provider-list)
* [`mdos oidc provider remove`](#mdos-oidc-provider-remove)
* [`mdos oidc providers list`](#mdos-oidc-providers-list)
* [`mdos port add`](#mdos-port-add)
* [`mdos port generate`](#mdos-port-generate)
* [`mdos protect app`](#mdos-protect-app)
* [`mdos protect application`](#mdos-protect-application)
* [`mdos remove client`](#mdos-remove-client)
* [`mdos remove namespace`](#mdos-remove-namespace)
* [`mdos remove ns`](#mdos-remove-ns)
* [`mdos secret add`](#mdos-secret-add)
* [`mdos secret create`](#mdos-secret-create)
* [`mdos secret generate`](#mdos-secret-generate)
* [`mdos service add`](#mdos-service-add)
* [`mdos service generate`](#mdos-service-generate)
* [`mdos set-kubeconfig`](#mdos-set-kubeconfig)
* [`mdos shared-volume create`](#mdos-shared-volume-create)
* [`mdos shared-volume delete`](#mdos-shared-volume-delete)
* [`mdos shared-volume list`](#mdos-shared-volume-list)
* [`mdos show client`](#mdos-show-client)
* [`mdos show namespace`](#mdos-show-namespace)
* [`mdos show ns`](#mdos-show-ns)
* [`mdos sso app`](#mdos-sso-app)
* [`mdos sso create`](#mdos-sso-create)
* [`mdos sso delete`](#mdos-sso-delete)
* [`mdos sso list`](#mdos-sso-list)
* [`mdos sso provider add`](#mdos-sso-provider-add)
* [`mdos sso provider create`](#mdos-sso-provider-create)
* [`mdos sso provider delete`](#mdos-sso-provider-delete)
* [`mdos sso provider list`](#mdos-sso-provider-list)
* [`mdos sso provider remove`](#mdos-sso-provider-remove)
* [`mdos sso provider show`](#mdos-sso-provider-show)
* [`mdos sso providers list`](#mdos-sso-providers-list)
* [`mdos sso providers show`](#mdos-sso-providers-show)
* [`mdos status`](#mdos-status)
* [`mdos storage add`](#mdos-storage-add)
* [`mdos storage generate`](#mdos-storage-generate)
* [`mdos user add`](#mdos-user-add)
* [`mdos user add role`](#mdos-user-add-role)
* [`mdos user change-password`](#mdos-user-change-password)
* [`mdos user create`](#mdos-user-create)
* [`mdos user create-role`](#mdos-user-create-role)
* [`mdos user create role`](#mdos-user-create-role-1)
* [`mdos user delete`](#mdos-user-delete)
* [`mdos user delete-role`](#mdos-user-delete-role)
* [`mdos user delete role`](#mdos-user-delete-role-1)
* [`mdos user list`](#mdos-user-list)
* [`mdos user list-roles`](#mdos-user-list-roles)
* [`mdos user list roles`](#mdos-user-list-roles-1)
* [`mdos user remove`](#mdos-user-remove)
* [`mdos user remove role`](#mdos-user-remove-role)
* [`mdos user show-roles`](#mdos-user-show-roles)
* [`mdos user show roles`](#mdos-user-show-roles-1)
* [`mdos volume add`](#mdos-volume-add)
* [`mdos volume create`](#mdos-volume-create)
* [`mdos volume generate`](#mdos-volume-generate)
* [`mdos volume list`](#mdos-volume-list)
* [`mdos volume remove`](#mdos-volume-remove)

## `mdos add client`

Create a new namespace / client / tenant

```
USAGE
  $ mdos add client [-n <value>]

FLAGS
  -n, --namespace=<value>  Keycloak client ID

DESCRIPTION
  Create a new namespace / client / tenant

ALIASES
  $ mdos ns create
  $ mdos create ns
  $ mdos create namespace
  $ mdos client create
  $ mdos create client
  $ mdos ns add
  $ mdos add ns
  $ mdos add namespace
  $ mdos namespaces add
  $ mdos client add
  $ mdos add client
```

## `mdos add conf`

Configure environement variables and config files for your components

```
USAGE
  $ mdos add conf

DESCRIPTION
  Configure environement variables and config files for your components

ALIASES
  $ mdos add configuration
  $ mdos add config
  $ mdos add conf
  $ mdos add env
  $ mdos configuration add
  $ mdos config add
  $ mdos conf add
  $ mdos env add
  $ mdos generate configuration
  $ mdos generate conf
  $ mdos generate env
  $ mdos configuration generate
  $ mdos config generate
  $ mdos conf generate
  $ mdos env generate
```

## `mdos add config`

Configure environement variables and config files for your components

```
USAGE
  $ mdos add config

DESCRIPTION
  Configure environement variables and config files for your components

ALIASES
  $ mdos add configuration
  $ mdos add config
  $ mdos add conf
  $ mdos add env
  $ mdos configuration add
  $ mdos config add
  $ mdos conf add
  $ mdos env add
  $ mdos generate configuration
  $ mdos generate conf
  $ mdos generate env
  $ mdos configuration generate
  $ mdos config generate
  $ mdos conf generate
  $ mdos env generate
```

## `mdos add configuration`

Configure environement variables and config files for your components

```
USAGE
  $ mdos add configuration

DESCRIPTION
  Configure environement variables and config files for your components

ALIASES
  $ mdos add configuration
  $ mdos add config
  $ mdos add conf
  $ mdos add env
  $ mdos configuration add
  $ mdos config add
  $ mdos conf add
  $ mdos env add
  $ mdos generate configuration
  $ mdos generate conf
  $ mdos generate env
  $ mdos configuration generate
  $ mdos config generate
  $ mdos conf generate
  $ mdos env generate
```

## `mdos add env`

Configure environement variables and config files for your components

```
USAGE
  $ mdos add env

DESCRIPTION
  Configure environement variables and config files for your components

ALIASES
  $ mdos add configuration
  $ mdos add config
  $ mdos add conf
  $ mdos add env
  $ mdos configuration add
  $ mdos config add
  $ mdos conf add
  $ mdos env add
  $ mdos generate configuration
  $ mdos generate conf
  $ mdos generate env
  $ mdos configuration generate
  $ mdos config generate
  $ mdos conf generate
  $ mdos env generate
```

## `mdos add ingress`

Configure ingress rules to allow external access to your component ports using hostnames

```
USAGE
  $ mdos add ingress [-h <value>] [-s <value>] [-p <value>] [-t <value>]

FLAGS
  -h, --hostname=<value>  Ingress hostname
  -p, --port=<value>      Target port
  -s, --subpath=<value>   Ingress subpath match
  -t, --type=<value>      Traffic type (http, https, tcp/udp)

DESCRIPTION
  Configure ingress rules to allow external access to your component ports using hostnames

ALIASES
  $ mdos add ingress
  $ mdos ingress add
  $ mdos ingress generate
```

## `mdos add namespace`

Create a new namespace / client / tenant

```
USAGE
  $ mdos add namespace [-n <value>]

FLAGS
  -n, --namespace=<value>  Keycloak client ID

DESCRIPTION
  Create a new namespace / client / tenant

ALIASES
  $ mdos ns create
  $ mdos create ns
  $ mdos create namespace
  $ mdos client create
  $ mdos create client
  $ mdos ns add
  $ mdos add ns
  $ mdos add namespace
  $ mdos namespaces add
  $ mdos client add
  $ mdos add client
```

## `mdos add ns`

Create a new namespace / client / tenant

```
USAGE
  $ mdos add ns [-n <value>]

FLAGS
  -n, --namespace=<value>  Keycloak client ID

DESCRIPTION
  Create a new namespace / client / tenant

ALIASES
  $ mdos ns create
  $ mdos create ns
  $ mdos create namespace
  $ mdos client create
  $ mdos create client
  $ mdos ns add
  $ mdos add ns
  $ mdos add namespace
  $ mdos namespaces add
  $ mdos client add
  $ mdos add client
```

## `mdos add port`

Expose ports for your application components so that other applications can communicate with your components

```
USAGE
  $ mdos add port

DESCRIPTION
  Expose ports for your application components so that other applications can communicate with your components

ALIASES
  $ mdos add service
  $ mdos service add
  $ mdos add port
  $ mdos port add
  $ mdos service generate
  $ mdos generate port
  $ mdos port generate
```

## `mdos add secret`

Add a secrets to you components for sensitive environement variables and secret config files

```
USAGE
  $ mdos add secret

DESCRIPTION
  Add a secrets to you components for sensitive environement variables and secret config files

ALIASES
  $ mdos add secret
  $ mdos secret add
  $ mdos secret generate
```

## `mdos add service`

Expose ports for your application components so that other applications can communicate with your components

```
USAGE
  $ mdos add service

DESCRIPTION
  Expose ports for your application components so that other applications can communicate with your components

ALIASES
  $ mdos add service
  $ mdos service add
  $ mdos add port
  $ mdos port add
  $ mdos service generate
  $ mdos generate port
  $ mdos port generate
```

## `mdos add storage`

Persist your data using volumes / storage for your components

```
USAGE
  $ mdos add storage [--hostpath <value>] [--mountpath <value>] [--inject <value>] [--name <value>]

FLAGS
  --hostpath=<value>   If set, the volume will be mounted as a host-path volume on this specified host path
  --inject=<value>     If set, the volume will be pre-populated with some files that you specify
  --mountpath=<value>  The mount path inside your container for this volume
  --name=<value>       Name for this volume

DESCRIPTION
  Persist your data using volumes / storage for your components

ALIASES
  $ mdos add volume
  $ mdos volume add
  $ mdos add storage
  $ mdos storage add
  $ mdos volume generate
  $ mdos generate storage
  $ mdos storage generate
```

## `mdos add volume`

Persist your data using volumes / storage for your components

```
USAGE
  $ mdos add volume [--hostpath <value>] [--mountpath <value>] [--inject <value>] [--name <value>]

FLAGS
  --hostpath=<value>   If set, the volume will be mounted as a host-path volume on this specified host path
  --inject=<value>     If set, the volume will be pre-populated with some files that you specify
  --mountpath=<value>  The mount path inside your container for this volume
  --name=<value>       Name for this volume

DESCRIPTION
  Persist your data using volumes / storage for your components

ALIASES
  $ mdos add volume
  $ mdos volume add
  $ mdos add storage
  $ mdos storage add
  $ mdos volume generate
  $ mdos generate storage
  $ mdos storage generate
```

## `mdos app delete`

Delete an application

```
USAGE
  $ mdos app delete [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId to look for applications for

DESCRIPTION
  Delete an application

ALIASES
  $ mdos app delete
  $ mdos delete app
  $ mdos delete application
  $ mdos delete applications
  $ mdos applications delete
```

## `mdos app deploy`

Deploy an application from the current directory

```
USAGE
  $ mdos app deploy [-u <value>] [-p <value>]

FLAGS
  -p, --password=<value>  MDos password
  -u, --username=<value>  MDos username

DESCRIPTION
  Deploy an application from the current directory

ALIASES
  $ mdos app deploy
  $ mdos deploy app
  $ mdos deploy application
  $ mdos deploy applications
  $ mdos applications deploy
```

## `mdos app list`

List your applications

```
USAGE
  $ mdos app list [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId to look for applications for?

DESCRIPTION
  List your applications

ALIASES
  $ mdos apps list
  $ mdos app list
  $ mdos list app
  $ mdos list apps
  $ mdos list application
  $ mdos list applications
  $ mdos applications list
```

## `mdos app protect`

Protect an ingress hostname

```
USAGE
  $ mdos app protect

DESCRIPTION
  Protect an ingress hostname

ALIASES
  $ mdos app sso
  $ mdos app protect
  $ mdos sso app
  $ mdos protect app
  $ mdos protect application
```

## `mdos app sso`

Protect an ingress hostname

```
USAGE
  $ mdos app sso

DESCRIPTION
  Protect an ingress hostname

ALIASES
  $ mdos app sso
  $ mdos app protect
  $ mdos sso app
  $ mdos protect app
  $ mdos protect application
```

## `mdos application delete`

Delete an application

```
USAGE
  $ mdos application delete [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId to look for applications for

DESCRIPTION
  Delete an application

ALIASES
  $ mdos app delete
  $ mdos delete app
  $ mdos delete application
  $ mdos delete applications
  $ mdos applications delete
```

## `mdos application deploy`

Deploy an application from the current directory

```
USAGE
  $ mdos application deploy [-u <value>] [-p <value>]

FLAGS
  -p, --password=<value>  MDos password
  -u, --username=<value>  MDos username

DESCRIPTION
  Deploy an application from the current directory

ALIASES
  $ mdos app deploy
  $ mdos deploy app
  $ mdos deploy application
  $ mdos deploy applications
  $ mdos applications deploy
```

## `mdos application list`

List your applications

```
USAGE
  $ mdos application list [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId to look for applications for?

DESCRIPTION
  List your applications

ALIASES
  $ mdos apps list
  $ mdos app list
  $ mdos list app
  $ mdos list apps
  $ mdos list application
  $ mdos list applications
  $ mdos applications list
```

## `mdos application protect`

Protect an ingress hostname

```
USAGE
  $ mdos application protect

DESCRIPTION
  Protect an ingress hostname

ALIASES
  $ mdos app sso
  $ mdos app protect
  $ mdos sso app
  $ mdos protect app
  $ mdos protect application
```

## `mdos applications delete`

Delete an application

```
USAGE
  $ mdos applications delete [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId to look for applications for

DESCRIPTION
  Delete an application

ALIASES
  $ mdos app delete
  $ mdos delete app
  $ mdos delete application
  $ mdos delete applications
  $ mdos applications delete
```

## `mdos applications deploy`

Deploy an application from the current directory

```
USAGE
  $ mdos applications deploy [-u <value>] [-p <value>]

FLAGS
  -p, --password=<value>  MDos password
  -u, --username=<value>  MDos username

DESCRIPTION
  Deploy an application from the current directory

ALIASES
  $ mdos app deploy
  $ mdos deploy app
  $ mdos deploy application
  $ mdos deploy applications
  $ mdos applications deploy
```

## `mdos applications list`

List your applications

```
USAGE
  $ mdos applications list [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId to look for applications for?

DESCRIPTION
  List your applications

ALIASES
  $ mdos apps list
  $ mdos app list
  $ mdos list app
  $ mdos list apps
  $ mdos list application
  $ mdos list applications
  $ mdos applications list
```

## `mdos apps list`

List your applications

```
USAGE
  $ mdos apps list [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId to look for applications for?

DESCRIPTION
  List your applications

ALIASES
  $ mdos apps list
  $ mdos app list
  $ mdos list app
  $ mdos list apps
  $ mdos list application
  $ mdos list applications
  $ mdos applications list
```

## `mdos auth tenant create-role`

Create custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos auth tenant create-role [-c <value>] [-n <value>]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -n, --name=<value>      Keycloak clientrole name

DESCRIPTION
  Create custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client create-role
  $ mdos client create role
  $ mdos client add-role
  $ mdos client add role
  $ mdos kc client create role
  $ mdos kc client add-role
  $ mdos kc client add role
```

## `mdos auth tenant delete-role`

Delete custom roles from your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos auth tenant delete-role [-c <value>] [-r <value>] [-f]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -f, --force             Do not ask for comfirmation
  -r, --role=<value>      Client role to delete

DESCRIPTION
  Delete custom roles from your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client delete-role
  $ mdos client delete role
  $ mdos client remove-role
  $ mdos client remove role
  $ mdos kc client delete role
  $ mdos kc client remove-role
  $ mdos kc client remove role
```

## `mdos auth tenant list-roles`

List your custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos auth tenant list-roles [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak aclient ID

DESCRIPTION
  List your custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client list-roles
  $ mdos client list roles
  $ mdos client show-roles
  $ mdos client show roles
  $ mdos kc client list roles
  $ mdos kc client show-roles
  $ mdos kc client show roles
```

## `mdos auth user add-role`

Add roles to your users for specific namespaces / clients / tenant

```
USAGE
  $ mdos auth user add-role [-t <value>] [-u <value>] [-c <value>] [-r <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId of the user
  -r, --role=<value>      Keycloak role name to add to this user
  -t, --target=<value>    Keycloak client target
  -u, --username=<value>  Keycloak username to add role for

DESCRIPTION
  Add roles to your users for specific namespaces / clients / tenant

ALIASES
  $ mdos user add role
  $ mdos kc user add role
  $ mdos user create-role
  $ mdos user create role
  $ mdos kc user create role
```

## `mdos auth user create`

Create a new user on the platform

```
USAGE
  $ mdos auth user create [-u <value>] [-p <value>] [-e <value>]

FLAGS
  -e, --email=<value>     Keycloak user email
  -p, --password=<value>  Keycloak password
  -u, --username=<value>  Keycloak username

DESCRIPTION
  Create a new user on the platform

ALIASES
  $ mdos user create
  $ mdos user add
  $ mdos kc user add
```

## `mdos auth user delete`

Delete a user from the platform

```
USAGE
  $ mdos auth user delete [-u <value>] [-f]

FLAGS
  -f, --force             Do not ask for comfirmation
  -u, --username=<value>  Keycloak username to delete

DESCRIPTION
  Delete a user from the platform

ALIASES
  $ mdos user delete
  $ mdos user remove
  $ mdos kc user remove
```

## `mdos auth user list`

List all platform users

```
USAGE
  $ mdos auth user list [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak client ID

DESCRIPTION
  List all platform users

ALIASES
  $ mdos user list
```

## `mdos auth user list-roles`

List user assigned roles for specific namespaces / clients / tenant

```
USAGE
  $ mdos auth user list-roles [-u <value>]

FLAGS
  -u, --username=<value>  Keycloak username to get roles for

DESCRIPTION
  List user assigned roles for specific namespaces / clients / tenant

ALIASES
  $ mdos user list-roles
  $ mdos user list roles
  $ mdos user show-roles
  $ mdos user show roles
  $ mdos kc user list roles
  $ mdos kc user show-roles
  $ mdos kc user show roles
```

## `mdos auth user remove-role`

Remove roles from your users for specific namespaces / clients / tenant

```
USAGE
  $ mdos auth user remove-role [-u <value>] [-c <value>] [-r <value>] [-f]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -f, --force             Do not ask for comfirmation
  -r, --role=<value>      Role name to remove
  -u, --username=<value>  Keycloak username

DESCRIPTION
  Remove roles from your users for specific namespaces / clients / tenant

ALIASES
  $ mdos user remove role
  $ mdos kc user remove role
  $ mdos user delete-role
  $ mdos user delete role
  $ mdos kc user delete role
```

## `mdos client add`

Create a new namespace / client / tenant

```
USAGE
  $ mdos client add [-n <value>]

FLAGS
  -n, --namespace=<value>  Keycloak client ID

DESCRIPTION
  Create a new namespace / client / tenant

ALIASES
  $ mdos ns create
  $ mdos create ns
  $ mdos create namespace
  $ mdos client create
  $ mdos create client
  $ mdos ns add
  $ mdos add ns
  $ mdos add namespace
  $ mdos namespaces add
  $ mdos client add
  $ mdos add client
```

## `mdos client add-role`

Create custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos client add-role [-c <value>] [-n <value>]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -n, --name=<value>      Keycloak clientrole name

DESCRIPTION
  Create custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client create-role
  $ mdos client create role
  $ mdos client add-role
  $ mdos client add role
  $ mdos kc client create role
  $ mdos kc client add-role
  $ mdos kc client add role
```

## `mdos client add role`

Create custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos client add role [-c <value>] [-n <value>]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -n, --name=<value>      Keycloak clientrole name

DESCRIPTION
  Create custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client create-role
  $ mdos client create role
  $ mdos client add-role
  $ mdos client add role
  $ mdos kc client create role
  $ mdos kc client add-role
  $ mdos kc client add role
```

## `mdos client create`

Create a new namespace / client / tenant

```
USAGE
  $ mdos client create [-n <value>]

FLAGS
  -n, --namespace=<value>  Keycloak client ID

DESCRIPTION
  Create a new namespace / client / tenant

ALIASES
  $ mdos ns create
  $ mdos create ns
  $ mdos create namespace
  $ mdos client create
  $ mdos create client
  $ mdos ns add
  $ mdos add ns
  $ mdos add namespace
  $ mdos namespaces add
  $ mdos client add
  $ mdos add client
```

## `mdos client create-role`

Create custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos client create-role [-c <value>] [-n <value>]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -n, --name=<value>      Keycloak clientrole name

DESCRIPTION
  Create custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client create-role
  $ mdos client create role
  $ mdos client add-role
  $ mdos client add role
  $ mdos kc client create role
  $ mdos kc client add-role
  $ mdos kc client add role
```

## `mdos client create role`

Create custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos client create role [-c <value>] [-n <value>]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -n, --name=<value>      Keycloak clientrole name

DESCRIPTION
  Create custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client create-role
  $ mdos client create role
  $ mdos client add-role
  $ mdos client add role
  $ mdos kc client create role
  $ mdos kc client add-role
  $ mdos kc client add role
```

## `mdos client delete`

Delete a namespace / client / tenant

```
USAGE
  $ mdos client delete [-n <value>] [-f]

FLAGS
  -f, --force              Do not ask for comfirmation
  -n, --namespace=<value>  Namespace to remove

DESCRIPTION
  Delete a namespace / client / tenant

ALIASES
  $ mdos ns delete
  $ mdos delete ns
  $ mdos delete namespace
  $ mdos client delete
  $ mdos delete client
  $ mdos ns remove
  $ mdos remove ns
  $ mdos remove namespace
  $ mdos namespaces remove
  $ mdos client remove
  $ mdos remove client
```

## `mdos client delete-role`

Delete custom roles from your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos client delete-role [-c <value>] [-r <value>] [-f]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -f, --force             Do not ask for comfirmation
  -r, --role=<value>      Client role to delete

DESCRIPTION
  Delete custom roles from your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client delete-role
  $ mdos client delete role
  $ mdos client remove-role
  $ mdos client remove role
  $ mdos kc client delete role
  $ mdos kc client remove-role
  $ mdos kc client remove role
```

## `mdos client delete role`

Delete custom roles from your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos client delete role [-c <value>] [-r <value>] [-f]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -f, --force             Do not ask for comfirmation
  -r, --role=<value>      Client role to delete

DESCRIPTION
  Delete custom roles from your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client delete-role
  $ mdos client delete role
  $ mdos client remove-role
  $ mdos client remove role
  $ mdos kc client delete role
  $ mdos kc client remove-role
  $ mdos kc client remove role
```

## `mdos client list`

List namespaces / clients / tenants

```
USAGE
  $ mdos client list

DESCRIPTION
  List namespaces / clients / tenants

ALIASES
  $ mdos ns list
  $ mdos list ns
  $ mdos list namespace
  $ mdos list namespaces
  $ mdos client list
  $ mdos list client
  $ mdos ns show
  $ mdos show ns
  $ mdos show namespace
  $ mdos namespace show
  $ mdos namespaces show
  $ mdos client show
  $ mdos show client
```

## `mdos client list-roles`

List your custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos client list-roles [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak aclient ID

DESCRIPTION
  List your custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client list-roles
  $ mdos client list roles
  $ mdos client show-roles
  $ mdos client show roles
  $ mdos kc client list roles
  $ mdos kc client show-roles
  $ mdos kc client show roles
```

## `mdos client list roles`

List your custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos client list roles [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak aclient ID

DESCRIPTION
  List your custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client list-roles
  $ mdos client list roles
  $ mdos client show-roles
  $ mdos client show roles
  $ mdos kc client list roles
  $ mdos kc client show-roles
  $ mdos kc client show roles
```

## `mdos client remove`

Delete a namespace / client / tenant

```
USAGE
  $ mdos client remove [-n <value>] [-f]

FLAGS
  -f, --force              Do not ask for comfirmation
  -n, --namespace=<value>  Namespace to remove

DESCRIPTION
  Delete a namespace / client / tenant

ALIASES
  $ mdos ns delete
  $ mdos delete ns
  $ mdos delete namespace
  $ mdos client delete
  $ mdos delete client
  $ mdos ns remove
  $ mdos remove ns
  $ mdos remove namespace
  $ mdos namespaces remove
  $ mdos client remove
  $ mdos remove client
```

## `mdos client remove-role`

Delete custom roles from your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos client remove-role [-c <value>] [-r <value>] [-f]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -f, --force             Do not ask for comfirmation
  -r, --role=<value>      Client role to delete

DESCRIPTION
  Delete custom roles from your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client delete-role
  $ mdos client delete role
  $ mdos client remove-role
  $ mdos client remove role
  $ mdos kc client delete role
  $ mdos kc client remove-role
  $ mdos kc client remove role
```

## `mdos client remove role`

Delete custom roles from your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos client remove role [-c <value>] [-r <value>] [-f]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -f, --force             Do not ask for comfirmation
  -r, --role=<value>      Client role to delete

DESCRIPTION
  Delete custom roles from your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client delete-role
  $ mdos client delete role
  $ mdos client remove-role
  $ mdos client remove role
  $ mdos kc client delete role
  $ mdos kc client remove-role
  $ mdos kc client remove role
```

## `mdos client show`

List namespaces / clients / tenants

```
USAGE
  $ mdos client show

DESCRIPTION
  List namespaces / clients / tenants

ALIASES
  $ mdos ns list
  $ mdos list ns
  $ mdos list namespace
  $ mdos list namespaces
  $ mdos client list
  $ mdos list client
  $ mdos ns show
  $ mdos show ns
  $ mdos show namespace
  $ mdos namespace show
  $ mdos namespaces show
  $ mdos client show
  $ mdos show client
```

## `mdos client show-roles`

List your custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos client show-roles [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak aclient ID

DESCRIPTION
  List your custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client list-roles
  $ mdos client list roles
  $ mdos client show-roles
  $ mdos client show roles
  $ mdos kc client list roles
  $ mdos kc client show-roles
  $ mdos kc client show roles
```

## `mdos client show roles`

List your custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos client show roles [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak aclient ID

DESCRIPTION
  List your custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client list-roles
  $ mdos client list roles
  $ mdos client show-roles
  $ mdos client show roles
  $ mdos kc client list roles
  $ mdos kc client show-roles
  $ mdos kc client show roles
```

## `mdos cm cert create`

Create a new Certificate / TLS secret

```
USAGE
  $ mdos cm cert create

DESCRIPTION
  Create a new Certificate / TLS secret

ALIASES
  $ mdos cm certificate create
  $ mdos cm crt create
```

## `mdos cm cert delete`

Delete a Cert-Manager Issuers

```
USAGE
  $ mdos cm cert delete

DESCRIPTION
  Delete a Cert-Manager Issuers

ALIASES
  $ mdos cm certificate delete
  $ mdos cm crt delete
```

## `mdos cm cert list`

List your certificates

```
USAGE
  $ mdos cm cert list

DESCRIPTION
  List your certificates

ALIASES
  $ mdos cm certificate list
  $ mdos cm crt list
```

## `mdos cm certificate create`

Create a new Certificate / TLS secret

```
USAGE
  $ mdos cm certificate create

DESCRIPTION
  Create a new Certificate / TLS secret

ALIASES
  $ mdos cm certificate create
  $ mdos cm crt create
```

## `mdos cm certificate delete`

Delete a Cert-Manager Issuers

```
USAGE
  $ mdos cm certificate delete

DESCRIPTION
  Delete a Cert-Manager Issuers

ALIASES
  $ mdos cm certificate delete
  $ mdos cm crt delete
```

## `mdos cm certificate list`

List your certificates

```
USAGE
  $ mdos cm certificate list

DESCRIPTION
  List your certificates

ALIASES
  $ mdos cm certificate list
  $ mdos cm crt list
```

## `mdos cm crt create`

Create a new Certificate / TLS secret

```
USAGE
  $ mdos cm crt create

DESCRIPTION
  Create a new Certificate / TLS secret

ALIASES
  $ mdos cm certificate create
  $ mdos cm crt create
```

## `mdos cm crt delete`

Delete a Cert-Manager Issuers

```
USAGE
  $ mdos cm crt delete

DESCRIPTION
  Delete a Cert-Manager Issuers

ALIASES
  $ mdos cm certificate delete
  $ mdos cm crt delete
```

## `mdos cm crt list`

List your certificates

```
USAGE
  $ mdos cm crt list

DESCRIPTION
  List your certificates

ALIASES
  $ mdos cm certificate list
  $ mdos cm crt list
```

## `mdos cm issuer create`

Create a new Cert-Manager issuer

```
USAGE
  $ mdos cm issuer create

DESCRIPTION
  Create a new Cert-Manager issuer
```

## `mdos cm issuer delete`

Delete a Cert-Manager Issuers

```
USAGE
  $ mdos cm issuer delete

DESCRIPTION
  Delete a Cert-Manager Issuers
```

## `mdos cm issuer list`

List Cert-Manager Issuers

```
USAGE
  $ mdos cm issuer list

DESCRIPTION
  List Cert-Manager Issuers
```

## `mdos conf add`

Configure environement variables and config files for your components

```
USAGE
  $ mdos conf add

DESCRIPTION
  Configure environement variables and config files for your components

ALIASES
  $ mdos add configuration
  $ mdos add config
  $ mdos add conf
  $ mdos add env
  $ mdos configuration add
  $ mdos config add
  $ mdos conf add
  $ mdos env add
  $ mdos generate configuration
  $ mdos generate conf
  $ mdos generate env
  $ mdos configuration generate
  $ mdos config generate
  $ mdos conf generate
  $ mdos env generate
```

## `mdos conf generate`

Configure environement variables and config files for your components

```
USAGE
  $ mdos conf generate

DESCRIPTION
  Configure environement variables and config files for your components

ALIASES
  $ mdos add configuration
  $ mdos add config
  $ mdos add conf
  $ mdos add env
  $ mdos configuration add
  $ mdos config add
  $ mdos conf add
  $ mdos env add
  $ mdos generate configuration
  $ mdos generate conf
  $ mdos generate env
  $ mdos configuration generate
  $ mdos config generate
  $ mdos conf generate
  $ mdos env generate
```

## `mdos config add`

Configure environement variables and config files for your components

```
USAGE
  $ mdos config add

DESCRIPTION
  Configure environement variables and config files for your components

ALIASES
  $ mdos add configuration
  $ mdos add config
  $ mdos add conf
  $ mdos add env
  $ mdos configuration add
  $ mdos config add
  $ mdos conf add
  $ mdos env add
  $ mdos generate configuration
  $ mdos generate conf
  $ mdos generate env
  $ mdos configuration generate
  $ mdos config generate
  $ mdos conf generate
  $ mdos env generate
```

## `mdos config generate`

Configure environement variables and config files for your components

```
USAGE
  $ mdos config generate

DESCRIPTION
  Configure environement variables and config files for your components

ALIASES
  $ mdos add configuration
  $ mdos add config
  $ mdos add conf
  $ mdos add env
  $ mdos configuration add
  $ mdos config add
  $ mdos conf add
  $ mdos env add
  $ mdos generate configuration
  $ mdos generate conf
  $ mdos generate env
  $ mdos configuration generate
  $ mdos config generate
  $ mdos conf generate
  $ mdos env generate
```

## `mdos configuration add`

Configure environement variables and config files for your components

```
USAGE
  $ mdos configuration add

DESCRIPTION
  Configure environement variables and config files for your components

ALIASES
  $ mdos add configuration
  $ mdos add config
  $ mdos add conf
  $ mdos add env
  $ mdos configuration add
  $ mdos config add
  $ mdos conf add
  $ mdos env add
  $ mdos generate configuration
  $ mdos generate conf
  $ mdos generate env
  $ mdos configuration generate
  $ mdos config generate
  $ mdos conf generate
  $ mdos env generate
```

## `mdos configuration generate`

Configure environement variables and config files for your components

```
USAGE
  $ mdos configuration generate

DESCRIPTION
  Configure environement variables and config files for your components

ALIASES
  $ mdos add configuration
  $ mdos add config
  $ mdos add conf
  $ mdos add env
  $ mdos configuration add
  $ mdos config add
  $ mdos conf add
  $ mdos env add
  $ mdos generate configuration
  $ mdos generate conf
  $ mdos generate env
  $ mdos configuration generate
  $ mdos config generate
  $ mdos conf generate
  $ mdos env generate
```

## `mdos configure api-endpoint [URI]`

Set the MDos API endpoint URL to use

```
USAGE
  $ mdos configure api-endpoint [URI] [--dev]

FLAGS
  --dev  Developement mode, append ports to URLs

DESCRIPTION
  Set the MDos API endpoint URL to use
```

## `mdos create app`

Scaffold a new application in the current directory

```
USAGE
  $ mdos create app [-t <value>] [-n <value>]

FLAGS
  -n, --applicationName=<value>  An application name
  -t, --tenantName=<value>       A tenant name that this application belongs to

DESCRIPTION
  Scaffold a new application in the current directory

ALIASES
  $ mdos generate app
  $ mdos gen app
  $ mdos create application
  $ mdos create app
```

## `mdos create application`

Scaffold a new application in the current directory

```
USAGE
  $ mdos create application [-t <value>] [-n <value>]

FLAGS
  -n, --applicationName=<value>  An application name
  -t, --tenantName=<value>       A tenant name that this application belongs to

DESCRIPTION
  Scaffold a new application in the current directory

ALIASES
  $ mdos generate app
  $ mdos gen app
  $ mdos create application
  $ mdos create app
```

## `mdos create client`

Create a new namespace / client / tenant

```
USAGE
  $ mdos create client [-n <value>]

FLAGS
  -n, --namespace=<value>  Keycloak client ID

DESCRIPTION
  Create a new namespace / client / tenant

ALIASES
  $ mdos ns create
  $ mdos create ns
  $ mdos create namespace
  $ mdos client create
  $ mdos create client
  $ mdos ns add
  $ mdos add ns
  $ mdos add namespace
  $ mdos namespaces add
  $ mdos client add
  $ mdos add client
```

## `mdos create comp`

Scaffold a new application component for the application in the current directory

```
USAGE
  $ mdos create comp [-n <value>] [-p <value>]

FLAGS
  -n, --name=<value>           An application component name
  -p, --networkPolicy=<value>  Network Policy to apply to this component

DESCRIPTION
  Scaffold a new application component for the application in the current directory

ALIASES
  $ mdos generate comp
  $ mdos gen comp
  $ mdos create component
  $ mdos create comp
```

## `mdos create component`

Scaffold a new application component for the application in the current directory

```
USAGE
  $ mdos create component [-n <value>] [-p <value>]

FLAGS
  -n, --name=<value>           An application component name
  -p, --networkPolicy=<value>  Network Policy to apply to this component

DESCRIPTION
  Scaffold a new application component for the application in the current directory

ALIASES
  $ mdos generate comp
  $ mdos gen comp
  $ mdos create component
  $ mdos create comp
```

## `mdos create namespace`

Create a new namespace / client / tenant

```
USAGE
  $ mdos create namespace [-n <value>]

FLAGS
  -n, --namespace=<value>  Keycloak client ID

DESCRIPTION
  Create a new namespace / client / tenant

ALIASES
  $ mdos ns create
  $ mdos create ns
  $ mdos create namespace
  $ mdos client create
  $ mdos create client
  $ mdos ns add
  $ mdos add ns
  $ mdos add namespace
  $ mdos namespaces add
  $ mdos client add
  $ mdos add client
```

## `mdos create ns`

Create a new namespace / client / tenant

```
USAGE
  $ mdos create ns [-n <value>]

FLAGS
  -n, --namespace=<value>  Keycloak client ID

DESCRIPTION
  Create a new namespace / client / tenant

ALIASES
  $ mdos ns create
  $ mdos create ns
  $ mdos create namespace
  $ mdos client create
  $ mdos create client
  $ mdos ns add
  $ mdos add ns
  $ mdos add namespace
  $ mdos namespaces add
  $ mdos client add
  $ mdos add client
```

## `mdos delete app`

Delete an application

```
USAGE
  $ mdos delete app [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId to look for applications for

DESCRIPTION
  Delete an application

ALIASES
  $ mdos app delete
  $ mdos delete app
  $ mdos delete application
  $ mdos delete applications
  $ mdos applications delete
```

## `mdos delete application`

Delete an application

```
USAGE
  $ mdos delete application [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId to look for applications for

DESCRIPTION
  Delete an application

ALIASES
  $ mdos app delete
  $ mdos delete app
  $ mdos delete application
  $ mdos delete applications
  $ mdos applications delete
```

## `mdos delete applications`

Delete an application

```
USAGE
  $ mdos delete applications [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId to look for applications for

DESCRIPTION
  Delete an application

ALIASES
  $ mdos app delete
  $ mdos delete app
  $ mdos delete application
  $ mdos delete applications
  $ mdos applications delete
```

## `mdos delete client`

Delete a namespace / client / tenant

```
USAGE
  $ mdos delete client [-n <value>] [-f]

FLAGS
  -f, --force              Do not ask for comfirmation
  -n, --namespace=<value>  Namespace to remove

DESCRIPTION
  Delete a namespace / client / tenant

ALIASES
  $ mdos ns delete
  $ mdos delete ns
  $ mdos delete namespace
  $ mdos client delete
  $ mdos delete client
  $ mdos ns remove
  $ mdos remove ns
  $ mdos remove namespace
  $ mdos namespaces remove
  $ mdos client remove
  $ mdos remove client
```

## `mdos delete namespace`

Delete a namespace / client / tenant

```
USAGE
  $ mdos delete namespace [-n <value>] [-f]

FLAGS
  -f, --force              Do not ask for comfirmation
  -n, --namespace=<value>  Namespace to remove

DESCRIPTION
  Delete a namespace / client / tenant

ALIASES
  $ mdos ns delete
  $ mdos delete ns
  $ mdos delete namespace
  $ mdos client delete
  $ mdos delete client
  $ mdos ns remove
  $ mdos remove ns
  $ mdos remove namespace
  $ mdos namespaces remove
  $ mdos client remove
  $ mdos remove client
```

## `mdos delete ns`

Delete a namespace / client / tenant

```
USAGE
  $ mdos delete ns [-n <value>] [-f]

FLAGS
  -f, --force              Do not ask for comfirmation
  -n, --namespace=<value>  Namespace to remove

DESCRIPTION
  Delete a namespace / client / tenant

ALIASES
  $ mdos ns delete
  $ mdos delete ns
  $ mdos delete namespace
  $ mdos client delete
  $ mdos delete client
  $ mdos ns remove
  $ mdos remove ns
  $ mdos remove namespace
  $ mdos namespaces remove
  $ mdos client remove
  $ mdos remove client
```

## `mdos deploy app`

Deploy an application from the current directory

```
USAGE
  $ mdos deploy app [-u <value>] [-p <value>]

FLAGS
  -p, --password=<value>  MDos password
  -u, --username=<value>  MDos username

DESCRIPTION
  Deploy an application from the current directory

ALIASES
  $ mdos app deploy
  $ mdos deploy app
  $ mdos deploy application
  $ mdos deploy applications
  $ mdos applications deploy
```

## `mdos deploy application`

Deploy an application from the current directory

```
USAGE
  $ mdos deploy application [-u <value>] [-p <value>]

FLAGS
  -p, --password=<value>  MDos password
  -u, --username=<value>  MDos username

DESCRIPTION
  Deploy an application from the current directory

ALIASES
  $ mdos app deploy
  $ mdos deploy app
  $ mdos deploy application
  $ mdos deploy applications
  $ mdos applications deploy
```

## `mdos deploy applications`

Deploy an application from the current directory

```
USAGE
  $ mdos deploy applications [-u <value>] [-p <value>]

FLAGS
  -p, --password=<value>  MDos password
  -u, --username=<value>  MDos username

DESCRIPTION
  Deploy an application from the current directory

ALIASES
  $ mdos app deploy
  $ mdos deploy app
  $ mdos deploy application
  $ mdos deploy applications
  $ mdos applications deploy
```

## `mdos env add`

Configure environement variables and config files for your components

```
USAGE
  $ mdos env add

DESCRIPTION
  Configure environement variables and config files for your components

ALIASES
  $ mdos add configuration
  $ mdos add config
  $ mdos add conf
  $ mdos add env
  $ mdos configuration add
  $ mdos config add
  $ mdos conf add
  $ mdos env add
  $ mdos generate configuration
  $ mdos generate conf
  $ mdos generate env
  $ mdos configuration generate
  $ mdos config generate
  $ mdos conf generate
  $ mdos env generate
```

## `mdos env generate`

Configure environement variables and config files for your components

```
USAGE
  $ mdos env generate

DESCRIPTION
  Configure environement variables and config files for your components

ALIASES
  $ mdos add configuration
  $ mdos add config
  $ mdos add conf
  $ mdos add env
  $ mdos configuration add
  $ mdos config add
  $ mdos conf add
  $ mdos env add
  $ mdos generate configuration
  $ mdos generate conf
  $ mdos generate env
  $ mdos configuration generate
  $ mdos config generate
  $ mdos conf generate
  $ mdos env generate
```

## `mdos gateway add`

Add a new ingress gateway config

```
USAGE
  $ mdos gateway add

DESCRIPTION
  Add a new ingress gateway config

ALIASES
  $ mdos gateway add
  $ mdos gateway create
  $ mdos ingress-gateway create
```

## `mdos gateway create`

Add a new ingress gateway config

```
USAGE
  $ mdos gateway create

DESCRIPTION
  Add a new ingress gateway config

ALIASES
  $ mdos gateway add
  $ mdos gateway create
  $ mdos ingress-gateway create
```

## `mdos gateway list`

List existing ingress gateway configs

```
USAGE
  $ mdos gateway list

DESCRIPTION
  List existing ingress gateway configs

ALIASES
  $ mdos gateway list
```

## `mdos gateway remove`

Remove an existing ingress gateway config

```
USAGE
  $ mdos gateway remove

DESCRIPTION
  Remove an existing ingress gateway config

ALIASES
  $ mdos gateway remove
```

## `mdos gen app`

Scaffold a new application in the current directory

```
USAGE
  $ mdos gen app [-t <value>] [-n <value>]

FLAGS
  -n, --applicationName=<value>  An application name
  -t, --tenantName=<value>       A tenant name that this application belongs to

DESCRIPTION
  Scaffold a new application in the current directory

ALIASES
  $ mdos generate app
  $ mdos gen app
  $ mdos create application
  $ mdos create app
```

## `mdos gen comp`

Scaffold a new application component for the application in the current directory

```
USAGE
  $ mdos gen comp [-n <value>] [-p <value>]

FLAGS
  -n, --name=<value>           An application component name
  -p, --networkPolicy=<value>  Network Policy to apply to this component

DESCRIPTION
  Scaffold a new application component for the application in the current directory

ALIASES
  $ mdos generate comp
  $ mdos gen comp
  $ mdos create component
  $ mdos create comp
```

## `mdos generate app`

Scaffold a new application in the current directory

```
USAGE
  $ mdos generate app [-t <value>] [-n <value>]

FLAGS
  -n, --applicationName=<value>  An application name
  -t, --tenantName=<value>       A tenant name that this application belongs to

DESCRIPTION
  Scaffold a new application in the current directory

ALIASES
  $ mdos generate app
  $ mdos gen app
  $ mdos create application
  $ mdos create app
```

## `mdos generate application`

Scaffold a new application in the current directory

```
USAGE
  $ mdos generate application [-t <value>] [-n <value>]

FLAGS
  -n, --applicationName=<value>  An application name
  -t, --tenantName=<value>       A tenant name that this application belongs to

DESCRIPTION
  Scaffold a new application in the current directory

ALIASES
  $ mdos generate app
  $ mdos gen app
  $ mdos create application
  $ mdos create app
```

## `mdos generate comp`

Scaffold a new application component for the application in the current directory

```
USAGE
  $ mdos generate comp [-n <value>] [-p <value>]

FLAGS
  -n, --name=<value>           An application component name
  -p, --networkPolicy=<value>  Network Policy to apply to this component

DESCRIPTION
  Scaffold a new application component for the application in the current directory

ALIASES
  $ mdos generate comp
  $ mdos gen comp
  $ mdos create component
  $ mdos create comp
```

## `mdos generate component`

Scaffold a new application component for the application in the current directory

```
USAGE
  $ mdos generate component [-n <value>] [-p <value>]

FLAGS
  -n, --name=<value>           An application component name
  -p, --networkPolicy=<value>  Network Policy to apply to this component

DESCRIPTION
  Scaffold a new application component for the application in the current directory

ALIASES
  $ mdos generate comp
  $ mdos gen comp
  $ mdos create component
  $ mdos create comp
```

## `mdos generate conf`

Configure environement variables and config files for your components

```
USAGE
  $ mdos generate conf

DESCRIPTION
  Configure environement variables and config files for your components

ALIASES
  $ mdos add configuration
  $ mdos add config
  $ mdos add conf
  $ mdos add env
  $ mdos configuration add
  $ mdos config add
  $ mdos conf add
  $ mdos env add
  $ mdos generate configuration
  $ mdos generate conf
  $ mdos generate env
  $ mdos configuration generate
  $ mdos config generate
  $ mdos conf generate
  $ mdos env generate
```

## `mdos generate config`

Configure environement variables and config files for your components

```
USAGE
  $ mdos generate config

DESCRIPTION
  Configure environement variables and config files for your components

ALIASES
  $ mdos add configuration
  $ mdos add config
  $ mdos add conf
  $ mdos add env
  $ mdos configuration add
  $ mdos config add
  $ mdos conf add
  $ mdos env add
  $ mdos generate configuration
  $ mdos generate conf
  $ mdos generate env
  $ mdos configuration generate
  $ mdos config generate
  $ mdos conf generate
  $ mdos env generate
```

## `mdos generate configuration`

Configure environement variables and config files for your components

```
USAGE
  $ mdos generate configuration

DESCRIPTION
  Configure environement variables and config files for your components

ALIASES
  $ mdos add configuration
  $ mdos add config
  $ mdos add conf
  $ mdos add env
  $ mdos configuration add
  $ mdos config add
  $ mdos conf add
  $ mdos env add
  $ mdos generate configuration
  $ mdos generate conf
  $ mdos generate env
  $ mdos configuration generate
  $ mdos config generate
  $ mdos conf generate
  $ mdos env generate
```

## `mdos generate env`

Configure environement variables and config files for your components

```
USAGE
  $ mdos generate env

DESCRIPTION
  Configure environement variables and config files for your components

ALIASES
  $ mdos add configuration
  $ mdos add config
  $ mdos add conf
  $ mdos add env
  $ mdos configuration add
  $ mdos config add
  $ mdos conf add
  $ mdos env add
  $ mdos generate configuration
  $ mdos generate conf
  $ mdos generate env
  $ mdos configuration generate
  $ mdos config generate
  $ mdos conf generate
  $ mdos env generate
```

## `mdos generate ingress`

Configure ingress rules to allow external access to your component ports using hostnames

```
USAGE
  $ mdos generate ingress [-h <value>] [-s <value>] [-p <value>] [-t <value>]

FLAGS
  -h, --hostname=<value>  Ingress hostname
  -p, --port=<value>      Target port
  -s, --subpath=<value>   Ingress subpath match
  -t, --type=<value>      Traffic type (http, https, tcp/udp)

DESCRIPTION
  Configure ingress rules to allow external access to your component ports using hostnames

ALIASES
  $ mdos add ingress
  $ mdos ingress add
  $ mdos ingress generate
```

## `mdos generate port`

Expose ports for your application components so that other applications can communicate with your components

```
USAGE
  $ mdos generate port

DESCRIPTION
  Expose ports for your application components so that other applications can communicate with your components

ALIASES
  $ mdos add service
  $ mdos service add
  $ mdos add port
  $ mdos port add
  $ mdos service generate
  $ mdos generate port
  $ mdos port generate
```

## `mdos generate secret`

Add a secrets to you components for sensitive environement variables and secret config files

```
USAGE
  $ mdos generate secret

DESCRIPTION
  Add a secrets to you components for sensitive environement variables and secret config files

ALIASES
  $ mdos add secret
  $ mdos secret add
  $ mdos secret generate
```

## `mdos generate service`

Expose ports for your application components so that other applications can communicate with your components

```
USAGE
  $ mdos generate service

DESCRIPTION
  Expose ports for your application components so that other applications can communicate with your components

ALIASES
  $ mdos add service
  $ mdos service add
  $ mdos add port
  $ mdos port add
  $ mdos service generate
  $ mdos generate port
  $ mdos port generate
```

## `mdos generate storage`

Persist your data using volumes / storage for your components

```
USAGE
  $ mdos generate storage [--hostpath <value>] [--mountpath <value>] [--inject <value>] [--name <value>]

FLAGS
  --hostpath=<value>   If set, the volume will be mounted as a host-path volume on this specified host path
  --inject=<value>     If set, the volume will be pre-populated with some files that you specify
  --mountpath=<value>  The mount path inside your container for this volume
  --name=<value>       Name for this volume

DESCRIPTION
  Persist your data using volumes / storage for your components

ALIASES
  $ mdos add volume
  $ mdos volume add
  $ mdos add storage
  $ mdos storage add
  $ mdos volume generate
  $ mdos generate storage
  $ mdos storage generate
```

## `mdos generate volume`

Persist your data using volumes / storage for your components

```
USAGE
  $ mdos generate volume [--hostpath <value>] [--mountpath <value>] [--inject <value>] [--name <value>]

FLAGS
  --hostpath=<value>   If set, the volume will be mounted as a host-path volume on this specified host path
  --inject=<value>     If set, the volume will be pre-populated with some files that you specify
  --mountpath=<value>  The mount path inside your container for this volume
  --name=<value>       Name for this volume

DESCRIPTION
  Persist your data using volumes / storage for your components

ALIASES
  $ mdos add volume
  $ mdos volume add
  $ mdos add storage
  $ mdos storage add
  $ mdos volume generate
  $ mdos generate storage
  $ mdos storage generate
```

## `mdos help [COMMAND]`

Display help for mdos.

```
USAGE
  $ mdos help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for mdos.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.12/src/commands/help.ts)_

## `mdos ingress-gateway add`

Add a new ingress gateway config

```
USAGE
  $ mdos ingress-gateway add

DESCRIPTION
  Add a new ingress gateway config

ALIASES
  $ mdos gateway add
  $ mdos gateway create
  $ mdos ingress-gateway create
```

## `mdos ingress-gateway create`

Add a new ingress gateway config

```
USAGE
  $ mdos ingress-gateway create

DESCRIPTION
  Add a new ingress gateway config

ALIASES
  $ mdos gateway add
  $ mdos gateway create
  $ mdos ingress-gateway create
```

## `mdos ingress-gateway list`

List existing ingress gateway configs

```
USAGE
  $ mdos ingress-gateway list

DESCRIPTION
  List existing ingress gateway configs

ALIASES
  $ mdos gateway list
```

## `mdos ingress-gateway remove`

Remove an existing ingress gateway config

```
USAGE
  $ mdos ingress-gateway remove

DESCRIPTION
  Remove an existing ingress gateway config

ALIASES
  $ mdos gateway remove
```

## `mdos ingress add`

Configure ingress rules to allow external access to your component ports using hostnames

```
USAGE
  $ mdos ingress add [-h <value>] [-s <value>] [-p <value>] [-t <value>]

FLAGS
  -h, --hostname=<value>  Ingress hostname
  -p, --port=<value>      Target port
  -s, --subpath=<value>   Ingress subpath match
  -t, --type=<value>      Traffic type (http, https, tcp/udp)

DESCRIPTION
  Configure ingress rules to allow external access to your component ports using hostnames

ALIASES
  $ mdos add ingress
  $ mdos ingress add
  $ mdos ingress generate
```

## `mdos ingress generate`

Configure ingress rules to allow external access to your component ports using hostnames

```
USAGE
  $ mdos ingress generate [-h <value>] [-s <value>] [-p <value>] [-t <value>]

FLAGS
  -h, --hostname=<value>  Ingress hostname
  -p, --port=<value>      Target port
  -s, --subpath=<value>   Ingress subpath match
  -t, --type=<value>      Traffic type (http, https, tcp/udp)

DESCRIPTION
  Configure ingress rules to allow external access to your component ports using hostnames

ALIASES
  $ mdos add ingress
  $ mdos ingress add
  $ mdos ingress generate
```

## `mdos install-framework`

Install MDos framework to your kubernetes cluster

```
USAGE
  $ mdos install-framework

DESCRIPTION
  Install MDos framework to your kubernetes cluster
```

_See code: [dist/commands/install-framework.ts](https://github.com/mdos-cli/hello-world/blob/v2.0.2/dist/commands/install-framework.ts)_

## `mdos kc client add-role`

Create custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos kc client add-role [-c <value>] [-n <value>]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -n, --name=<value>      Keycloak clientrole name

DESCRIPTION
  Create custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client create-role
  $ mdos client create role
  $ mdos client add-role
  $ mdos client add role
  $ mdos kc client create role
  $ mdos kc client add-role
  $ mdos kc client add role
```

## `mdos kc client add role`

Create custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos kc client add role [-c <value>] [-n <value>]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -n, --name=<value>      Keycloak clientrole name

DESCRIPTION
  Create custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client create-role
  $ mdos client create role
  $ mdos client add-role
  $ mdos client add role
  $ mdos kc client create role
  $ mdos kc client add-role
  $ mdos kc client add role
```

## `mdos kc client create role`

Create custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos kc client create role [-c <value>] [-n <value>]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -n, --name=<value>      Keycloak clientrole name

DESCRIPTION
  Create custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client create-role
  $ mdos client create role
  $ mdos client add-role
  $ mdos client add role
  $ mdos kc client create role
  $ mdos kc client add-role
  $ mdos kc client add role
```

## `mdos kc client delete role`

Delete custom roles from your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos kc client delete role [-c <value>] [-r <value>] [-f]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -f, --force             Do not ask for comfirmation
  -r, --role=<value>      Client role to delete

DESCRIPTION
  Delete custom roles from your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client delete-role
  $ mdos client delete role
  $ mdos client remove-role
  $ mdos client remove role
  $ mdos kc client delete role
  $ mdos kc client remove-role
  $ mdos kc client remove role
```

## `mdos kc client list roles`

List your custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos kc client list roles [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak aclient ID

DESCRIPTION
  List your custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client list-roles
  $ mdos client list roles
  $ mdos client show-roles
  $ mdos client show roles
  $ mdos kc client list roles
  $ mdos kc client show-roles
  $ mdos kc client show roles
```

## `mdos kc client remove-role`

Delete custom roles from your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos kc client remove-role [-c <value>] [-r <value>] [-f]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -f, --force             Do not ask for comfirmation
  -r, --role=<value>      Client role to delete

DESCRIPTION
  Delete custom roles from your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client delete-role
  $ mdos client delete role
  $ mdos client remove-role
  $ mdos client remove role
  $ mdos kc client delete role
  $ mdos kc client remove-role
  $ mdos kc client remove role
```

## `mdos kc client remove role`

Delete custom roles from your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos kc client remove role [-c <value>] [-r <value>] [-f]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -f, --force             Do not ask for comfirmation
  -r, --role=<value>      Client role to delete

DESCRIPTION
  Delete custom roles from your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client delete-role
  $ mdos client delete role
  $ mdos client remove-role
  $ mdos client remove role
  $ mdos kc client delete role
  $ mdos kc client remove-role
  $ mdos kc client remove role
```

## `mdos kc client show-roles`

List your custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos kc client show-roles [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak aclient ID

DESCRIPTION
  List your custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client list-roles
  $ mdos client list roles
  $ mdos client show-roles
  $ mdos client show roles
  $ mdos kc client list roles
  $ mdos kc client show-roles
  $ mdos kc client show roles
```

## `mdos kc client show roles`

List your custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

```
USAGE
  $ mdos kc client show roles [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak aclient ID

DESCRIPTION
  List your custom roles for your namespace / client / tenant (Used for OIDC authentication and ACL)

ALIASES
  $ mdos client list-roles
  $ mdos client list roles
  $ mdos client show-roles
  $ mdos client show roles
  $ mdos kc client list roles
  $ mdos kc client show-roles
  $ mdos kc client show roles
```

## `mdos kc user add`

Create a new user on the platform

```
USAGE
  $ mdos kc user add [-u <value>] [-p <value>] [-e <value>]

FLAGS
  -e, --email=<value>     Keycloak user email
  -p, --password=<value>  Keycloak password
  -u, --username=<value>  Keycloak username

DESCRIPTION
  Create a new user on the platform

ALIASES
  $ mdos user create
  $ mdos user add
  $ mdos kc user add
```

## `mdos kc user add role`

Add roles to your users for specific namespaces / clients / tenant

```
USAGE
  $ mdos kc user add role [-t <value>] [-u <value>] [-c <value>] [-r <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId of the user
  -r, --role=<value>      Keycloak role name to add to this user
  -t, --target=<value>    Keycloak client target
  -u, --username=<value>  Keycloak username to add role for

DESCRIPTION
  Add roles to your users for specific namespaces / clients / tenant

ALIASES
  $ mdos user add role
  $ mdos kc user add role
  $ mdos user create-role
  $ mdos user create role
  $ mdos kc user create role
```

## `mdos kc user create role`

Add roles to your users for specific namespaces / clients / tenant

```
USAGE
  $ mdos kc user create role [-t <value>] [-u <value>] [-c <value>] [-r <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId of the user
  -r, --role=<value>      Keycloak role name to add to this user
  -t, --target=<value>    Keycloak client target
  -u, --username=<value>  Keycloak username to add role for

DESCRIPTION
  Add roles to your users for specific namespaces / clients / tenant

ALIASES
  $ mdos user add role
  $ mdos kc user add role
  $ mdos user create-role
  $ mdos user create role
  $ mdos kc user create role
```

## `mdos kc user delete role`

Remove roles from your users for specific namespaces / clients / tenant

```
USAGE
  $ mdos kc user delete role [-u <value>] [-c <value>] [-r <value>] [-f]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -f, --force             Do not ask for comfirmation
  -r, --role=<value>      Role name to remove
  -u, --username=<value>  Keycloak username

DESCRIPTION
  Remove roles from your users for specific namespaces / clients / tenant

ALIASES
  $ mdos user remove role
  $ mdos kc user remove role
  $ mdos user delete-role
  $ mdos user delete role
  $ mdos kc user delete role
```

## `mdos kc user list roles`

List user assigned roles for specific namespaces / clients / tenant

```
USAGE
  $ mdos kc user list roles [-u <value>]

FLAGS
  -u, --username=<value>  Keycloak username to get roles for

DESCRIPTION
  List user assigned roles for specific namespaces / clients / tenant

ALIASES
  $ mdos user list-roles
  $ mdos user list roles
  $ mdos user show-roles
  $ mdos user show roles
  $ mdos kc user list roles
  $ mdos kc user show-roles
  $ mdos kc user show roles
```

## `mdos kc user remove`

Delete a user from the platform

```
USAGE
  $ mdos kc user remove [-u <value>] [-f]

FLAGS
  -f, --force             Do not ask for comfirmation
  -u, --username=<value>  Keycloak username to delete

DESCRIPTION
  Delete a user from the platform

ALIASES
  $ mdos user delete
  $ mdos user remove
  $ mdos kc user remove
```

## `mdos kc user remove role`

Remove roles from your users for specific namespaces / clients / tenant

```
USAGE
  $ mdos kc user remove role [-u <value>] [-c <value>] [-r <value>] [-f]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -f, --force             Do not ask for comfirmation
  -r, --role=<value>      Role name to remove
  -u, --username=<value>  Keycloak username

DESCRIPTION
  Remove roles from your users for specific namespaces / clients / tenant

ALIASES
  $ mdos user remove role
  $ mdos kc user remove role
  $ mdos user delete-role
  $ mdos user delete role
  $ mdos kc user delete role
```

## `mdos kc user show-roles`

List user assigned roles for specific namespaces / clients / tenant

```
USAGE
  $ mdos kc user show-roles [-u <value>]

FLAGS
  -u, --username=<value>  Keycloak username to get roles for

DESCRIPTION
  List user assigned roles for specific namespaces / clients / tenant

ALIASES
  $ mdos user list-roles
  $ mdos user list roles
  $ mdos user show-roles
  $ mdos user show roles
  $ mdos kc user list roles
  $ mdos kc user show-roles
  $ mdos kc user show roles
```

## `mdos kc user show roles`

List user assigned roles for specific namespaces / clients / tenant

```
USAGE
  $ mdos kc user show roles [-u <value>]

FLAGS
  -u, --username=<value>  Keycloak username to get roles for

DESCRIPTION
  List user assigned roles for specific namespaces / clients / tenant

ALIASES
  $ mdos user list-roles
  $ mdos user list roles
  $ mdos user show-roles
  $ mdos user show roles
  $ mdos kc user list roles
  $ mdos kc user show-roles
  $ mdos kc user show roles
```

## `mdos list app`

List your applications

```
USAGE
  $ mdos list app [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId to look for applications for?

DESCRIPTION
  List your applications

ALIASES
  $ mdos apps list
  $ mdos app list
  $ mdos list app
  $ mdos list apps
  $ mdos list application
  $ mdos list applications
  $ mdos applications list
```

## `mdos list application`

List your applications

```
USAGE
  $ mdos list application [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId to look for applications for?

DESCRIPTION
  List your applications

ALIASES
  $ mdos apps list
  $ mdos app list
  $ mdos list app
  $ mdos list apps
  $ mdos list application
  $ mdos list applications
  $ mdos applications list
```

## `mdos list applications`

List your applications

```
USAGE
  $ mdos list applications [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId to look for applications for?

DESCRIPTION
  List your applications

ALIASES
  $ mdos apps list
  $ mdos app list
  $ mdos list app
  $ mdos list apps
  $ mdos list application
  $ mdos list applications
  $ mdos applications list
```

## `mdos list apps`

List your applications

```
USAGE
  $ mdos list apps [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId to look for applications for?

DESCRIPTION
  List your applications

ALIASES
  $ mdos apps list
  $ mdos app list
  $ mdos list app
  $ mdos list apps
  $ mdos list application
  $ mdos list applications
  $ mdos applications list
```

## `mdos list client`

List namespaces / clients / tenants

```
USAGE
  $ mdos list client

DESCRIPTION
  List namespaces / clients / tenants

ALIASES
  $ mdos ns list
  $ mdos list ns
  $ mdos list namespace
  $ mdos list namespaces
  $ mdos client list
  $ mdos list client
  $ mdos ns show
  $ mdos show ns
  $ mdos show namespace
  $ mdos namespace show
  $ mdos namespaces show
  $ mdos client show
  $ mdos show client
```

## `mdos list namespace`

List namespaces / clients / tenants

```
USAGE
  $ mdos list namespace

DESCRIPTION
  List namespaces / clients / tenants

ALIASES
  $ mdos ns list
  $ mdos list ns
  $ mdos list namespace
  $ mdos list namespaces
  $ mdos client list
  $ mdos list client
  $ mdos ns show
  $ mdos show ns
  $ mdos show namespace
  $ mdos namespace show
  $ mdos namespaces show
  $ mdos client show
  $ mdos show client
```

## `mdos list namespaces`

List namespaces / clients / tenants

```
USAGE
  $ mdos list namespaces

DESCRIPTION
  List namespaces / clients / tenants

ALIASES
  $ mdos ns list
  $ mdos list ns
  $ mdos list namespace
  $ mdos list namespaces
  $ mdos client list
  $ mdos list client
  $ mdos ns show
  $ mdos show ns
  $ mdos show namespace
  $ mdos namespace show
  $ mdos namespaces show
  $ mdos client show
  $ mdos show client
```

## `mdos list ns`

List namespaces / clients / tenants

```
USAGE
  $ mdos list ns

DESCRIPTION
  List namespaces / clients / tenants

ALIASES
  $ mdos ns list
  $ mdos list ns
  $ mdos list namespace
  $ mdos list namespaces
  $ mdos client list
  $ mdos list client
  $ mdos ns show
  $ mdos show ns
  $ mdos show namespace
  $ mdos namespace show
  $ mdos namespaces show
  $ mdos client show
  $ mdos show client
```

## `mdos login`

Login to the platform

```
USAGE
  $ mdos login

DESCRIPTION
  Login to the platform
```

_See code: [dist/commands/login.ts](https://github.com/mdos-cli/hello-world/blob/v2.0.2/dist/commands/login.ts)_

## `mdos logout`

Logout from the platform

```
USAGE
  $ mdos logout

DESCRIPTION
  Logout from the platform
```

_See code: [dist/commands/logout.ts](https://github.com/mdos-cli/hello-world/blob/v2.0.2/dist/commands/logout.ts)_

## `mdos namespace create`

Create a new namespace / client / tenant

```
USAGE
  $ mdos namespace create [-n <value>]

FLAGS
  -n, --namespace=<value>  Keycloak client ID

DESCRIPTION
  Create a new namespace / client / tenant

ALIASES
  $ mdos ns create
  $ mdos create ns
  $ mdos create namespace
  $ mdos client create
  $ mdos create client
  $ mdos ns add
  $ mdos add ns
  $ mdos add namespace
  $ mdos namespaces add
  $ mdos client add
  $ mdos add client
```

## `mdos namespace delete`

Delete a namespace / client / tenant

```
USAGE
  $ mdos namespace delete [-n <value>] [-f]

FLAGS
  -f, --force              Do not ask for comfirmation
  -n, --namespace=<value>  Namespace to remove

DESCRIPTION
  Delete a namespace / client / tenant

ALIASES
  $ mdos ns delete
  $ mdos delete ns
  $ mdos delete namespace
  $ mdos client delete
  $ mdos delete client
  $ mdos ns remove
  $ mdos remove ns
  $ mdos remove namespace
  $ mdos namespaces remove
  $ mdos client remove
  $ mdos remove client
```

## `mdos namespace list`

List namespaces / clients / tenants

```
USAGE
  $ mdos namespace list

DESCRIPTION
  List namespaces / clients / tenants

ALIASES
  $ mdos ns list
  $ mdos list ns
  $ mdos list namespace
  $ mdos list namespaces
  $ mdos client list
  $ mdos list client
  $ mdos ns show
  $ mdos show ns
  $ mdos show namespace
  $ mdos namespace show
  $ mdos namespaces show
  $ mdos client show
  $ mdos show client
```

## `mdos namespace show`

List namespaces / clients / tenants

```
USAGE
  $ mdos namespace show

DESCRIPTION
  List namespaces / clients / tenants

ALIASES
  $ mdos ns list
  $ mdos list ns
  $ mdos list namespace
  $ mdos list namespaces
  $ mdos client list
  $ mdos list client
  $ mdos ns show
  $ mdos show ns
  $ mdos show namespace
  $ mdos namespace show
  $ mdos namespaces show
  $ mdos client show
  $ mdos show client
```

## `mdos namespaces add`

Create a new namespace / client / tenant

```
USAGE
  $ mdos namespaces add [-n <value>]

FLAGS
  -n, --namespace=<value>  Keycloak client ID

DESCRIPTION
  Create a new namespace / client / tenant

ALIASES
  $ mdos ns create
  $ mdos create ns
  $ mdos create namespace
  $ mdos client create
  $ mdos create client
  $ mdos ns add
  $ mdos add ns
  $ mdos add namespace
  $ mdos namespaces add
  $ mdos client add
  $ mdos add client
```

## `mdos namespaces remove`

Delete a namespace / client / tenant

```
USAGE
  $ mdos namespaces remove [-n <value>] [-f]

FLAGS
  -f, --force              Do not ask for comfirmation
  -n, --namespace=<value>  Namespace to remove

DESCRIPTION
  Delete a namespace / client / tenant

ALIASES
  $ mdos ns delete
  $ mdos delete ns
  $ mdos delete namespace
  $ mdos client delete
  $ mdos delete client
  $ mdos ns remove
  $ mdos remove ns
  $ mdos remove namespace
  $ mdos namespaces remove
  $ mdos client remove
  $ mdos remove client
```

## `mdos namespaces show`

List namespaces / clients / tenants

```
USAGE
  $ mdos namespaces show

DESCRIPTION
  List namespaces / clients / tenants

ALIASES
  $ mdos ns list
  $ mdos list ns
  $ mdos list namespace
  $ mdos list namespaces
  $ mdos client list
  $ mdos list client
  $ mdos ns show
  $ mdos show ns
  $ mdos show namespace
  $ mdos namespace show
  $ mdos namespaces show
  $ mdos client show
  $ mdos show client
```

## `mdos ns add`

Create a new namespace / client / tenant

```
USAGE
  $ mdos ns add [-n <value>]

FLAGS
  -n, --namespace=<value>  Keycloak client ID

DESCRIPTION
  Create a new namespace / client / tenant

ALIASES
  $ mdos ns create
  $ mdos create ns
  $ mdos create namespace
  $ mdos client create
  $ mdos create client
  $ mdos ns add
  $ mdos add ns
  $ mdos add namespace
  $ mdos namespaces add
  $ mdos client add
  $ mdos add client
```

## `mdos ns create`

Create a new namespace / client / tenant

```
USAGE
  $ mdos ns create [-n <value>]

FLAGS
  -n, --namespace=<value>  Keycloak client ID

DESCRIPTION
  Create a new namespace / client / tenant

ALIASES
  $ mdos ns create
  $ mdos create ns
  $ mdos create namespace
  $ mdos client create
  $ mdos create client
  $ mdos ns add
  $ mdos add ns
  $ mdos add namespace
  $ mdos namespaces add
  $ mdos client add
  $ mdos add client
```

## `mdos ns delete`

Delete a namespace / client / tenant

```
USAGE
  $ mdos ns delete [-n <value>] [-f]

FLAGS
  -f, --force              Do not ask for comfirmation
  -n, --namespace=<value>  Namespace to remove

DESCRIPTION
  Delete a namespace / client / tenant

ALIASES
  $ mdos ns delete
  $ mdos delete ns
  $ mdos delete namespace
  $ mdos client delete
  $ mdos delete client
  $ mdos ns remove
  $ mdos remove ns
  $ mdos remove namespace
  $ mdos namespaces remove
  $ mdos client remove
  $ mdos remove client
```

## `mdos ns list`

List namespaces / clients / tenants

```
USAGE
  $ mdos ns list

DESCRIPTION
  List namespaces / clients / tenants

ALIASES
  $ mdos ns list
  $ mdos list ns
  $ mdos list namespace
  $ mdos list namespaces
  $ mdos client list
  $ mdos list client
  $ mdos ns show
  $ mdos show ns
  $ mdos show namespace
  $ mdos namespace show
  $ mdos namespaces show
  $ mdos client show
  $ mdos show client
```

## `mdos ns remove`

Delete a namespace / client / tenant

```
USAGE
  $ mdos ns remove [-n <value>] [-f]

FLAGS
  -f, --force              Do not ask for comfirmation
  -n, --namespace=<value>  Namespace to remove

DESCRIPTION
  Delete a namespace / client / tenant

ALIASES
  $ mdos ns delete
  $ mdos delete ns
  $ mdos delete namespace
  $ mdos client delete
  $ mdos delete client
  $ mdos ns remove
  $ mdos remove ns
  $ mdos remove namespace
  $ mdos namespaces remove
  $ mdos client remove
  $ mdos remove client
```

## `mdos ns show`

List namespaces / clients / tenants

```
USAGE
  $ mdos ns show

DESCRIPTION
  List namespaces / clients / tenants

ALIASES
  $ mdos ns list
  $ mdos list ns
  $ mdos list namespace
  $ mdos list namespaces
  $ mdos client list
  $ mdos list client
  $ mdos ns show
  $ mdos show ns
  $ mdos show namespace
  $ mdos namespace show
  $ mdos namespaces show
  $ mdos client show
  $ mdos show client
```

## `mdos oidc create`

Configure / add a new OIDC provider to the platform

```
USAGE
  $ mdos oidc create [-t <value>]

FLAGS
  -t, --target=<value>  OIDC target

DESCRIPTION
  Configure / add a new OIDC provider to the platform

ALIASES
  $ mdos oidc create
  $ mdos oidc provider create
  $ mdos sso create
  $ mdos sso provider create
  $ mdos sso provider add
```

## `mdos oidc delete`

Delete a deployed OIDC provider from the platform

```
USAGE
  $ mdos oidc delete [-n <value>] [-f]

FLAGS
  -f, --force         Do not ask for comfirmation
  -n, --name=<value>  OIDC provider name

DESCRIPTION
  Delete a deployed OIDC provider from the platform

ALIASES
  $ mdos oidc delete
  $ mdos oidc provider delete
  $ mdos sso delete
  $ mdos sso provider delete
  $ mdos sso provider remove
```

## `mdos oidc list`

List the deployed OIDC providers for the platform

```
USAGE
  $ mdos oidc list

DESCRIPTION
  List the deployed OIDC providers for the platform

ALIASES
  $ mdos oidc list
  $ mdos oidc providers list
  $ mdos sso list
  $ mdos sso provider list
  $ mdos sso provider show
  $ mdos sso providers list
  $ mdos sso providers show
```

## `mdos oidc provider add`

Configure / add a new OIDC provider to the platform

```
USAGE
  $ mdos oidc provider add [-t <value>]

FLAGS
  -t, --target=<value>  OIDC target

DESCRIPTION
  Configure / add a new OIDC provider to the platform

ALIASES
  $ mdos oidc create
  $ mdos oidc provider create
  $ mdos sso create
  $ mdos sso provider create
  $ mdos sso provider add
```

## `mdos oidc provider create`

Configure / add a new OIDC provider to the platform

```
USAGE
  $ mdos oidc provider create [-t <value>]

FLAGS
  -t, --target=<value>  OIDC target

DESCRIPTION
  Configure / add a new OIDC provider to the platform

ALIASES
  $ mdos oidc create
  $ mdos oidc provider create
  $ mdos sso create
  $ mdos sso provider create
  $ mdos sso provider add
```

## `mdos oidc provider delete`

Delete a deployed OIDC provider from the platform

```
USAGE
  $ mdos oidc provider delete [-n <value>] [-f]

FLAGS
  -f, --force         Do not ask for comfirmation
  -n, --name=<value>  OIDC provider name

DESCRIPTION
  Delete a deployed OIDC provider from the platform

ALIASES
  $ mdos oidc delete
  $ mdos oidc provider delete
  $ mdos sso delete
  $ mdos sso provider delete
  $ mdos sso provider remove
```

## `mdos oidc provider list`

List the deployed OIDC providers for the platform

```
USAGE
  $ mdos oidc provider list

DESCRIPTION
  List the deployed OIDC providers for the platform

ALIASES
  $ mdos oidc list
  $ mdos oidc providers list
  $ mdos sso list
  $ mdos sso provider list
  $ mdos sso provider show
  $ mdos sso providers list
  $ mdos sso providers show
```

## `mdos oidc provider remove`

Delete a deployed OIDC provider from the platform

```
USAGE
  $ mdos oidc provider remove [-n <value>] [-f]

FLAGS
  -f, --force         Do not ask for comfirmation
  -n, --name=<value>  OIDC provider name

DESCRIPTION
  Delete a deployed OIDC provider from the platform

ALIASES
  $ mdos oidc delete
  $ mdos oidc provider delete
  $ mdos sso delete
  $ mdos sso provider delete
  $ mdos sso provider remove
```

## `mdos oidc providers list`

List the deployed OIDC providers for the platform

```
USAGE
  $ mdos oidc providers list

DESCRIPTION
  List the deployed OIDC providers for the platform

ALIASES
  $ mdos oidc list
  $ mdos oidc providers list
  $ mdos sso list
  $ mdos sso provider list
  $ mdos sso provider show
  $ mdos sso providers list
  $ mdos sso providers show
```

## `mdos port add`

Expose ports for your application components so that other applications can communicate with your components

```
USAGE
  $ mdos port add

DESCRIPTION
  Expose ports for your application components so that other applications can communicate with your components

ALIASES
  $ mdos add service
  $ mdos service add
  $ mdos add port
  $ mdos port add
  $ mdos service generate
  $ mdos generate port
  $ mdos port generate
```

## `mdos port generate`

Expose ports for your application components so that other applications can communicate with your components

```
USAGE
  $ mdos port generate

DESCRIPTION
  Expose ports for your application components so that other applications can communicate with your components

ALIASES
  $ mdos add service
  $ mdos service add
  $ mdos add port
  $ mdos port add
  $ mdos service generate
  $ mdos generate port
  $ mdos port generate
```

## `mdos protect app`

Protect an ingress hostname

```
USAGE
  $ mdos protect app

DESCRIPTION
  Protect an ingress hostname

ALIASES
  $ mdos app sso
  $ mdos app protect
  $ mdos sso app
  $ mdos protect app
  $ mdos protect application
```

## `mdos protect application`

Protect an ingress hostname

```
USAGE
  $ mdos protect application

DESCRIPTION
  Protect an ingress hostname

ALIASES
  $ mdos app sso
  $ mdos app protect
  $ mdos sso app
  $ mdos protect app
  $ mdos protect application
```

## `mdos remove client`

Delete a namespace / client / tenant

```
USAGE
  $ mdos remove client [-n <value>] [-f]

FLAGS
  -f, --force              Do not ask for comfirmation
  -n, --namespace=<value>  Namespace to remove

DESCRIPTION
  Delete a namespace / client / tenant

ALIASES
  $ mdos ns delete
  $ mdos delete ns
  $ mdos delete namespace
  $ mdos client delete
  $ mdos delete client
  $ mdos ns remove
  $ mdos remove ns
  $ mdos remove namespace
  $ mdos namespaces remove
  $ mdos client remove
  $ mdos remove client
```

## `mdos remove namespace`

Delete a namespace / client / tenant

```
USAGE
  $ mdos remove namespace [-n <value>] [-f]

FLAGS
  -f, --force              Do not ask for comfirmation
  -n, --namespace=<value>  Namespace to remove

DESCRIPTION
  Delete a namespace / client / tenant

ALIASES
  $ mdos ns delete
  $ mdos delete ns
  $ mdos delete namespace
  $ mdos client delete
  $ mdos delete client
  $ mdos ns remove
  $ mdos remove ns
  $ mdos remove namespace
  $ mdos namespaces remove
  $ mdos client remove
  $ mdos remove client
```

## `mdos remove ns`

Delete a namespace / client / tenant

```
USAGE
  $ mdos remove ns [-n <value>] [-f]

FLAGS
  -f, --force              Do not ask for comfirmation
  -n, --namespace=<value>  Namespace to remove

DESCRIPTION
  Delete a namespace / client / tenant

ALIASES
  $ mdos ns delete
  $ mdos delete ns
  $ mdos delete namespace
  $ mdos client delete
  $ mdos delete client
  $ mdos ns remove
  $ mdos remove ns
  $ mdos remove namespace
  $ mdos namespaces remove
  $ mdos client remove
  $ mdos remove client
```

## `mdos secret add`

Add a secrets to you components for sensitive environement variables and secret config files

```
USAGE
  $ mdos secret add

DESCRIPTION
  Add a secrets to you components for sensitive environement variables and secret config files

ALIASES
  $ mdos add secret
  $ mdos secret add
  $ mdos secret generate
```

## `mdos secret create`

Create a secret

```
USAGE
  $ mdos secret create

DESCRIPTION
  Create a secret
```

## `mdos secret generate`

Add a secrets to you components for sensitive environement variables and secret config files

```
USAGE
  $ mdos secret generate

DESCRIPTION
  Add a secrets to you components for sensitive environement variables and secret config files

ALIASES
  $ mdos add secret
  $ mdos secret add
  $ mdos secret generate
```

## `mdos service add`

Expose ports for your application components so that other applications can communicate with your components

```
USAGE
  $ mdos service add

DESCRIPTION
  Expose ports for your application components so that other applications can communicate with your components

ALIASES
  $ mdos add service
  $ mdos service add
  $ mdos add port
  $ mdos port add
  $ mdos service generate
  $ mdos generate port
  $ mdos port generate
```

## `mdos service generate`

Expose ports for your application components so that other applications can communicate with your components

```
USAGE
  $ mdos service generate

DESCRIPTION
  Expose ports for your application components so that other applications can communicate with your components

ALIASES
  $ mdos add service
  $ mdos service add
  $ mdos add port
  $ mdos port add
  $ mdos service generate
  $ mdos generate port
  $ mdos port generate
```

## `mdos set-kubeconfig`

Retrieve user kubeconfig file and set up

```
USAGE
  $ mdos set-kubeconfig

DESCRIPTION
  Retrieve user kubeconfig file and set up
```

_See code: [dist/commands/set-kubeconfig.ts](https://github.com/mdos-cli/hello-world/blob/v2.0.2/dist/commands/set-kubeconfig.ts)_

## `mdos shared-volume create`

Create a new shared volume

```
USAGE
  $ mdos shared-volume create

DESCRIPTION
  Create a new shared volume

ALIASES
  $ mdos volume create
```

## `mdos shared-volume delete`

Delete an existing Shared Volume

```
USAGE
  $ mdos shared-volume delete

DESCRIPTION
  Delete an existing Shared Volume

ALIASES
  $ mdos volume remove
```

## `mdos shared-volume list`

List existing Shared Volumes

```
USAGE
  $ mdos shared-volume list

DESCRIPTION
  List existing Shared Volumes

ALIASES
  $ mdos volume list
```

## `mdos show client`

List namespaces / clients / tenants

```
USAGE
  $ mdos show client

DESCRIPTION
  List namespaces / clients / tenants

ALIASES
  $ mdos ns list
  $ mdos list ns
  $ mdos list namespace
  $ mdos list namespaces
  $ mdos client list
  $ mdos list client
  $ mdos ns show
  $ mdos show ns
  $ mdos show namespace
  $ mdos namespace show
  $ mdos namespaces show
  $ mdos client show
  $ mdos show client
```

## `mdos show namespace`

List namespaces / clients / tenants

```
USAGE
  $ mdos show namespace

DESCRIPTION
  List namespaces / clients / tenants

ALIASES
  $ mdos ns list
  $ mdos list ns
  $ mdos list namespace
  $ mdos list namespaces
  $ mdos client list
  $ mdos list client
  $ mdos ns show
  $ mdos show ns
  $ mdos show namespace
  $ mdos namespace show
  $ mdos namespaces show
  $ mdos client show
  $ mdos show client
```

## `mdos show ns`

List namespaces / clients / tenants

```
USAGE
  $ mdos show ns

DESCRIPTION
  List namespaces / clients / tenants

ALIASES
  $ mdos ns list
  $ mdos list ns
  $ mdos list namespace
  $ mdos list namespaces
  $ mdos client list
  $ mdos list client
  $ mdos ns show
  $ mdos show ns
  $ mdos show namespace
  $ mdos namespace show
  $ mdos namespaces show
  $ mdos client show
  $ mdos show client
```

## `mdos sso app`

Protect an ingress hostname

```
USAGE
  $ mdos sso app

DESCRIPTION
  Protect an ingress hostname

ALIASES
  $ mdos app sso
  $ mdos app protect
  $ mdos sso app
  $ mdos protect app
  $ mdos protect application
```

## `mdos sso create`

Configure / add a new OIDC provider to the platform

```
USAGE
  $ mdos sso create [-t <value>]

FLAGS
  -t, --target=<value>  OIDC target

DESCRIPTION
  Configure / add a new OIDC provider to the platform

ALIASES
  $ mdos oidc create
  $ mdos oidc provider create
  $ mdos sso create
  $ mdos sso provider create
  $ mdos sso provider add
```

## `mdos sso delete`

Delete a deployed OIDC provider from the platform

```
USAGE
  $ mdos sso delete [-n <value>] [-f]

FLAGS
  -f, --force         Do not ask for comfirmation
  -n, --name=<value>  OIDC provider name

DESCRIPTION
  Delete a deployed OIDC provider from the platform

ALIASES
  $ mdos oidc delete
  $ mdos oidc provider delete
  $ mdos sso delete
  $ mdos sso provider delete
  $ mdos sso provider remove
```

## `mdos sso list`

List the deployed OIDC providers for the platform

```
USAGE
  $ mdos sso list

DESCRIPTION
  List the deployed OIDC providers for the platform

ALIASES
  $ mdos oidc list
  $ mdos oidc providers list
  $ mdos sso list
  $ mdos sso provider list
  $ mdos sso provider show
  $ mdos sso providers list
  $ mdos sso providers show
```

## `mdos sso provider add`

Configure / add a new OIDC provider to the platform

```
USAGE
  $ mdos sso provider add [-t <value>]

FLAGS
  -t, --target=<value>  OIDC target

DESCRIPTION
  Configure / add a new OIDC provider to the platform

ALIASES
  $ mdos oidc create
  $ mdos oidc provider create
  $ mdos sso create
  $ mdos sso provider create
  $ mdos sso provider add
```

## `mdos sso provider create`

Configure / add a new OIDC provider to the platform

```
USAGE
  $ mdos sso provider create [-t <value>]

FLAGS
  -t, --target=<value>  OIDC target

DESCRIPTION
  Configure / add a new OIDC provider to the platform

ALIASES
  $ mdos oidc create
  $ mdos oidc provider create
  $ mdos sso create
  $ mdos sso provider create
  $ mdos sso provider add
```

## `mdos sso provider delete`

Delete a deployed OIDC provider from the platform

```
USAGE
  $ mdos sso provider delete [-n <value>] [-f]

FLAGS
  -f, --force         Do not ask for comfirmation
  -n, --name=<value>  OIDC provider name

DESCRIPTION
  Delete a deployed OIDC provider from the platform

ALIASES
  $ mdos oidc delete
  $ mdos oidc provider delete
  $ mdos sso delete
  $ mdos sso provider delete
  $ mdos sso provider remove
```

## `mdos sso provider list`

List the deployed OIDC providers for the platform

```
USAGE
  $ mdos sso provider list

DESCRIPTION
  List the deployed OIDC providers for the platform

ALIASES
  $ mdos oidc list
  $ mdos oidc providers list
  $ mdos sso list
  $ mdos sso provider list
  $ mdos sso provider show
  $ mdos sso providers list
  $ mdos sso providers show
```

## `mdos sso provider remove`

Delete a deployed OIDC provider from the platform

```
USAGE
  $ mdos sso provider remove [-n <value>] [-f]

FLAGS
  -f, --force         Do not ask for comfirmation
  -n, --name=<value>  OIDC provider name

DESCRIPTION
  Delete a deployed OIDC provider from the platform

ALIASES
  $ mdos oidc delete
  $ mdos oidc provider delete
  $ mdos sso delete
  $ mdos sso provider delete
  $ mdos sso provider remove
```

## `mdos sso provider show`

List the deployed OIDC providers for the platform

```
USAGE
  $ mdos sso provider show

DESCRIPTION
  List the deployed OIDC providers for the platform

ALIASES
  $ mdos oidc list
  $ mdos oidc providers list
  $ mdos sso list
  $ mdos sso provider list
  $ mdos sso provider show
  $ mdos sso providers list
  $ mdos sso providers show
```

## `mdos sso providers list`

List the deployed OIDC providers for the platform

```
USAGE
  $ mdos sso providers list

DESCRIPTION
  List the deployed OIDC providers for the platform

ALIASES
  $ mdos oidc list
  $ mdos oidc providers list
  $ mdos sso list
  $ mdos sso provider list
  $ mdos sso provider show
  $ mdos sso providers list
  $ mdos sso providers show
```

## `mdos sso providers show`

List the deployed OIDC providers for the platform

```
USAGE
  $ mdos sso providers show

DESCRIPTION
  List the deployed OIDC providers for the platform

ALIASES
  $ mdos oidc list
  $ mdos oidc providers list
  $ mdos sso list
  $ mdos sso provider list
  $ mdos sso provider show
  $ mdos sso providers list
  $ mdos sso providers show
```

## `mdos status`

Get current status of your CLI environment

```
USAGE
  $ mdos status

DESCRIPTION
  Get current status of your CLI environment
```

_See code: [dist/commands/status.ts](https://github.com/mdos-cli/hello-world/blob/v2.0.2/dist/commands/status.ts)_

## `mdos storage add`

Persist your data using volumes / storage for your components

```
USAGE
  $ mdos storage add [--hostpath <value>] [--mountpath <value>] [--inject <value>] [--name <value>]

FLAGS
  --hostpath=<value>   If set, the volume will be mounted as a host-path volume on this specified host path
  --inject=<value>     If set, the volume will be pre-populated with some files that you specify
  --mountpath=<value>  The mount path inside your container for this volume
  --name=<value>       Name for this volume

DESCRIPTION
  Persist your data using volumes / storage for your components

ALIASES
  $ mdos add volume
  $ mdos volume add
  $ mdos add storage
  $ mdos storage add
  $ mdos volume generate
  $ mdos generate storage
  $ mdos storage generate
```

## `mdos storage generate`

Persist your data using volumes / storage for your components

```
USAGE
  $ mdos storage generate [--hostpath <value>] [--mountpath <value>] [--inject <value>] [--name <value>]

FLAGS
  --hostpath=<value>   If set, the volume will be mounted as a host-path volume on this specified host path
  --inject=<value>     If set, the volume will be pre-populated with some files that you specify
  --mountpath=<value>  The mount path inside your container for this volume
  --name=<value>       Name for this volume

DESCRIPTION
  Persist your data using volumes / storage for your components

ALIASES
  $ mdos add volume
  $ mdos volume add
  $ mdos add storage
  $ mdos storage add
  $ mdos volume generate
  $ mdos generate storage
  $ mdos storage generate
```

## `mdos user add`

Create a new user on the platform

```
USAGE
  $ mdos user add [-u <value>] [-p <value>] [-e <value>]

FLAGS
  -e, --email=<value>     Keycloak user email
  -p, --password=<value>  Keycloak password
  -u, --username=<value>  Keycloak username

DESCRIPTION
  Create a new user on the platform

ALIASES
  $ mdos user create
  $ mdos user add
  $ mdos kc user add
```

## `mdos user add role`

Add roles to your users for specific namespaces / clients / tenant

```
USAGE
  $ mdos user add role [-t <value>] [-u <value>] [-c <value>] [-r <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId of the user
  -r, --role=<value>      Keycloak role name to add to this user
  -t, --target=<value>    Keycloak client target
  -u, --username=<value>  Keycloak username to add role for

DESCRIPTION
  Add roles to your users for specific namespaces / clients / tenant

ALIASES
  $ mdos user add role
  $ mdos kc user add role
  $ mdos user create-role
  $ mdos user create role
  $ mdos kc user create role
```

## `mdos user change-password`

Change Password for a logged in user

```
USAGE
  $ mdos user change-password

DESCRIPTION
  Change Password for a logged in user
```

## `mdos user create`

Create a new user on the platform

```
USAGE
  $ mdos user create [-u <value>] [-p <value>] [-e <value>]

FLAGS
  -e, --email=<value>     Keycloak user email
  -p, --password=<value>  Keycloak password
  -u, --username=<value>  Keycloak username

DESCRIPTION
  Create a new user on the platform

ALIASES
  $ mdos user create
  $ mdos user add
  $ mdos kc user add
```

## `mdos user create-role`

Add roles to your users for specific namespaces / clients / tenant

```
USAGE
  $ mdos user create-role [-t <value>] [-u <value>] [-c <value>] [-r <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId of the user
  -r, --role=<value>      Keycloak role name to add to this user
  -t, --target=<value>    Keycloak client target
  -u, --username=<value>  Keycloak username to add role for

DESCRIPTION
  Add roles to your users for specific namespaces / clients / tenant

ALIASES
  $ mdos user add role
  $ mdos kc user add role
  $ mdos user create-role
  $ mdos user create role
  $ mdos kc user create role
```

## `mdos user create role`

Add roles to your users for specific namespaces / clients / tenant

```
USAGE
  $ mdos user create role [-t <value>] [-u <value>] [-c <value>] [-r <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId of the user
  -r, --role=<value>      Keycloak role name to add to this user
  -t, --target=<value>    Keycloak client target
  -u, --username=<value>  Keycloak username to add role for

DESCRIPTION
  Add roles to your users for specific namespaces / clients / tenant

ALIASES
  $ mdos user add role
  $ mdos kc user add role
  $ mdos user create-role
  $ mdos user create role
  $ mdos kc user create role
```

## `mdos user delete`

Delete a user from the platform

```
USAGE
  $ mdos user delete [-u <value>] [-f]

FLAGS
  -f, --force             Do not ask for comfirmation
  -u, --username=<value>  Keycloak username to delete

DESCRIPTION
  Delete a user from the platform

ALIASES
  $ mdos user delete
  $ mdos user remove
  $ mdos kc user remove
```

## `mdos user delete-role`

Remove roles from your users for specific namespaces / clients / tenant

```
USAGE
  $ mdos user delete-role [-u <value>] [-c <value>] [-r <value>] [-f]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -f, --force             Do not ask for comfirmation
  -r, --role=<value>      Role name to remove
  -u, --username=<value>  Keycloak username

DESCRIPTION
  Remove roles from your users for specific namespaces / clients / tenant

ALIASES
  $ mdos user remove role
  $ mdos kc user remove role
  $ mdos user delete-role
  $ mdos user delete role
  $ mdos kc user delete role
```

## `mdos user delete role`

Remove roles from your users for specific namespaces / clients / tenant

```
USAGE
  $ mdos user delete role [-u <value>] [-c <value>] [-r <value>] [-f]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -f, --force             Do not ask for comfirmation
  -r, --role=<value>      Role name to remove
  -u, --username=<value>  Keycloak username

DESCRIPTION
  Remove roles from your users for specific namespaces / clients / tenant

ALIASES
  $ mdos user remove role
  $ mdos kc user remove role
  $ mdos user delete-role
  $ mdos user delete role
  $ mdos kc user delete role
```

## `mdos user list`

List all platform users

```
USAGE
  $ mdos user list [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak client ID

DESCRIPTION
  List all platform users

ALIASES
  $ mdos user list
```

## `mdos user list-roles`

List user assigned roles for specific namespaces / clients / tenant

```
USAGE
  $ mdos user list-roles [-u <value>]

FLAGS
  -u, --username=<value>  Keycloak username to get roles for

DESCRIPTION
  List user assigned roles for specific namespaces / clients / tenant

ALIASES
  $ mdos user list-roles
  $ mdos user list roles
  $ mdos user show-roles
  $ mdos user show roles
  $ mdos kc user list roles
  $ mdos kc user show-roles
  $ mdos kc user show roles
```

## `mdos user list roles`

List user assigned roles for specific namespaces / clients / tenant

```
USAGE
  $ mdos user list roles [-u <value>]

FLAGS
  -u, --username=<value>  Keycloak username to get roles for

DESCRIPTION
  List user assigned roles for specific namespaces / clients / tenant

ALIASES
  $ mdos user list-roles
  $ mdos user list roles
  $ mdos user show-roles
  $ mdos user show roles
  $ mdos kc user list roles
  $ mdos kc user show-roles
  $ mdos kc user show roles
```

## `mdos user remove`

Delete a user from the platform

```
USAGE
  $ mdos user remove [-u <value>] [-f]

FLAGS
  -f, --force             Do not ask for comfirmation
  -u, --username=<value>  Keycloak username to delete

DESCRIPTION
  Delete a user from the platform

ALIASES
  $ mdos user delete
  $ mdos user remove
  $ mdos kc user remove
```

## `mdos user remove role`

Remove roles from your users for specific namespaces / clients / tenant

```
USAGE
  $ mdos user remove role [-u <value>] [-c <value>] [-r <value>] [-f]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -f, --force             Do not ask for comfirmation
  -r, --role=<value>      Role name to remove
  -u, --username=<value>  Keycloak username

DESCRIPTION
  Remove roles from your users for specific namespaces / clients / tenant

ALIASES
  $ mdos user remove role
  $ mdos kc user remove role
  $ mdos user delete-role
  $ mdos user delete role
  $ mdos kc user delete role
```

## `mdos user show-roles`

List user assigned roles for specific namespaces / clients / tenant

```
USAGE
  $ mdos user show-roles [-u <value>]

FLAGS
  -u, --username=<value>  Keycloak username to get roles for

DESCRIPTION
  List user assigned roles for specific namespaces / clients / tenant

ALIASES
  $ mdos user list-roles
  $ mdos user list roles
  $ mdos user show-roles
  $ mdos user show roles
  $ mdos kc user list roles
  $ mdos kc user show-roles
  $ mdos kc user show roles
```

## `mdos user show roles`

List user assigned roles for specific namespaces / clients / tenant

```
USAGE
  $ mdos user show roles [-u <value>]

FLAGS
  -u, --username=<value>  Keycloak username to get roles for

DESCRIPTION
  List user assigned roles for specific namespaces / clients / tenant

ALIASES
  $ mdos user list-roles
  $ mdos user list roles
  $ mdos user show-roles
  $ mdos user show roles
  $ mdos kc user list roles
  $ mdos kc user show-roles
  $ mdos kc user show roles
```

## `mdos volume add`

Persist your data using volumes / storage for your components

```
USAGE
  $ mdos volume add [--hostpath <value>] [--mountpath <value>] [--inject <value>] [--name <value>]

FLAGS
  --hostpath=<value>   If set, the volume will be mounted as a host-path volume on this specified host path
  --inject=<value>     If set, the volume will be pre-populated with some files that you specify
  --mountpath=<value>  The mount path inside your container for this volume
  --name=<value>       Name for this volume

DESCRIPTION
  Persist your data using volumes / storage for your components

ALIASES
  $ mdos add volume
  $ mdos volume add
  $ mdos add storage
  $ mdos storage add
  $ mdos volume generate
  $ mdos generate storage
  $ mdos storage generate
```

## `mdos volume create`

Create a new shared volume

```
USAGE
  $ mdos volume create

DESCRIPTION
  Create a new shared volume

ALIASES
  $ mdos volume create
```

## `mdos volume generate`

Persist your data using volumes / storage for your components

```
USAGE
  $ mdos volume generate [--hostpath <value>] [--mountpath <value>] [--inject <value>] [--name <value>]

FLAGS
  --hostpath=<value>   If set, the volume will be mounted as a host-path volume on this specified host path
  --inject=<value>     If set, the volume will be pre-populated with some files that you specify
  --mountpath=<value>  The mount path inside your container for this volume
  --name=<value>       Name for this volume

DESCRIPTION
  Persist your data using volumes / storage for your components

ALIASES
  $ mdos add volume
  $ mdos volume add
  $ mdos add storage
  $ mdos storage add
  $ mdos volume generate
  $ mdos generate storage
  $ mdos storage generate
```

## `mdos volume list`

List existing Shared Volumes

```
USAGE
  $ mdos volume list

DESCRIPTION
  List existing Shared Volumes

ALIASES
  $ mdos volume list
```

## `mdos volume remove`

Delete an existing Shared Volume

```
USAGE
  $ mdos volume remove

DESCRIPTION
  Delete an existing Shared Volume

ALIASES
  $ mdos volume remove
```
<!-- commandsstop -->  # Usage

  <!-- usage -->

  # Commands

  <!-- commands -->
