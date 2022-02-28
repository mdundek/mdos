# SCDS generic Helm chart

![SCDS Logo Header](img/pacman.png)

## About
This repo holds the needed kubernetes manifests and all the helm configuration files to deploy SCDS applications.

## DevOps

This repo contains:

- a `HELM` chart along with it's `publish` script
- a automated `version bump` script

### Bump up the version number for this chart

```sh
cd infra
./version_bump.sh \
    --type bug \
    --artifactory-user "<ARTIFACTORY_USERNAME>" \
    --artifactory-password "<ARTIFACTORY_PASSWORD>"
```

The `--type` parameter is used to specify what version level we want to bump up:

| --type <value> | Old version | New version |
|----------------|-------------|-------------|
| bug            | 2.5.7       | 2.5.8       |
| feature        | 2.5.7       | 2.6.0       |
| major          | 2.5.7       | 3.0.0       |

This script will update the version references for the following file:

- `infra/Chart.yaml` (chart version and latest dependency versions)

> NOTE: The script is NOT meant to be executed automatically in a pipeline, but rather manually when it is decided that a new version increment is necessary. The script will commit the version update to GIT automatically. The Jenkins pipelines will publish the helm chart accordingly using the new version number commited to GIT.

### Publish the scds-generic-stateless-helm HELM chart

You won't need to publish updates to the HELM chart from your local machine, this will be handled automatically from the Jenkins build pipeline.
The script used for that matter is located under `infra/publish.sh`. It automaticaly extract the current application version and uses it to publish this chart:

```sh
cd infra
./publish.sh \
    --artifactory-password "<ARTIFACTORY_PASSWORD>"
```

## Variables 
| Name | Type | Allowed values | Default value | Description |
|------|------|----------------|---------------|-------------|
| enabled | boolean | true/false | true | [SCDS dev value] If true, the App will be deployed |
| developement | boolean | true/false | false | [SCDS dev value] If true, services will be exposed as NodePorts |
| registry | string | N/A | foobar | The registry host to get the docker images from |
| isScdsApp | boolean | true/false | true | If true, the app to be deployed is an SCDS app |
| scdsAcbmAppUUID | string | N/A | N/A | The UUID of the application |
| scdsAcbmUUID | string | N/A | N/A | The UUID of the bundle manifest |
| scdsBundleName | string | N/A | N/A | The name of the bundle manifest (namespace) |
| scdsCompanyUUID | string | N/A | N/A | The UUID of the company |
| appName | string | N/A | app1 | The name of the application |
| initContainer<br/>&nbsp;&nbsp;&nbsp;&nbsp;image | string | N/A | scds/scds-ldl-data-sync | The docker image to use for initContainers |
| &nbsp;&nbsp;&nbsp;&nbsp;imageTag | string | X.Y.Z | 0.1.3 | Tthe docker image tag to use for initContainers |
| appComponents[] | table | N/A | {} | The table of application components to deploy |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;name | string | N/A | myAppComponent1 | The name of the application component |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;scdsAcbmAppCompUUID | string | N/A | N/A | The UUID of the application component |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;replicaCount | int | N/A | 1 | The number of replicas for the application component |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;networkIsolation | string | open/limited/private | private | The network isolation of the application component. Open = Every applications from the same namespace can join. Limited = Only applications which UUID is set in the *allowedAppComponents* list can join. Private : No application can join. |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;allowedAppComponents | list | N/A | [] | The list of allowed application components to join current component |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;image<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;repository | string | N/A | sqlite | The name of the docker image for the application component |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;image<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;pullPolicy | string | Always/IfNotPresent/Never | IfNotPresent | The image pull policy. Always = Always pull the image on deploy. IfNotPresent = Only pull the image if not locally present. Never = Never pull the image, it should always be present locally. |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;image<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tag | string | N/A | "9.87.2-devtest" | The tag of the docker image for the application component |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;imagePullSecrets | table | - name: NameOfTheSecret | [] | The table of image pull secrets |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;isDaemonSet | boolean | true/false | false | If true, app will be deployed as a daemonset (1 pod per node) |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;overwriteCommand | boolean | true/false | false | If true, allows to change the startup command of the pod |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;command | list | ['Command', 'To', 'Execute'] | [] | The new command to execute |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;serviceAccount<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;create | boolean | true/false | false | If true, a service account will be created |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;serviceAccount<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;name | string | N/A | default | The name of the serviceAccount to create |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;serviceAccount<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;annotations | list | [key: value] | [] | The kubernetes annotations for the serviceAccount to create |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;podAnnotations | list | [key: value] | {} | The kubernetes annotations for the serviceAccount to create |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;podSecurityContext | dict | N/A | [] | The kubernetes pod security context for the application |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;securityContext | dict | N/A | [] | The kubernetes security context for the application |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;service<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;create | boolean | true/false | false | If true, a service will be created |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;service<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;type | string | ClusterIP/NodePort/LoadBalancer | ClusterIP | The name of the serviceAccount to create |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;service<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;port | int | 1-65536 | 80 | The port to bind the Service on |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;service<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;containerPort | int | 1-65536 | 80 | The port of the application to redirect the Service to |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;service<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;livenessProbePath | string | N/A | / | The URL for the liveness probe |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;service<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;readinessProbePath | string | N/A | / | The URL for the readiness probe |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;virtualService<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;enabled | boolean | true/false | false | If true, a virtualservice will be created that will expose the application |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;virtualService<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;matchPrefix | string | ClusterIP/NodePort/LoadBalancer | ClusterIP | The name of the serviceAccount to create |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;virtualService<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;hosts | list(string) | URL | - chart-example.com | The list of hostnames to bind the virtualservice on |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;virtualService<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tls | dict | N/A | [] | The TLS Kubernetes configuration of the virtual service |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;config<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;enabled | boolean | true/false | false | If true, a configMap will be created |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;config<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data | list(dict[type, key, value, mountPath]) | N/A | {} | The list of configuration data to store in the configmap. These data will be set on the application. |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;config<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;type | string | env/file | N/A | The type of data to store : ENV var or file |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;config<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;key | string | N/A | N/A | The name of the ENV var or the file |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;config<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;value | string | N/A | N/A | The value of the ENV var, or the content of the file |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;config<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;mountPath | string | N/A | N/A | Only used when type=file. The path where to mount the file |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;secret<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;enabled | boolean | true/false | false | If true, a secret will be created |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;secret<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data | list(dict[type, key, value, mountPath]) | N/A | {} | The list of configuration data to store in the Secret. These data will be set on the application. |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;secret<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;type | string | env/file | N/A | The type of data to store : ENV var or file |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;secret<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;key | string | N/A | N/A | The name of the ENV var or the file |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;secret<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;value | string | N/A | N/A | The value of the ENV var, or the content of the file |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;secret<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;mountPath | string | N/A | N/A | Only used when type=file. The path where to mount the file |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;persistence<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;enabled | boolean | true/false | false | If true, one or more PersistentVolumeClaims will be created depending on the number of wanted volumes |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;persistence<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;volumes | list(dict[name, size, mountPath, ldlSync, sourcePath, type]) | N/A | {} | The list of volumes to create and mount in the application |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;persistence<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;volumes<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;name | string | env/file | N/A | The name of the volume |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;persistence<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;volumes<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;size | string | XGi/XMi | 1Gi | The size of the volume |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;persistence<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;volumes<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;mountPath | string | N/A | N/A | The path where to mount the volume |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;persistence<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;volumes<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ldlSync | boolean | true/false | false | If true, an initContainer will be set to start before the application to synchronize the specified data in the volume |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;persistence<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;volumes<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;sourcePath | string | N/A | N/A | Only used when ldlSync=true. The path from where to collect the data to be synced on the volume |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;persistence<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;volumes<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;type | string | full/partial | full | Only used when ldlSync=true. The type of sync to do with LDL component |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;waitForComponents | list(string) | ExistingApplicationComponent | {} | The list of application components to wait for before start the current application |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;resources | dict | N/A | {} | The list of resources required by the application |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;resources<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;limits<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;cpu | string | Xm/X | 100m | The CPU usage limitation of the application |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;resources<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;limits<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;memory | string | XGi/XMi | 1Gi | The RAM usage limitation of the application |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;resources<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;requests<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;cpu | string | Xm/X | 100m | The CPU usage request of the application (reserved on deployment) |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;resources<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;requests<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;memory | string | XGi/XMi | 1Gi | The RAM usage request of the application (reserved on deployment) |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;autoscaling | dict | N/A | {} | The list of autoscaling parameters for the application |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;autoscaling<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;enabled | boolean | true/false | false | If true, enables application autoscaling |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;autoscaling<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;minReplicas | int | 1-? | 1 | The minimum amount of pods of the application |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;autoscaling<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;maxReplicas | int | 1-? | 100 | The maximum amount of pods of the application |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;autoscaling<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;targetCPUUtilizationPercentage | int | 1-100 | 80 | The percentage of the CPU Limitation usage before triggering a new replica |
| appComponent<br/>&nbsp;&nbsp;&nbsp;&nbsp;autoscaling<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;targetMemoryUtilizationPercentage | int | 1-100 | 80 | The percentage of the RAM Limitation usage before triggering a new replica |
| nodeSelector | dict | N/A | {} | (NOT USED) The node selector kubernetes section of application deployments |
| tolerations | list | N/A | [] | (NOT USED) The kubernetes tolerations for application deployments |
| affinity | dict | N/A | {} | (NOT USED) The kubernetes affinity for application deployments |