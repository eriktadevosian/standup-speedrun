#!/bin/sh
sed -i "s|__API_URL__|${API_URL:-http://localhost:8080}|g" /usr/share/nginx/html/assets/config.json
sed -i "s|__WS_URL__|${WS_URL:-ws://localhost:8080}|g" /usr/share/nginx/html/assets/config.json
exec nginx -g 'daemon off;'
