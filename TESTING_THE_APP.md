# Testing the app

### Test Locally
```bash
npx expo start --web
# For HTTPS (reuiqred for camera access):
npx expo start --web --https
```

### Deploy Changes

To update your app:
```bash
# Build for Production
npx expo export --platform web

# Push changes into S3
aws s3 sync ./dist s3://altrulab-groceries-scanner --delete

# List CloudFront distributions to get the distribution ID
aws cloudfront list-distributions --query "DistributionList.Items[*].[Id,Comment]" --output table

# IMPORTANT: Clear CloudFront cache to ensure users get latest version
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"

# Check invalidation status
aws cloudfront list-invalidations --distribution-id YOUR_DISTRIBUTION_ID --query "InvalidationList.Items[0].[Id,Status]" --output table

# 
aws cloudfront create-invalidation --distribution-id E3FLV5S8R1WNAO --paths "/*"
```