FROM node:20-alpine
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN rm -f .env .env.*

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 10000
ENV PORT=10000

CMD ["node", "server.js"]
