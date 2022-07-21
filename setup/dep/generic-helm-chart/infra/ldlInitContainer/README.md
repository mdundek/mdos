# Init Container for the generic helm chart

This folder contains the Dockerfile and it's dependencies to build an image that contains all the tools and scripts necessary to instantiate the `initContainer` section of the generic helm chart.

## Build and push the image

There is a script available to do this automatically:

```sh
./build-image.sh --reg-host <REGISTRY HOST> --docker-repo mdos/mdos-ldl-data-sync:<IMG TAG> --reg-creds-b64 <BASE64 REG CREDENTIALS>
```

<!-- ./build-image.sh --reg-host r-bf74-mdos-docker-local.artifactory.2b82.aws.cloud.airbus.corp --docker-repo mdos/mdos-ldl-data-sync:0.2.2 --reg-creds-b64 ZHVuZGVrLCBtaWNoYWVsOkFLQ3A4aHlqM1phYmNEZnN2MXNUVUpmVEptQjVjNUtNV2hLU0xQNUg4Vk0zMmpFR3Vva0dwZUtMNlhpNzdKcGM0cnRuVDF0ejU= -->

> The `<IMG TAG>` must be the same that the generic helm chart version (Charts.yaml => version)

## Use image to copy data to PV

When deploying an app component that is part of a application using the generic helm chart, and that app component defines volumes that have the `ldlSync` flag equald `true`, then this image will be used to execute the script `dataSync.sh`. We need this because the helm chart will create a new PV & PVC for the target app pod that is always empty the first time it is run on a specific node. Yet, the bundle ZIP requested some files to be used in that new mount, which we need to copy over before the actual application starts.  

### Usage

The script `dataSync.sh` expects 3 environement variables to be set:

```sh
SYNC_SOURCE_DIR => list of host source dir paths separated by a ";"
SYNC_TARGET_DIR => list of pod target dir paths separated by a ";"
SYNC_TYPE => list of sync type (full or partial) separated by a ";"
```

## Use image to wait for appComponents to be ready

When an app component has an `ldlSync` flag equald `true` and has a `networkIsolation` set to `limited` (all app components of the application can communicate with each other), then all other app components will use an initContainer that will wait for this app component to be `Ready` before they start the actual app component.

### Usage

The script `waitForDeployment.sh` expects 1 environement variable to be set:

```sh
APP_UUID_WAIT_LIST => list of all app components UUIDs that need to be ready before this app component can start, separated by a ";"
```