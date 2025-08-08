# 🚀 Translify Deployment & Testing Guide

## 📋 **Prerequisites**

### **1. Shopify Partner Account**
- Sign up at [partners.shopify.com](https://partners.shopify.com)
- Create a new app in your Partner Dashboard

### **2. Google Cloud Translation API**
- Set up Google Cloud Project
- Enable Translation API
- Create API key

### **3. Domain & SSL Certificate**
- Purchase domain (e.g., `your-app.com`)
- Set up SSL certificate (Let's Encrypt recommended)

---

## 🎯 **Testing Options**

### **Option A: Development Store (Recommended for Testing)**

#### **Step 1: Create Development Store**
1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Click "Stores" → "Add store" → "Development store"
3. Fill in store details:
   - Store name: `Translify Test Store`
   - Store URL: `translify-test.myshopify.com`
   - Store type: Development store
   - Password: Create secure password

#### **Step 2: Add Sample Products**
1. Go to your development store admin
2. Navigate to Products → Add product
3. Add 10-20 sample products with:
   - Product titles in English
   - Product descriptions
   - Product images
   - Variants with different names

#### **Step 3: Install Your App**
1. In your Partner Dashboard, go to your app
2. Click "Test on development store"
3. Select your development store
4. Install the app

### **Option B: Partner Development Store**

#### **Step 1: Create Partner Development Store**
1. In Partner Dashboard → Stores → Add store
2. Choose "Partner development store"
3. This gives you more control and features

#### **Step 2: Set Up Store**
1. Add sample products (same as above)
2. Customize theme if needed
3. Install your app

### **Option C: Production Store (Advanced)**

#### **Step 1: Prepare Production Environment**
1. Set up production server
2. Configure domain and SSL
3. Set up PostgreSQL database
4. Configure Redis for job queues

#### **Step 2: Deploy App**
1. Deploy backend to production server
2. Deploy frontend to CDN
3. Update app URLs in Partner Dashboard

---

## 🔧 **Environment Setup**

### **1. Create Production .env File**

```bash
# Copy the example file
cp env.example .env

# Edit with your actual values
nano .env
```

**Required values for .env:**
```env
# Shopify App
SHOPIFY_API_KEY=your_actual_api_key
SHOPIFY_API_SECRET=your_actual_api_secret
APP_URL=https://your-app-domain.com

# Google Translate
GOOGLE_TRANSLATE_API_KEY=your_google_api_key

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/translify

# Redis
REDIS_URL=redis://localhost:6379

# Security
SESSION_SECRET=your_very_secure_random_string
NODE_ENV=production
```

### **2. Update App Configuration**

**Update `shopify.app.toml`:**
```toml
application_url = "https://your-app-domain.com"
```

**Update `web/shopify.web.toml`:**
```toml
roles = ["backend"]

[commands]
dev = "npm run dev"
build = "npm run build"
```

---

## 🚀 **Deployment Steps**

### **Step 1: Prepare Your Server**

#### **Option A: VPS/Cloud Server**
```bash
# Install Node.js, PostgreSQL, Redis
sudo apt update
sudo apt install nodejs npm postgresql redis-server nginx

# Set up PostgreSQL
sudo -u postgres createdb translify
sudo -u postgres createuser translify_user
```

#### **Option B: Heroku/Railway**
```bash
# Deploy to Heroku
heroku create translify-app
heroku addons:create heroku-postgresql
heroku addons:create heroku-redis
```

### **Step 2: Deploy Backend**

```bash
# Clone your repository
git clone https://github.com/your-username/translify.git
cd translify

# Install dependencies
npm install

# Set environment variables
cp env.example .env
# Edit .env with your values

# Run database migrations
npm run migrate

# Start the server
npm start
```

### **Step 3: Deploy Frontend**

```bash
# Build frontend
cd web/frontend
npm install
npm run build

# Deploy to CDN (Netlify, Vercel, etc.)
```

### **Step 4: Configure Domain**

1. Point your domain to your server
2. Set up SSL certificate
3. Configure nginx reverse proxy

---

## 🧪 **Testing Checklist**

### **Pre-Testing Setup**
- [ ] Development store created
- [ ] Sample products added (10-20 products)
- [ ] App installed on store
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Backend server running
- [ ] Frontend deployed

### **Functionality Testing**
- [ ] App loads in Shopify admin
- [ ] Dashboard displays correctly
- [ ] Product translation works
- [ ] Theme extension loads
- [ ] Translation caching works
- [ ] Rate limiting handles load
- [ ] Error handling works

### **Performance Testing**
- [ ] Test with 50+ products
- [ ] Test translation speed
- [ ] Test concurrent users
- [ ] Monitor API usage
- [ ] Check database performance

### **Security Testing**
- [ ] HTTPS working
- [ ] API keys secure
- [ ] Rate limiting active
- [ ] Input validation working
- [ ] SQL injection protection

---

## 🔍 **Monitoring & Debugging**

### **1. Logs**
```bash
# Backend logs
tail -f /var/log/translify/app.log

# Nginx logs
tail -f /var/log/nginx/access.log
```

### **2. Database**
```bash
# Check translations table
psql -d translify -c "SELECT COUNT(*) FROM translations;"

# Check recent translations
psql -d translify -c "SELECT * FROM translations ORDER BY created_at DESC LIMIT 10;"
```

### **3. API Usage**
- Monitor Google Translate API usage
- Check Shopify API rate limits
- Monitor Redis queue status

---

## 🚨 **Common Issues & Solutions**

### **Issue: App not loading**
**Solution:**
- Check app URL in Partner Dashboard
- Verify SSL certificate
- Check server logs

### **Issue: Translations not working**
**Solution:**
- Verify Google Translate API key
- Check API usage limits
- Verify database connection

### **Issue: Rate limiting**
**Solution:**
- Increase rate limits in app.js
- Implement better caching
- Use batch processing

### **Issue: Theme extension not showing**
**Solution:**
- Check theme app extension configuration
- Verify app is installed on store
- Check browser console for errors

---

## 📊 **Success Metrics**

### **Technical Metrics**
- App load time < 3 seconds
- Translation response time < 2 seconds
- 99% uptime
- < 1% error rate

### **User Experience Metrics**
- Successful translation rate > 95%
- User satisfaction > 4.5/5
- No critical bugs reported

### **Business Metrics**
- Translation accuracy > 90%
- API cost per translation < $0.01
- Scalable to 1000+ products

---

## 🎯 **Next Steps**

1. **Choose your testing option** (Development store recommended)
2. **Set up your environment** (follow the guide above)
3. **Deploy your app** (use the deployment steps)
4. **Test thoroughly** (use the testing checklist)
5. **Monitor performance** (use the monitoring tools)
6. **Iterate and improve** (based on testing results)

**Ready to start? Choose your testing option and let's get your app live! 🚀** 