FROM alpine:3.15
RUN apk add --no-cache --upgrade bash curl jq
COPY ./dataSync.sh /usr/src/ops/dataSync.sh
COPY ./waitForDeployment.sh /usr/src/ops/waitForDeployment.sh
ENTRYPOINT ["/usr/src/ops/dataSync.sh"]