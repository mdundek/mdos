FROM r-bf74-mdos-docker-local.artifactory.2b82.aws.cloud.airbus.corp/mdos/alpine:3.15
RUN apk add --no-cache --upgrade bash curl jq rsync
COPY ./dataSync.sh /usr/src/ops/dataSync.sh
COPY ./waitForDeployment.sh /usr/src/ops/waitForDeployment.sh
ENTRYPOINT ["/usr/src/ops/dataSync.sh"]