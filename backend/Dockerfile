FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose the API port
EXPOSE 4000

# Start the server
CMD ["node", "index.mjs"]
