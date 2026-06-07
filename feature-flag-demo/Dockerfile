FROM node:20-alpine
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install proxy dependencies
COPY proxy/package*.json ./proxy/
RUN cd proxy && npm ci --omit=dev

# Copy proxy source and public static files
COPY proxy/ ./proxy/
COPY public/ ./public/

RUN rm -f proxy/.env proxy/.env.*

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 10000
ENV PORT=10000

# server.js uses path.join(__dirname, '../public') which resolves to /app/public ✅
CMD ["node", "proxy/server.js"]
