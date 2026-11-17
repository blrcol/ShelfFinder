# ShelfFinder as a container: a small, non-root nginx serving the static site.
#   docker build -t shelffinder .
#   docker run --rm -p 8080:8080 shelffinder      -> http://localhost:8080
# Stage 1 builds index.html from src/ (same as `python3 build.py`), so the image
# always matches the source. No secrets go in the image: the catalog key lives
# only in the Google Apps Script proxy.

FROM python:3.12-alpine AS build
WORKDIR /app
COPY build.py ./
COPY src ./src
RUN python3 build.py

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/index.html /usr/share/nginx/html/index.html
COPY sw.js manifest.webmanifest /usr/share/nginx/html/
COPY icons /usr/share/nginx/html/icons
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
