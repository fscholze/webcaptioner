########### build container
FROM node:24 AS frontendbuild
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json .
ADD src/ src/
ADD public/ public/
RUN npm run build
RUN mkdir -p build/config/ && touch build/config/runtime-config.js
# RUN ls -l

########### deployment container
# FROM nginx:stable-alpine
FROM nginxinc/nginx-unprivileged:stable-alpine

# don't add user to the container, the image takes care already
# RUN useradd -u 1000 -m reactapp

# make sure the router works (pages fall back to the index.html)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

COPY --chown=nginx:nginx --from=frontendbuild /app/build /usr/share/nginx/html

COPY --chown=nginx:nginx docker/docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080

# not necessary, the unpriv image does this itself
# USER 101

ENTRYPOINT ["/docker-entrypoint.sh"]
