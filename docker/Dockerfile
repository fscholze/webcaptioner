########### build container
FROM node:24 AS frontendbuild
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json .
ADD src/ src/
ADD public/ public/
RUN npm run build
# RUN ls -l

########### deployment container
FROM nginx:stable-alpine

# RUN useradd -u 1000 -m reactapp

# make sure the router works (pages fall back to the index.html)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=frontendbuild /app/build /usr/share/nginx/html

COPY docker/docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

# USER 101

ENTRYPOINT ["/docker-entrypoint.sh"]
