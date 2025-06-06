# Stage 1: Build the static frontend application using Node.js and Vite
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the static files using Nginx
# Vite's default output is 'dist'
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html 
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
