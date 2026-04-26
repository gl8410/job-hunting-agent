FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Use Nginx to serve the static files
FROM nginx:alpine

# Copy built assets from the builder stage
COPY --from=build /app/dist /usr/share/nginx/html

# Provide a custom Nginx configuration if routing requires it
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose the frontend port instead of the default 80
EXPOSE 7803

# Override default Nginx port to 7803
RUN sed -i 's/listen  *80;/listen 7803;/g' /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
