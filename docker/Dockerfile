FROM node:20.11.1-bookworm
MAINTAINER Daniel Sobe <daniel.sobe@sorben.com>

# docker build -t webcaptioner-ng .
# docker build -t webcaptioner-ng . --no-cache

RUN mkdir -p /application/public
RUN mkdir -p /application/src

COPY public /application/public
COPY src    /application/src
COPY package.json package-lock.json tsconfig.json /application/

RUN cd application && npm install

COPY docker/startme.sh /

CMD ["/bin/bash", "-c", "/startme.sh"] 
