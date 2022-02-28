#!/bin/bash

sudo su

apt-get update -y && apt-get upgrade -yes

ufw allow ssh
ufw allow http
ufw allow https

ufw enable

