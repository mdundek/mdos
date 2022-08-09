# oclif-hello-world

oclif example Hello World CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![License](https://img.shields.io/npm/l/oclif-hello-world.svg)](https://github.com/oclif/hello-world/blob/main/package.json)

<!-- toc -->

-   [Usage](#usage)
-   [Commands](#commands)
<!-- tocstop -->

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

-   [`mdos hello PERSON`](#mdos-hello-person)
-   [`mdos hello world`](#mdos-hello-world)
-   [`mdos help [COMMAND]`](#mdos-help-command)
-   [`mdos plugins`](#mdos-plugins)
-   [`mdos plugins:install PLUGIN...`](#mdos-pluginsinstall-plugin)
-   [`mdos plugins:inspect PLUGIN...`](#mdos-pluginsinspect-plugin)
-   [`mdos plugins:install PLUGIN...`](#mdos-pluginsinstall-plugin-1)
-   [`mdos plugins:link PLUGIN`](#mdos-pluginslink-plugin)
-   [`mdos plugins:uninstall PLUGIN...`](#mdos-pluginsuninstall-plugin)
-   [`mdos plugins:uninstall PLUGIN...`](#mdos-pluginsuninstall-plugin-1)
-   [`mdos plugins:uninstall PLUGIN...`](#mdos-pluginsuninstall-plugin-2)
-   [`mdos plugins update`](#mdos-plugins-update)

## `mdos hello PERSON`

Say hello

```
USAGE
  $ mdos hello [PERSON] -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Whom is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ oex hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [dist/commands/hello/index.ts](https://github.com/mdos-cli/hello-world/blob/v0.0.0/dist/commands/hello/index.ts)_

## `mdos hello world`

Say hello world

```
USAGE
  $ mdos hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ oex hello world
  hello world! (./src/commands/hello/world.ts)
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

## `mdos plugins`

List installed plugins.

```
USAGE
  $ mdos plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ mdos plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.0.11/src/commands/plugins/index.ts)_

## `mdos plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ mdos plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.

  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ mdos plugins add

EXAMPLES
  $ mdos plugins:install myplugin

  $ mdos plugins:install https://github.com/someuser/someplugin

  $ mdos plugins:install someuser/someplugin
```

## `mdos plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ mdos plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ mdos plugins:inspect myplugin
```

## `mdos plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ mdos plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.

  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ mdos plugins add

EXAMPLES
  $ mdos plugins:install myplugin

  $ mdos plugins:install https://github.com/someuser/someplugin

  $ mdos plugins:install someuser/someplugin
```

## `mdos plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ mdos plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.

EXAMPLES
  $ mdos plugins:link myplugin
```

## `mdos plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ mdos plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ mdos plugins unlink
  $ mdos plugins remove
```

## `mdos plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ mdos plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ mdos plugins unlink
  $ mdos plugins remove
```

## `mdos plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ mdos plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ mdos plugins unlink
  $ mdos plugins remove
```

## `mdos plugins update`

Update installed plugins.

```
USAGE
  $ mdos plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

<!-- commandsstop -->
