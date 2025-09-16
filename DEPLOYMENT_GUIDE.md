# React Native to PWA Deployment Guide

Complete guide for deploying a React Native app as a Progressive Web App (PWA) using Expo Web and AWS services.

## Overview

This guide covers converting a React Native app to a PWA and deploying it to AWS with:
- **Frontend**: Expo Web (React Native → Web conversion)
- **Hosting**: Amazon S3 + CloudFront
- **Domain**: Route 53 custom domain
- **SSL**: AWS Certificate Manager (ACM)

## Prerequisites

- React Native app built with Expo
- AWS CLI configured
- Custom domain managed by Route 53
- Node.js and npm installed

## Step 1: Convert React Native to PWA

### Install Web Dependencies
```bash
npm install react-native-web react-dom --legacy-peer-deps
npx expo install @expo/metro-runtime
```

### Update app.json for PWA
Add PWA configuration to `app.json`:
```json
{
  "expo": {
    "web": {
      "favicon": "./assets/favicon.png",
      "name": "Groceries Scanner",
      "shortName": "Scanner",
      "lang": "en",
      "scope": "/groceries-scanner/",
      "startUrl": "/groceries-scanner/",
      "display": "standalone",
      "orientation": "portrait",
      "themeColor": "#2c3e50",
      "backgroundColor": "#ffffff"
    }
  }
}
```

### Fix Mobile Browser UI Issues
Create `web/index.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, user-scalable=no, viewport-fit=cover">
  <title>Groceries Scanner</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

Update tab navigator styles in `App.tsx`:
```tsx
tabBarStyle: {
  paddingBottom: 10,
  height: 70,
  backgroundColor: '#ffffff',
  borderTopWidth: 1,
  borderTopColor: '#e0e0e0',
}
```

### Test Locally
```bash
npx expo start --web
# For HTTPS (required for camera access):
npx expo start --web --https
```

### Build for Production
```bash
npx expo export --platform web
```

## Step 2: AWS S3 Setup

### Create S3 Bucket
```bash
aws s3 mb s3://altrulab-groceries-scanner --region us-east-1
```

### Configure Static Website Hosting
```bash
aws s3 website s3://altrulab-groceries-scanner --index-document index.html --error-document index.html
```

### Disable Block Public Access
```bash
aws s3api put-public-access-block --bucket altrulab-groceries-scanner --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

### Set Bucket Policy
Create `bucket-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::altrulab-groceries-scanner/*"
    }
  ]
}
```

Apply policy:
```bash
aws s3api put-bucket-policy --bucket altrulab-groceries-scanner --policy file://bucket-policy.json
```

### Upload Files
```bash
aws s3 sync ./dist s3://altrulab-groceries-scanner --delete
```

## Step 3: CloudFront Distribution

### Create Distribution
Create `cloudfront-config.json`:
```json
{
  "CallerReference": "groceries-scanner-2024",
  "Comment": "Groceries Scanner PWA",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-altrulab-groceries-scanner",
        "DomainName": "altrulab-groceries-scanner.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-altrulab-groceries-scanner",
    "ViewerProtocolPolicy": "redirect-to-https",
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0
  },
  "Enabled": true,
  "PriceClass": "PriceClass_100"
}
```

Create distribution:
```bash
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

Note the `DomainName` from the response (e.g., `dnfuz0wkdexk3.cloudfront.net`).

## Step 4: SSL Certificate (ACM)

### Request Certificate
```bash
aws acm request-certificate --domain-name groceries-scanner.altrulab.com --validation-method DNS --region us-east-1
```

Note the `CertificateArn` from the response.

### Get DNS Validation Record
```bash
aws acm describe-certificate --certificate-arn YOUR_CERTIFICATE_ARN --region us-east-1
```

### Add Validation Record to Route 53
Create `acm-validation-record.json` with the validation record details:
```json
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_validation_name.groceries-scanner.altrulab.com.",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "_validation_value.acm-validations.aws."
          }
        ]
      }
    }
  ]
}
```

Apply validation record:
```bash
aws route53 change-resource-record-sets --hosted-zone-id YOUR_HOSTED_ZONE_ID --change-batch file://acm-validation-record.json
```

### Wait for Certificate Validation
Check status (wait for "ISSUED"):
```bash
aws acm describe-certificate --certificate-arn YOUR_CERTIFICATE_ARN --region us-east-1 --query "Certificate.Status"
```

## Step 5: Route 53 DNS Configuration

### Get Hosted Zone ID
```bash
aws route53 list-hosted-zones --query "HostedZones[?Name=='altrulab.com.'].Id" --output text
```

### Create DNS Record
Create `route53-record.json`:
```json
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "groceries-scanner.altrulab.com",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "YOUR_CLOUDFRONT_DOMAIN",
          "EvaluateTargetHealth": false,
          "HostedZoneId": "Z2FDTNDATAQYW2"
        }
      }
    }
  ]
}
```

Apply DNS record:
```bash
aws route53 change-resource-record-sets --hosted-zone-id YOUR_HOSTED_ZONE_ID --change-batch file://route53-record.json
```

## Step 6: Update CloudFront with SSL Certificate

### Get Current Distribution Config
```bash
aws cloudfront get-distribution-config --id YOUR_DISTRIBUTION_ID --query "DistributionConfig" > cloudfront-ssl-update.json
```

### Modify Configuration
Edit `cloudfront-ssl-update.json` to add:

1. **Aliases section** (after "Comment"):
```json
"Aliases": {
  "Quantity": 1,
  "Items": ["groceries-scanner.altrulab.com"]
},
```

2. **ViewerCertificate section** (replace existing):
```json
"ViewerCertificate": {
  "ACMCertificateArn": "YOUR_CERTIFICATE_ARN",
  "SSLSupportMethod": "sni-only",
  "MinimumProtocolVersion": "TLSv1.2_2021"
}
```

### Update Distribution
```bash
aws cloudfront update-distribution --id YOUR_DISTRIBUTION_ID --distribution-config file://cloudfront-ssl-update.json --if-match $(aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID --query "ETag" --output text)
```

### Wait for Deployment
Check status (wait for "Deployed"):
```bash
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID --query "Distribution.Status"
```

## Step 7: Final Testing

Visit your PWA at: `https://groceries-scanner.altrulab.com`

Expected functionality:
- ✅ No SSL certificate warnings
- ✅ Camera access on mobile devices
- ✅ PWA installable ("Add to Home Screen")
- ✅ All app features working

## Future Updates

To update your app:
```bash
npx expo export --platform web
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

## Web Barcode Scanner (Optional)

For web browsers that don't support expo-camera barcode scanning:

### Install ZXing Library
```bash
npm install @zxing/library
```

### Create WebBarcodeScanner Component
Create `WebBarcodeScanner.tsx` with web-compatible barcode scanning using ZXing library.

### Update Camera Permissions for Web
In your scanner screen, handle web permissions differently:
```tsx
useEffect(() => {
  (async () => {
    if (Platform.OS === 'web') {
      // For web, permissions are handled by WebBarcodeScanner
      setHasPermission(true);
    } else {
      // For native apps, use expo-camera permissions
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    }
  })();
}, []);
```

## AWS Services Used

- **Amazon S3**: Static website hosting
- **Amazon CloudFront**: CDN and HTTPS termination
- **AWS Certificate Manager (ACM)**: SSL/TLS certificates
- **Amazon Route 53**: DNS management
- **AWS CLI**: Deployment automation

## Key Packages

- **expo**: React Native framework
- **react-native-web**: Web compatibility layer
- **react-dom**: React DOM renderer
- **@expo/metro-runtime**: Metro bundler for web
- **@zxing/library**: Web barcode scanning (optional)

## Troubleshooting

### Common Issues

1. **AccessDenied errors**: Check S3 bucket policy and file upload location
2. **SSL certificate warnings**: Ensure ACM certificate is validated and attached to CloudFront
3. **Camera not working**: Requires HTTPS for mobile browsers
4. **PWA not installable**: Check manifest.json configuration in app.json
5. **Old app version showing**: Browser cache issue - use incognito mode or clear cache
6. **Front camera instead of back**: Web barcode scanner needs explicit camera selection
7. **403 errors on JavaScript files**: Files not uploaded properly or CloudFront cache issue

### Useful Commands

Check certificate status:
```bash
aws acm describe-certificate --certificate-arn YOUR_ARN --region us-east-1 --query "Certificate.Status"
```

Check CloudFront deployment:
```bash
aws cloudfront get-distribution --id YOUR_ID --query "Distribution.Status"
```

Check DNS propagation:
```bash
nslookup groceries-scanner.altrulab.com
```

Clear CloudFront cache (essential after updates):
```bash
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

Check invalidation status:
```bash
aws cloudfront list-invalidations --distribution-id YOUR_DISTRIBUTION_ID
```

### Cache Issues

**Problem**: Users see old version of app after updates
**Solution**: 
1. Always run CloudFront invalidation after deployment
2. Test in incognito/private browser mode
3. CloudFront cache invalidation takes 5-15 minutes to propagate globally

**What CloudFront cache invalidation does:**
- Forces CloudFront to delete cached files
- Makes CloudFront fetch fresh files from S3
- Ensures users get the latest app version
- Without it, users may see old app for hours/days

## Cost Considerations

- **S3**: ~$0.023/GB storage + $0.0004/1000 requests
- **CloudFront**: ~$0.085/GB data transfer + $0.0075/10000 requests
- **Route 53**: $0.50/hosted zone/month + $0.40/million queries
- **ACM**: Free for AWS resources

Estimated monthly cost for small app: $1-5/month