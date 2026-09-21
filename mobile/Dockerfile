FROM node:22-bookworm-slim AS build
WORKDIR /app
ARG EXPO_PUBLIC_API_URL=/api/v1
ARG EXPO_PUBLIC_DEFAULT_COUNTRY_CODE=91
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
ENV EXPO_PUBLIC_DEFAULT_COUNTRY_CODE=${EXPO_PUBLIC_DEFAULT_COUNTRY_CODE}
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:web

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
