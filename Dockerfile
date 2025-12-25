# Stage 1: Build the Application
# Using Node 20 to satisfy @google/genai SDK requirements
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definition
COPY package.json package-lock.json* ./

# Update npm to latest version (optional, suppresses version warnings)
RUN npm install -g npm@latest

# Install dependencies (including devDependencies for build tools like tsc and vite)
RUN npm install

# Copy all source code
COPY . .

# Build Arguments
ARG API_KEY
ENV VITE_API_KEY=$API_KEY

# Build (Output goes to /app/dist based on vite.config.ts)
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
