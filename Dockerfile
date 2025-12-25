# Stage 1: Build the Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definition first for caching
COPY package.json package-lock.json* ./

# Update npm to latest version
RUN npm install -g npm@latest

# Install dependencies
RUN npm install

# Copy all source code
COPY . .

# Build Arguments
ARG API_KEY
ENV VITE_API_KEY=$API_KEY

# Build
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
