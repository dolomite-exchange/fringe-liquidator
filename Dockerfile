FROM node:14.17.0-alpine

RUN apk update &&  \
    apk upgrade && \
    apk -Uuv add --no-cache make g++ git python py-pip jq openssh curl openssh docker &&  \
    pip install --upgrade pip awscli

RUN adduser -S fringe
RUN mkdir -p /home/fringe/app
RUN chown fringe -R /home/fringe/app
USER fringe

WORKDIR /home/fringe/app

COPY ./.env* ./
COPY ./package.json ./yarn.lock ./
RUN yarn install --frozen-lockfile

COPY ./src ./src
COPY ./__tests__ ./__tests__
COPY ./tsconfig.json ./tsconfig.json
COPY ./environment.d.ts ./environment.d.ts

RUN npm run build

CMD ["npm", "start"]
