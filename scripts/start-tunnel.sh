#!/bin/bash

# 🚀 Translify Tunnel Script
# This script creates a public tunnel for testing your app

echo "🚀 Starting Translify tunnel..."

# Check if localtunnel is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js first."
    exit 1
fi

# Start tunnel using localtunnel
echo "📡 Creating tunnel to localhost:3001..."
echo "⏳ This may take a few seconds..."

# Start tunnel
npx localtunnel --port 3001 --subdomain translify-test

echo ""
echo "✅ Tunnel created!"
echo "🌐 Your app is now accessible at: https://translify-test.loca.lt"
echo ""
echo "📋 Next steps:"
echo "1. Go to Shopify Partner Dashboard"
echo "2. Update your app's App URL to: https://translify-test.loca.lt"
echo "3. Update Allowed redirection URLs to: https://translify-test.loca.lt/api/auth"
echo "4. Reinstall your app on the development store"
echo ""
echo "🔗 App URL: https://translify-test.loca.lt"
echo "🔗 Health check: https://translify-test.loca.lt/health"
echo ""
echo "Press Ctrl+C to stop the tunnel" 