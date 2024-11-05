# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.18.0

FROM node:${NODE_VERSION}-alpine

# Use production node environment by default.
ENV NODE_ENV production

WORKDIR /usr/src/app

# Copy the rest of the source files into the image.
COPY . .

# Install dependencies if not found.
RUN if [ ! -d "node_modules" ]; then npm install --omit=dev --no-audit --no-package-lock-only --no-update-notifier --no-fund; fi

# Expose the port that the application listens on.
EXPOSE 3000

# Run the application.
CMD npm start
