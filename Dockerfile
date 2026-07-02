# Use Node.js 22
FROM node:22-slim

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY lib ./lib
COPY artifacts ./artifacts
COPY scripts ./scripts
COPY tsconfig.base.json tsconfig.json ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build the project
RUN pnpm run build

# Expose port
EXPOSE 3000

# Start the server
CMD ["pnpm", "start"]
