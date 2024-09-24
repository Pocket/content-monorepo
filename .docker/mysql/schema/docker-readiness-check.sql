# Table used for docker compose healthcheck
#
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
# THIS FILE MUST RUN LAST!
# If there are any other .sql files in this directory, they will be executed in alphanumeric order.
# THIS MEANS! You may need to rename this file. BE WARNED.
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
#
# https://chrisguitarguy.com/2023/03/06/waiting-for-mysql-to-be-ready-in-docker-compose/

CREATE DATABASE IF NOT EXISTS `finished_startup`;
