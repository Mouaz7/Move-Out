# Use official Node.js LTS image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy app source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port (Google Cloud Run uses PORT env variable)
EXPOSE 8080

# Set production environment
ENV NODE_ENV=production

# Start the app
CMD ["npm", "start"]
