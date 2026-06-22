FROM mysql:8

COPY docker-entrypoint-certs.sh /usr/local/bin/docker-entrypoint-certs.sh
RUN chmod +x /usr/local/bin/docker-entrypoint-certs.sh

ENTRYPOINT ["docker-entrypoint-certs.sh"]
CMD ["mysqld"]
