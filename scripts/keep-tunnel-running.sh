#!/bin/bash

# 🚀 Translify Tunnel Manager
# This script keeps your app accessible for testing

echo "🚀 Starting Translify tunnel manager..."
echo "📡 Creating tunnel to localhost:3001..."
echo "🌐 Your app will be available at: https://translify-test.loca.lt"
echo ""
echo "📋 App Configuration:"
echo "App URL: https://translify-test.loca.lt"
echo "Redirect URLs: https://translify-test.loca.lt/api/auth"
echo ""
echo "🔗 Test URLs:"
echo "Health: https://translify-test.loca.lt/health"
echo "App: https://translify-test.loca.lt"
echo ""
echo "⏳ Starting tunnel... (Press Ctrl+C to stop)"

# Start tunnel
npx localtunnel --port 3001 --subdomain translify-test 