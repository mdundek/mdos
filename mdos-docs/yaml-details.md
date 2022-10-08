# mdos.yaml configuration

## Anatomy of an application

Applications are to be seen as a higher level concept, an application in `mdos` is composed of one or more application components. Application components are your actual project asset placeholders (source code), where one component could be an API backend server for instance, and a second component would hold your front end application and so on.  
Every application component can have one or more volumes attached to it for storage persistance & data mirroring. 

<img src="img/anatomy.png" alt="anatomy" width="400"/>

This architecture allows you to compose complex applications to suit your needs.

A MDos application project layout is composed of one or more folders, each one representing an application component.  
At the root of the application folder is a `mdos.yaml` file that holds all runtime configuration parameters for the application and it's components:

```title="Project structure"
my-application/
├── backend
│   └── Dockerfile
│   └── <your application code files>...
├── frontend
│   └── Dockerfile
│   └── <your application code files>...
├── volumes
│   └── static-website
│       └── index.html
│       └── ...
└── mdos.yaml
```

In this example we have an application named `my-application`, that is composed of two distinct application components: `backend` & `frontend`.  
Each component has it's own Dockerfile.  
At the `application` level, there is also a `volumes` folder where you can store application component volume files to be used within your application, and a `mdos.yaml` config file that holds all runtime configuration parameters. As an example, here the `volumes` folder has a subfolder called `static-website` that is used by the `frontend` application so serve it's website data.

> **Note**
> Volumes are managed on the `application` level rather than on the `component` level in case you wish to share volumes amongst components.

---

## Manifest file: mdos.yaml

Each application is configured in a YAML file at the root of the application folder. This is the equivalent of your lower level Kubernetes yaml files, but all concatenated into a single, higher level configuration file that greatly abstracts away the complexity of Kubernetes deployment.  

We will now have a closer look at what you can configure in your application `mdos.yaml` file.

## Application

Each `mdos.yaml` file starts with global configuration parameters specific to this application:

```yaml
schemaVersion: v1
tenantName: my-team
appName: my-application
uuid: XA74S-FXCDI
components: [...]
```

The `tenant-name` field maps directly to a kubernetes target `namespace`.  
The `uuid` field is a unique identifier for this application, all dependant resources that this application will create and manage will be tied to this application `uuid`. 

| :hash: CLI command:  `mdos generate application` |
| --- |

---

## Application components

Each application component will translate to a specific deployment on the cluster. Just like an application, a `component` hase some base values that need to be set:

```yaml
...
components:
  - name: comp-1
    image: my-comp-1-img-name
    tag: 1.0.0
    uuid: E5PLU-TQMBD
    ...
  - name: comp-2
    image: my-comp-2-img-name
    tag: 1.0.0
    uuid: HUJKG-GDGHN
    ...
```

Among those, you will define your component `name`, `image` name and image `tag` to use.

| :hash: CLI command:  `mdos generate component` |
| --- |

---

### Registries

Registries are where your MDos will push and pull your application images from. Multiple choices are available here.

#### Use the MDos registry

MDos comes with a private integrated Docker registry. If no `registry` parameter is set on your component `yaml` block, then this private internal registry will be used to push / pull the images from. No extra configuration parameters are required if this is the registry you want to use.

#### Use a custom registry

If you have your own private registry that you would like to use for your application images, you can do so by specifying a `registry` value on your component, along with an __optionnal__ `imagePullSecrets` value that should be used to authenticate with your registry:

```yaml
...
components:
  - name: comp-1
    ...
    registry: my.private.registry
    imagePullSecrets: # Optionnal
      - name: my-registry-secret
    ...
```

> **Note**
> Since you are using your own private registry, it will be up to you to provision your private registry `Secret` on the target namespace.

#### Use a public registry

The third option is to use a public registry, again with an __optionnal__ `imagePullSecrets` value that should be used to authenticate with the public registry:

```yaml
components:
  - name: comp-1
    ...
    publicRegistry: true
    imagePullSecrets: # Optionnal
      - name: my-registry-secret
    ...
```

---

### Overwrite container default command on start

If you wish to overwrite the `command` used by a container on startup, you can so so like this:

```yaml
...
components:
  - name: comp-1
    ...
    command:
      - "sh"
      - "-c"
      - "mycommand"
    workingDir: /from/this/dir # optional
    ...
```

or along with command aguments:

```yaml
...
components:
  - name: comp-1
    ...
    command: ["printenv"]
    commandArgs: ["HOSTNAME", "KUBERNETES_PORT"]
    workingDir: /from/this/dir # optional
    ...
```

---

### NetworkPolicy

On a multi-tenant cluster environement, it is important that you protect your components from being accessed from other application components. There are 4 available configuration settings available for you to use:

| **Scope** | **Description**                                                                |
|-----------|--------------------------------------------------------------------------------|
| private   | No one can talk to this component                                              |
| limited   | Only components belonging to this application can talk to this component       |
| open      | All application components in this tenant namespace can talk to this component |
| custom    | You can specify which components in what namespaces can talk to this component |

This is how you configure this on your component:

```yaml
...
components:
  - name: comp-1
    ...
    networkPolicy: 
      scope: private # limited | open | custom
    ...
```

The `custom` scope let's you specify specifically what application components from what namespaces are allowed to communicate with this component.  

Here is a more complex example that uses a `custom` scoped NetworkPolicy (please note the addition of the `allow` array value in this case):  

<img src="img/networkPolicies/custom.png" alt="custom" width="800"/>

---

### Volumes

#### Pre-populate volume data

#### HostPath mounts

#### Using Secrets

#### Using ConfigMaps

#### From existing ConfigMap or Secret

---

### Environement Variables

#### Using ConfigMaps

#### Using Secrets

#### From existing ConfigMap or Secret

---

### Networking

#### Exposing ports using services

#### Configure Ingress

---

### OAuth2 OIDC

#### Configure a OIDC provider

#### Protect your ingress with a OIDC provider

---

### Set pod resources

---

### Execute pre-deployment scripts