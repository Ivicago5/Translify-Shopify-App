# 🎨 TRANSLIFY THEME APP EXTENSION

## Overview

The Translify Theme App Extension provides **real-time translation functionality** for Shopify stores, allowing customers to view products, pages, and content in their preferred language.

## ✨ Features

- **🌍 Language Detection**: Automatically detects customer's browser language
- **🔄 Language Switcher**: Beautiful dropdown with flags and language names
- **⚡ Real-time Translation**: Instantly translates content without page reload
- **💾 Smart Caching**: Caches translations for better performance
- **📱 Mobile Responsive**: Works perfectly on all devices
- **🎨 Theme Integration**: Seamlessly integrates with any Shopify theme

## 🚀 Installation

### Step 1: Add to Your Theme

Add this line to your theme's `layout/theme.liquid` file, just before the closing `</head>` tag:

```liquid
{% render 'translify' %}
```

### Step 2: Configure in Shopify Admin

1. Go to your **Shopify Admin** → **Apps** → **Translify**
2. Navigate to **Theme Settings**
3. Configure your translation preferences:
   - **API Endpoint**: Your Translify API URL
   - **Merchant ID**: Your unique merchant identifier
   - **Default Language**: Primary language for your store
   - **Available Languages**: Languages customers can switch between
   - **Enable Auto Translation**: Toggle translation functionality

### Step 3: Add Language Switcher (Optional)

For a customizable language switcher, add this to your theme templates:

```liquid
{% section 'translify-language-switcher' %}
```

## 🎯 How It Works

### Customer Experience

1. **Customer visits your store** → Language automatically detected
2. **Language switcher appears** in header with available languages
3. **Customer clicks "Español"** → All content instantly translates
4. **Product titles, descriptions, prices** → All display in Spanish
5. **Translation is cached** → Faster loading on subsequent visits

### Example Flow

**Before Translation:**
- Product: "Blue Cotton T-Shirt"
- Price: "$29.99"
- Description: "Comfortable cotton t-shirt in blue"

**After clicking "Español":**
- Product: "Camiseta de Algodón Azul"
- Price: "$29.99" (prices remain unchanged)
- Description: "Camiseta de algodón cómoda en azul"

## 🔧 Configuration

### Theme Settings

```json
{
  "apiEndpoint": "https://translify.com/api",
  "merchantId": "your_merchant_id",
  "defaultLanguage": "en",
  "availableLanguages": ["en", "es", "fr", "de"],
  "enableAutoTranslation": true
}
```

### Language Switcher Settings

- **Style**: Dropdown, Buttons, or List
- **Position**: Header, Footer, or Sidebar
- **Show Flags**: Display country flags
- **Show Names**: Display language names

## 🎨 Customization

### CSS Customization

The extension includes default styles, but you can customize them:

```css
/* Custom language switcher styles */
.translify-switcher {
  /* Your custom styles */
}

.translify-switcher__button {
  /* Custom button styles */
}

.translify-switcher__dropdown {
  /* Custom dropdown styles */
}
```

### JavaScript Events

Listen for translation events:

```javascript
// Translation started
document.addEventListener('translify:translate:start', (event) => {
  console.log('Translation started:', event.detail);
});

// Translation completed
document.addEventListener('translify:translate:complete', (event) => {
  console.log('Translation completed:', event.detail);
});

// Language switched
document.addEventListener('translify:language:switch', (event) => {
  console.log('Language switched to:', event.detail.language);
});
```

## 📱 Mobile Support

The extension is fully responsive and works on:
- ✅ Desktop computers
- ✅ Tablets
- ✅ Mobile phones
- ✅ All modern browsers

## 🔍 SEO Benefits

- **Structured Data**: Adds translation metadata for search engines
- **Language Tags**: Proper HTML lang attributes
- **URL Parameters**: Language preference in URLs
- **Meta Tags**: Translation information for crawlers

## 🚨 Troubleshooting

### Common Issues

**Language switcher not appearing:**
- Check if the snippet is properly included in theme.liquid
- Verify app settings are configured correctly
- Check browser console for JavaScript errors

**Translations not working:**
- Verify API endpoint is correct
- Check merchant ID is valid
- Ensure translations exist in your database
- Check network connectivity

**Performance issues:**
- Translations are cached automatically
- Check if too many elements are being translated
- Consider reducing batch size in settings

### Debug Mode

Enable debug mode to see detailed logs:

```javascript
// In browser console
window.translifyEngine.debug = true;
```

## 📊 Analytics

Track translation usage:

```javascript
// Translation analytics
window.translifyEngine.on('translation', (data) => {
  // Send to your analytics service
  gtag('event', 'translation', {
    language: data.targetLanguage,
    element_count: data.elementCount
  });
});
```

## 🔒 Security

- **HTTPS Only**: All API calls use secure connections
- **Input Sanitization**: All text is sanitized before translation
- **Rate Limiting**: Built-in protection against abuse
- **CORS Headers**: Proper cross-origin resource sharing

## 📞 Support

For technical support:
- Check the [main Translify documentation](../README.md)
- Review the [API reference](../docs/API_REFERENCE.md)
- Contact support through the Shopify app

## 🎉 Success Stories

> "Our international sales increased by 40% after implementing Translify. Customers can now browse our products in their native language!" - *Fashion Store Owner*

> "The language switcher is so intuitive. Our Spanish-speaking customers love being able to shop in their preferred language." - *Electronics Store*

---

**Ready to make your store multilingual?** 🚀

Install the Translify Theme App Extension and start reaching customers worldwide! 