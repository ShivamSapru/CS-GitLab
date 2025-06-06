# Stage 1: Build the frontend app
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the built files with Nginx
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf # Copy custom Nginx config
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
