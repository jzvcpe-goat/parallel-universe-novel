FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json /app/
COPY app/package.json /app/app/package.json
COPY packages/agent-runtime/package.json /app/packages/agent-runtime/package.json
RUN npm install --include=optional

COPY packages/agent-runtime /app/packages/agent-runtime
RUN npm --workspace @narrativeos/agent-runtime run build

ENV MASTRA_HOST=0.0.0.0
ENV MASTRA_PORT=4111

EXPOSE 4111

CMD ["npm", "--workspace", "@narrativeos/agent-runtime", "run", "start"]
