# oclif-hello-world

aws --endpoint-url https://minio.mdundek.network s3 ls

  # Usage

  <!-- usage -->
```sh-session
$ npm install -g mdos-cli
$ mdos COMMAND
running command...
$ mdos (--version)
mdos-cli/0.0.0 linux-x64 node-v16.16.0
$ mdos --help [COMMAND]
USAGE
  $ mdos COMMAND
...
```
<!-- usagestop -->

  # Commands

  <!-- commands -->
* [`mdos component add-config`](#mdos-component-add-config)
* [`mdos component add-ingress`](#mdos-component-add-ingress)
* [`mdos component add-secret`](#mdos-component-add-secret)
* [`mdos component add-service`](#mdos-component-add-service)
* [`mdos component add-volume`](#mdos-component-add-volume)
* [`mdos deploy`](#mdos-deploy)
* [`mdos generate application`](#mdos-generate-application)
* [`mdos generate component`](#mdos-generate-component)
* [`mdos get-config`](#mdos-get-config)
* [`mdos help [COMMAND]`](#mdos-help-command)
* [`mdos kc client create-role`](#mdos-kc-client-create-role)
* [`mdos kc client delete-role`](#mdos-kc-client-delete-role)
* [`mdos kc client list-roles`](#mdos-kc-client-list-roles)
* [`mdos kc user add-role`](#mdos-kc-user-add-role)
* [`mdos kc user create`](#mdos-kc-user-create)
* [`mdos kc user delete`](#mdos-kc-user-delete)
* [`mdos kc user list`](#mdos-kc-user-list)
* [`mdos kc user list-roles`](#mdos-kc-user-list-roles)
* [`mdos kc user remove-role`](#mdos-kc-user-remove-role)
* [`mdos namespace create`](#mdos-namespace-create)
* [`mdos namespace delete`](#mdos-namespace-delete)
* [`mdos namespace list`](#mdos-namespace-list)
* [`mdos oidc protect-app`](#mdos-oidc-protect-app)
* [`mdos oidc provider add`](#mdos-oidc-provider-add)
* [`mdos oidc provider list`](#mdos-oidc-provider-list)
* [`mdos oidc provider remove`](#mdos-oidc-provider-remove)
* [`mdos push [FILE]`](#mdos-push-file)
* [`mdos set-config`](#mdos-set-config)

## `mdos component add-config`

describe the command here

```
USAGE
  $ mdos component add-config

DESCRIPTION
  describe the command here
```

## `mdos component add-ingress`

describe the command here

```
USAGE
  $ mdos component add-ingress [-h <value>] [-s <value>] [-p <value>] [-t <value>]

FLAGS
  -h, --hostname=<value>  Ingress hostname
  -p, --port=<value>      Target port
  -s, --subpath=<value>   Ingress subpath match
  -t, --type=<value>      Traffic type (http, https, tcp/udp)

DESCRIPTION
  describe the command here
```

## `mdos component add-secret`

describe the command here

```
USAGE
  $ mdos component add-secret

DESCRIPTION
  describe the command here
```

## `mdos component add-service`

describe the command here

```
USAGE
  $ mdos component add-service

DESCRIPTION
  describe the command here
```

## `mdos component add-volume`

add a volume to your deployed component

```
USAGE
  $ mdos component add-volume [--hostpath <value>] [--mountpath <value>] [--inject <value>] [--name <value>]

FLAGS
  --hostpath=<value>   If set, the volume will be mounted as a host-path volume on this specified host path
  --inject=<value>     If set, the volume will be pre-populated with some files that you specify
  --mountpath=<value>  The mount path inside your container for this volume
  --name=<value>       Name for this volume

DESCRIPTION
  add a volume to your deployed component
```

## `mdos deploy`

describe the command here

```
USAGE
  $ mdos deploy

DESCRIPTION
  describe the command here
```

_See code: [dist/commands/deploy.ts](https://github.com/mdos-cli/hello-world/blob/v0.0.0/dist/commands/deploy.ts)_

## `mdos generate application`

describe the command here

```
USAGE
  $ mdos generate application [-t <value>] [-n <value>]

FLAGS
  -n, --applicationName=<value>  An application name
  -t, --tenantName=<value>       A tenant name that this application belongs to

DESCRIPTION
  describe the command here
```

## `mdos generate component`

describe the command here

```
USAGE
  $ mdos generate component [-n <value>]

FLAGS
  -n, --name=<value>  An application component name

DESCRIPTION
  describe the command here
```

## `mdos get-config`

Get a specific config on your local CLI environement

```
USAGE
  $ mdos get-config [--auth] [--backend]

FLAGS
  --auth     authentication mode
  --backend  API backend URI

DESCRIPTION
  Get a specific config on your local CLI environement
```

_See code: [dist/commands/get-config.ts](https://github.com/mdos-cli/hello-world/blob/v0.0.0/dist/commands/get-config.ts)_

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

## `mdos kc client create-role`

describe the command here

```
USAGE
  $ mdos kc client create-role [-c <value>] [-n <value>]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -n, --name=<value>      Keycloak clientrole name

DESCRIPTION
  describe the command here
```

## `mdos kc client delete-role`

describe the command here

```
USAGE
  $ mdos kc client delete-role [-c <value>] [-r <value>] [-f]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -f, --force             Do not ask for comfirmation
  -r, --role=<value>      Client role to delete

DESCRIPTION
  describe the command here
```

## `mdos kc client list-roles`

describe the command here

```
USAGE
  $ mdos kc client list-roles [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak aclient ID

DESCRIPTION
  describe the command here
```

## `mdos kc user add-role`

describe the command here

```
USAGE
  $ mdos kc user add-role [-u <value>] [-c <value>] [-r <value>]

FLAGS
  -c, --clientId=<value>  Keycloak clientId of the user
  -r, --role=<value>      Keycloak role name to add to this user
  -u, --username=<value>  Keycloak username to add role for

DESCRIPTION
  describe the command here
```

## `mdos kc user create`

describe the command here

```
USAGE
  $ mdos kc user create [-u <value>] [-p <value>] [-e <value>]

FLAGS
  -e, --email=<value>     Keycloak user email
  -p, --password=<value>  Keycloak password
  -u, --username=<value>  Keycloak username

DESCRIPTION
  describe the command here
```

## `mdos kc user delete`

describe the command here

```
USAGE
  $ mdos kc user delete [-u <value>] [-f]

FLAGS
  -f, --force             Do not ask for comfirmation
  -u, --username=<value>  Keycloak username to delete

DESCRIPTION
  describe the command here
```

## `mdos kc user list`

describe the command here

```
USAGE
  $ mdos kc user list [-c <value>]

FLAGS
  -c, --clientId=<value>  Keycloak client ID

DESCRIPTION
  describe the command here
```

## `mdos kc user list-roles`

describe the command here

```
USAGE
  $ mdos kc user list-roles [-u <value>]

FLAGS
  -u, --username=<value>  Keycloak username to get roles for

DESCRIPTION
  describe the command here
```

## `mdos kc user remove-role`

describe the command here

```
USAGE
  $ mdos kc user remove-role [-u <value>] [-c <value>] [-r <value>] [-f]

FLAGS
  -c, --clientId=<value>  Keycloak client ID
  -f, --force             Do not ask for comfirmation
  -r, --role=<value>      Role name to remove
  -u, --username=<value>  Keycloak username

DESCRIPTION
  describe the command here
```

## `mdos namespace create`

describe the command here

```
USAGE
  $ mdos namespace create [-n <value>]

FLAGS
  -n, --namespace=<value>  Keycloak client ID

DESCRIPTION
  describe the command here
```

## `mdos namespace delete`

describe the command here

```
USAGE
  $ mdos namespace delete [-n <value>] [-f]

FLAGS
  -f, --force              Do not ask for comfirmation
  -n, --namespace=<value>  Namespace to remove

DESCRIPTION
  describe the command here
```

## `mdos namespace list`

describe the command here

```
USAGE
  $ mdos namespace list

DESCRIPTION
  describe the command here
```

## `mdos oidc protect-app`

describe the command here

```
USAGE
  $ mdos oidc protect-app

DESCRIPTION
  describe the command here
```

## `mdos oidc provider add`

describe the command here

```
USAGE
  $ mdos oidc provider add [-t <value>] [--clienId <value>]

FLAGS
  -t, --target=<value>  OIDC target
  --clienId=<value>     Keycloak client id name

DESCRIPTION
  describe the command here
```

## `mdos oidc provider list`

describe the command here

```
USAGE
  $ mdos oidc provider list

DESCRIPTION
  describe the command here
```

## `mdos oidc provider remove`

describe the command here

```
USAGE
  $ mdos oidc provider remove [-n <value>] [-f]

FLAGS
  -f, --force         Do not ask for comfirmation
  -n, --name=<value>  OIDC provider name

DESCRIPTION
  describe the command here
```

## `mdos push [FILE]`

describe the command here

```
USAGE
  $ mdos push [FILE] [-n <value>] [-f]

FLAGS
  -f, --force
  -n, --name=<value>  name to print

DESCRIPTION
  describe the command here

EXAMPLES
  $ mdos push
```

_See code: [dist/commands/push.ts](https://github.com/mdos-cli/hello-world/blob/v0.0.0/dist/commands/push.ts)_

## `mdos set-config`

Set a specific config on your local CLI environement

```
USAGE
  $ mdos set-config [--auth <value>] [--backend <value>]

FLAGS
  --auth=<value>     authentication mode, "none" or "oidc"
  --backend=<value>  API backend URI, "http(s)://mdos-api.<domain-name>"

DESCRIPTION
  Set a specific config on your local CLI environement
```

_See code: [dist/commands/set-config.ts](https://github.com/mdos-cli/hello-world/blob/v0.0.0/dist/commands/set-config.ts)_
<!-- commandsstop -->  # Usage

  <!-- usage -->

  # Commands

  <!-- commands -->
