# frontend/Dockerfile

# Stage 1: Build the React application
FROM node:18-alpine as build-stage

WORKDIR /app

# Copy package.json and package-lock.json and install dependencies
COPY ./frontend/package*.json ./
RUN npm install

# Copy the rest of the frontend code
COPY ./frontend .

# Build the React app
RUN npm run build

# Stage 2: Serve the React application with Nginx
FROM nginx:alpine as production-stage

# Copy the built React app from the build-stage to Nginx static directory
COPY --from=build-stage /app/build /usr/share/nginx/html

# Copy a custom Nginx configuration
COPY ./frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

