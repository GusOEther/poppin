FROM andreysenov/firebase-tools:latest

USER root

# Install python3-pip
RUN apt-get update && apt-get install -y python3-pip curl procps

# Set working directory
WORKDIR /app

# Copy requirement files for pre-installation
COPY app/package.json ./app/
COPY functions/requirements.txt ./functions/

# Install dependencies
RUN cd app && npm install --legacy-peer-deps
RUN pip3 install --break-system-packages -r functions/requirements.txt pytest

# Default command
CMD ["bash"]
