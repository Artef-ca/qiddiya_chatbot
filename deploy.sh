#!/bin/bash

# Set default values (can be overridden by command-line arguments)
PROJECT_ID=${1:-"prj-udp-sandbox"}
LOCATION=${2:-"me-central2"}
REPO=${3:-"qbrain-webapp"}
IMAGE_NAME=${4:-"qbrain-frontend"}
TAG=${5:-"latest"}

# Construct the full image path
IMAGE_URI="$LOCATION-docker.pkg.dev/$PROJECT_ID/$REPO/$IMAGE_NAME:$TAG"

echo "Building Docker image for Q-Brain Frontend..."
docker build --no-cache -t $IMAGE_URI -f Dockerfile .

echo "Authenticating with Google Cloud..."
gcloud auth login
gcloud config set project $PROJECT_ID
gcloud auth configure-docker $LOCATION-docker.pkg.dev

echo "Pushing Docker image to Artifact Registry..."
docker push $IMAGE_URI

echo "Deploying Frontend Job to Cloud Run..."
gcloud run deploy $IMAGE_NAME \
    --image=$IMAGE_URI \
    --region=$LOCATION \
    --project=$PROJECT_ID \
    --platform=managed \
    --ingress=internal \
    --memory=4Gi \
    --cpu=2 \
    --port=3000
    

echo "Deployment for Q-Brain Frontend Complete."
