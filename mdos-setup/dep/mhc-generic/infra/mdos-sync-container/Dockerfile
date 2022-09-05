FROM alpine:3.15
RUN apk add --no-cache --upgrade bash curl jq wget
COPY ./dataSync.sh /usr/src/ops/dataSync.sh
COPY ./waitForDeployment.sh /usr/src/ops/waitForDeployment.sh
RUN wget https://dl.min.io/client/mc/release/linux-amd64/mc
RUN chmod +x mc
RUN mv mc /usr/src/ops
ENTRYPOINT ["/usr/src/ops/dataSync.sh"]