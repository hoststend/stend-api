# syntax=docker/dockerfile:1

# Use official node image as the base image
ARG NODE_VERSION=20.18.0
FROM node:${NODE_VERSION}-alpine

# Use production node environment
ENV NODE_ENV production

# Prepare app directory
WORKDIR /usr/src/app
COPY . .

# Install dependencies if not found, which shouldn't happen
RUN if [ ! -d "node_modules" ]; then npm install --omit=dev --no-audit --no-package-lock-only --no-update-notifier --no-fund; fi

# Expose the port that the application listens on
EXPOSE 3000

# Run the application
CMD npm start