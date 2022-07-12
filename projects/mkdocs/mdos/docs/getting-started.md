# Getting started

## Anatomy of a mdos application

### Applications & application components

![CLI](img/anatomy.png)

### Project layout

```sh
my-application/
├── backend
│   └── Dockerfile
├── frontend
│   └── Dockerfile
└── values.yaml
```

In this example we have an application named `my-application`, that is composed of two distinct application components: `backend` & `frontend`.  
Each component has it's own Dockerfile.  
At the `application` level, there is also a `values.yaml` config file that holds all runtime configuration parameters for the application:

```yaml
mdosAcbmAppUUID: 8c259ee5-d70f-409b-8eea-3f410e385d0f
mdosBundleName: my-ns
appName: my-app    
appComponents:

  - name: backend
    mdosAcbmAppCompUUID: 552be6bf-4a8d-4003-aeb2-9999a535c299
    replicaCount: 1
    # Your image name and tag
    image:
      repository: backend
      tag: latest
    # Overwrite the default command for your docker image
    overwriteCommand: false
    command: []
    commandArgs: []
    # Services
    service:
      create: true
      type: ClusterIP
      portMappings:
        - port: 80
          containerPort: 80
    # Configure ingress for your application component
    virtualService:
      - gateway: http-gateway
        hosts:
          - backend.mdundek.network
        protocol: http
        httpMatch:
          prefix: /
          port: "80"
        svcPort: "80"
    # - gateway: http-gateway | https-gateway | <other>
    #   hosts:
    #     - chart-example.com
    #   protocol: https # http / https / tls / tcp
    #   tlsMatchHosts: # only for tls/https route
    #     - host: chart-example.com
    #       port: 443
    #       svcPort: 8443
    #   httpMatch: # only for http route
    #     prefix: /
    #     port: 80
    #   tcpMatchPorts: # only for tcp
    #     - 27017
    #   svcPort: 80
    #   tls: []
    
    # Configuration parameters
    config:
      enabled: false
      data: {}
      # data:
      #   - type: file # will be mounted as a file inside the pod
      #     key: test.config
      #     value: "Content of test.config file"
      #     mountPath: "/etc/myApp/config/"
      #   - type: env # will be mounted as an ENV var inside the pod
      #     key: TEST_ENV
      #     value: "Value of ENV variable TEST_ENV"
    # Secret configuration parameters
    secrets:
      enabled: false
      data: {}
      # data:
      #   - type: file
      #     key: test.secret
      #     value: "Content of test.secret file"
      #     mountPath: "/etc/myApp/config/"
      #   - type: env
      #     key: SECRET_ENV
      #     value: "Value of ENV variable SECRET_ENV"
    # Persist data to a persistent volume
    persistence:
      enabled: false
      # volumes:
      #   - name: data-volume
      #     size: 1Gi
      #     mountPath: /tmp
      #     ldlSync: false
      #     sourcePath: /mdos/content-volumes/app1 # path from where data should be collected (ONLY used with ldlSync=true)
      #     type: full # full / partial depending on the type of file copy (ONLY used with ldlSync=true)
      # hostpathVolumes: 
      #   - name: host-data-volume
      #     mountPath: /tmp
      #     hostPath: /mdos/content-volumes/app1
      #     type: Directory
    resources: {}
    # limits:
    #   cpu: 100m
    #   memory: 128Mi
    # requests:
    #   cpu: 100m
    #   memory: 128Mi

  - name: frontend
    mdosAcbmAppCompUUID: 5515dedf-9c1e-4afb-9f20-5238bfbd5256
    replicaCount: 1
    # Your image name and tag
    image:
      repository: frontend
      tag: latest
    # Overwrite the default command for your docker image
    overwriteCommand: false
    command: []
    commandArgs: []
    # Services
    service:
      create: true
      type: ClusterIP
      portMappings:
        - port: 80
          containerPort: 80
    # Configure ingress for your application component
    virtualService:
      - gateway: http-gateway
        hosts:
          - frontend.mdundek.network
        protocol: http
        httpMatch:
          prefix: /
          port: "80"
        svcPort: "80"
    # - gateway: http-gateway | https-gateway | <other>
    #   hosts:
    #     - chart-example.com
    #   protocol: https # http / https / tls / tcp
    #   tlsMatchHosts: # only for tls/https route
    #     - host: chart-example.com
    #       port: 443
    #       svcPort: 8443
    #   httpMatch: # only for http route
    #     prefix: /
    #     port: 80
    #   tcpMatchPorts: # only for tcp
    #     - 27017
    #   svcPort: 80
    #   tls: []
    
    # Configuration parameters
    config:
      enabled: false
      data: {}
      # data:
      #   - type: file # will be mounted as a file inside the pod
      #     key: test.config
      #     value: "Content of test.config file"
      #     mountPath: "/etc/myApp/config/"
      #   - type: env # will be mounted as an ENV var inside the pod
      #     key: TEST_ENV
      #     value: "Value of ENV variable TEST_ENV"
    # Secret configuration parameters
    secrets:
      enabled: false
      data: {}
      # data:
      #   - type: file
      #     key: test.secret
      #     value: "Content of test.secret file"
      #     mountPath: "/etc/myApp/config/"
      #   - type: env
      #     key: SECRET_ENV
      #     value: "Value of ENV variable SECRET_ENV"
    # Persist data to a persistent volume
    persistence:
      enabled: false
      # volumes:
      #   - name: data-volume
      #     size: 1Gi
      #     mountPath: /tmp
      #     ldlSync: false
      #     sourcePath: /mdos/content-volumes/app1 # path from where data should be collected (ONLY used with ldlSync=true)
      #     type: full # full / partial depending on the type of file copy (ONLY used with ldlSync=true)
      # hostpathVolumes: 
      #   - name: host-data-volume
      #     mountPath: /tmp
      #     hostPath: /mdos/content-volumes/app1
      #     type: Directory
    resources: {}
    # limits:
    #   cpu: 100m
    #   memory: 128Mi
    # requests:
    #   cpu: 100m
    #   memory: 128Mi
```

## Build applications for the platform

### Create a new application

### Create a new application component

## Deploy application on the platform

### Build your application

### Deploy your application
