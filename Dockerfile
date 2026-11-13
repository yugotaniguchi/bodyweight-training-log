FROM oven/bun:1
WORKDIR /app
COPY package.json ./
COPY server.ts ./
COPY src ./src
COPY public ./public
RUN mkdir -p data
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "run", "server.ts"]
