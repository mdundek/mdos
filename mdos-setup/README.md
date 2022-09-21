# MDos Setup

> **Note**
> The installation of the MDos platform and the CLI is described in the official repo documentation and is not part of this documentation file.
> Please refer to the official documentation for more details

## Create new release of the platform

To create a new release, use the script:

```
infra/create-release.sh
```

The script takes one **optional** parameter: `--gen-cli-bin`.  
This parameter will also generate the MDos CLI binary files for Linux, Mac and Windows, and publish them as release files as part of the release.

> This script will merge the current `main` branch with the `release` branch, bump up the project versions, tag the commit with the new version label and create the release along with the (optional) CLI binary files. 

## Optional installation of code-server

For those who would like to also install a web based developement environement (code-server) deployed on the MDos platform, protected by OAuth2 OIDC authentication, simply execute the script:

```
infra/install-codeserver.sh --oidc-keycloak
```

> Script has not been tested for a while, prosceed with caution