FROM node:alpine as builder

WORKDIR /workspace

COPY . .

RUN yarn install

FROM node:alpine
WORKDIR /workspace
COPY --from=builder /workspace /workspace
EXPOSE 8080
#ENTRYPOINT ["yarn sample"]
CMD ["yarn", "sample"]

