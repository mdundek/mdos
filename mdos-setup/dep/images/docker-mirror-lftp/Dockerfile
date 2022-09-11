FROM alpine:3.14
RUN apk add --no-cache lftp bash

COPY r-mirror.sh /usr/local/bin/r-mirror.sh
COPY mirror.sh /usr/local/bin/mirror.sh
RUN chmod +x /usr/local/bin/r-mirror.sh
RUN chmod +x /usr/local/bin/mirror.sh