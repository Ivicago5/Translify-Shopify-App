/**
 * TRANSLIFY - SHOPIFY TRANSLATION APP
 * Theme App Extension - Frontend Translation Engine
 * 
 * This script provides:
 * - Language detection and switching
 * - Dynamic content translation
 * - Translation caching
 * - Fallback handling
 */

(function() {
  'use strict';

  // =============================================================================
  // CONFIGURATION
  // =============================================================================
  
  const TRANSLIFY_CONFIG = {
    // Get settings from theme app extension
    apiEndpoint: window.translifySettings?.apiEndpoint || 'https://translify.com/api',
    merchantId: window.translifySettings?.merchantId || '1',
    defaultLanguage: window.translifySettings?.defaultLanguage || 'en',
    availableLanguages: window.translifySettings?.availableLanguages || ['en', 'es', 'fr', 'de'],
    enableAutoTranslation: window.translifySettings?.enableAutoTranslation !== false,
    
    // Cache settings
    cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
    cachePrefix: 'translify_',
    
    // Selectors for translatable content
    selectors: {
      productTitle: '.product-title, h1.product-single__title, .product__title, .product-name, h2, h3',
      productDescription: '.product-description, .product-single__description, .product__description, .product-details, p',
      productPrice: '.product-price, .price, .product__price, .price-tag',
      collectionTitle: '.collection-title, h1.collection-single__title',
      pageTitle: '.page-title, h1.page__title, h1',
      pageContent: '.page-content, .page__content, .content',
      cartItemTitle: '.cart-item__title, .cart__item-title',
      searchResults: '.search-results__item-title',
      // Demo-specific selectors
      demoContent: '.product-name, .product-details, .price-tag, .product-features li, .product-description'
    }
  };

  // =============================================================================
  // CORE TRANSLATION ENGINE
  // =============================================================================

  class TranslifyEngine {
    constructor() {
      this.currentLanguage = this.detectLanguage();
      this.translationCache = new Map();
      this.isInitialized = false;
      this.translationQueue = [];
      
      console.log('🌍 Translify Engine initialized with language:', this.currentLanguage);
    }

    /**
     * Initialize the translation engine
     */
    async init() {
      if (this.isInitialized) return;
      
      try {
        console.log('🚀 Starting Translify Engine initialization...');
        
        // Create language switcher
        this.createLanguageSwitcher();
        
        // Set up switcher interactions
        this.setupSwitcherInteractions();
        
        // Apply translations to current page
        await this.translatePage();
        
        // Set up mutation observer for dynamic content
        this.setupMutationObserver();
        
        // Set up event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('✅ Translify Engine ready');
        
      } catch (error) {
        console.error('❌ Translify Engine initialization failed:', error);
      }
    }

    /**
     * Detect user's preferred language
     */
    detectLanguage() {
      // Check for stored preference
      const storedLang = localStorage.getItem('translify_language');
      if (storedLang && TRANSLIFY_CONFIG.availableLanguages.includes(storedLang)) {
        return storedLang;
      }

      // Check URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get('lang');
      if (urlLang && TRANSLIFY_CONFIG.availableLanguages.includes(urlLang)) {
        return urlLang;
      }

      // Check browser language
      const browserLang = navigator.language?.split('-')[0];
      if (browserLang && TRANSLIFY_CONFIG.availableLanguages.includes(browserLang)) {
        return browserLang;
      }

      // Fallback to default
      return TRANSLIFY_CONFIG.defaultLanguage;
    }

    /**
     * Create and inject language switcher
     */
    createLanguageSwitcher() {
      // Prevent multiple creation
      if (document.getElementById('translify-language-switcher')) {
        console.log('🎨 Language switcher already exists, skipping creation');
        return;
      }
      
      console.log('🎨 Creating language switcher...');
      console.log('🔍 Available elements on page:');
      console.log('- header:', document.querySelector('header'));
      console.log('- .header:', document.querySelector('.header'));
      console.log('- .site-header:', document.querySelector('.site-header'));
      console.log('- nav:', document.querySelector('nav'));
      console.log('- .nav:', document.querySelector('.nav'));
      console.log('- .navigation:', document.querySelector('.navigation'));
      
      const languageData = {
        'en': { name: 'English', flag: '🇺🇸' },
        'es': { name: 'Español', flag: '🇪🇸' },
        'fr': { name: 'Français', flag: '🇫🇷' },
        'de': { name: 'Deutsch', flag: '🇩🇪' },
        'it': { name: 'Italiano', flag: '🇮🇹' },
        'pt': { name: 'Português', flag: '🇵🇹' },
        'nl': { name: 'Nederlands', flag: '🇳🇱' },
        'ja': { name: '日本語', flag: '🇯🇵' },
        'ko': { name: '한국어', flag: '🇰🇷' },
        'zh': { name: '中文', flag: '🇨🇳' }
      };

      const switcherHTML = `
        <div id="translify-language-switcher" class="translify-switcher">
          <button class="translify-switcher__button" id="translify-current-lang">
            ${languageData[this.currentLanguage]?.flag || '🌍'} ${languageData[this.currentLanguage]?.name || this.currentLanguage}
          </button>
          <div class="translify-switcher__dropdown" id="translify-lang-dropdown">
            ${TRANSLIFY_CONFIG.availableLanguages.map(lang => `
              <button class="translify-switcher__option ${lang === this.currentLanguage ? 'active' : ''}" 
                      data-lang="${lang}">
                ${languageData[lang]?.flag || '🌍'} ${languageData[lang]?.name || lang}
              </button>
            `).join('')}
          </div>
        </div>
      `;

      // Inject CSS
      this.injectStyles();
      
      // Find best location for switcher
      const header = document.querySelector('header, .header, .site-header');
      console.log('🔍 Looking for header element:', header);
      
      if (header) {
        const nav = header.querySelector('nav, .nav, .navigation');
        console.log('🔍 Found navigation:', nav);
        if (nav) {
          nav.appendChild(this.createElementFromHTML(switcherHTML));
          console.log('✅ Added switcher to navigation');
        } else {
          header.appendChild(this.createElementFromHTML(switcherHTML));
          console.log('✅ Added switcher to header');
        }
      } else {
        // Fallback to body
        document.body.insertBefore(this.createElementFromHTML(switcherHTML), document.body.firstChild);
        console.log('✅ Added switcher to body (fallback)');
      }

      // Set up switcher interactions
      this.setupSwitcherInteractions();
    }

    /**
     * Inject CSS styles for language switcher
     */
    injectStyles() {
      const styles = `
        .translify-switcher {
          position: relative;
          display: inline-block;
          margin-left: 15px;
          z-index: 1000;
        }
        
        .translify-switcher__button {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.2s ease;
        }
        
        .translify-switcher__button:hover {
          border-color: #999;
          background: #f9f9f9;
        }
        
        .translify-switcher__dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          z-index: 1000;
          min-width: 150px;
          display: none;
          max-height: 300px;
          overflow-y: auto;
        }
        
        .translify-switcher__dropdown.show {
          display: block;
        }
        
        .translify-switcher__option {
          display: block;
          width: 100%;
          padding: 8px 12px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s ease;
        }
        
        .translify-switcher__option:hover {
          background: #f5f5f5;
        }
        
        .translify-switcher__option.active {
          background: #e3f2fd;
          color: #1976d2;
        }
        
        .translify-translated {
          transition: opacity 0.3s ease;
        }
        
        .translify-loading {
          opacity: 0.6;
        }
        
        @media (max-width: 768px) {
          .translify-switcher {
            margin-left: 10px;
          }
          
          .translify-switcher__button {
            padding: 6px 8px;
            font-size: 12px;
          }
        }
      `;

      const styleSheet = document.createElement('style');
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }

    /**
     * Set up language switcher interactions
     */
    setupSwitcherInteractions() {
      console.log('🎧 Setting up switcher interactions...');
      
      const button = document.getElementById('translify-current-lang');
      const dropdown = document.getElementById('translify-lang-dropdown');
      
      console.log('🔍 Found button:', button);
      console.log('🔍 Found dropdown:', dropdown);
      console.log('🔍 Dropdown HTML:', dropdown?.innerHTML);
      console.log('🔍 Dropdown children:', dropdown?.children?.length);
      
      if (button && dropdown) {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log('🔘 Language switcher button clicked');
          
          const isVisible = dropdown.classList.contains('show');
          if (isVisible) {
            dropdown.classList.remove('show');
            console.log('📋 Dropdown hidden');
          } else {
            dropdown.classList.add('show');
            console.log('📋 Dropdown shown');
            console.log('📋 Dropdown HTML:', dropdown.innerHTML);
            console.log('📋 Dropdown children:', dropdown.children.length);
            console.log('📋 Dropdown position:', dropdown.offsetTop, dropdown.offsetLeft);
            console.log('📋 Dropdown dimensions:', dropdown.offsetWidth, dropdown.offsetHeight);
            console.log('📋 Dropdown computed display:', window.getComputedStyle(dropdown).display);
            console.log('📋 Dropdown computed visibility:', window.getComputedStyle(dropdown).visibility);
            console.log('📋 Dropdown computed z-index:', window.getComputedStyle(dropdown).zIndex);
            console.log('📋 Parent position:', dropdown.parentElement.offsetTop, dropdown.parentElement.offsetLeft);
          }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.translify-switcher')) {
            dropdown.classList.remove('show');
            console.log('📋 Dropdown closed (clicked outside)');
          }
        });

        // Handle language selection
        dropdown.addEventListener('click', (e) => {
          if (e.target.matches('.translify-switcher__option')) {
            const language = e.target.dataset.lang;
            console.log('🌍 Language option clicked:', language);
            this.switchLanguage(language);
            dropdown.classList.remove('show');
          }
        });
      } else {
        console.error('❌ Could not find language switcher elements');
      }
    }

    /**
     * Switch to a different language
     */
    async switchLanguage(newLanguage) {
      if (newLanguage === this.currentLanguage) return;
      
      console.log(`🔄 Switching language from ${this.currentLanguage} to ${newLanguage}`);
      
      // Update current language
      this.currentLanguage = newLanguage;
      localStorage.setItem('translify_language', newLanguage);
      
      // Update URL parameter
      const url = new URL(window.location);
      url.searchParams.set('lang', newLanguage);
      window.history.replaceState({}, '', url);
      
      // Update switcher display
      const button = document.getElementById('translify-current-lang');
      if (button) {
        const languageData = {
          'en': { name: 'English', flag: '🇺🇸' },
          'es': { name: 'Español', flag: '🇪🇸' },
          'fr': { name: 'Français', flag: '🇫🇷' },
          'de': { name: 'Deutsch', flag: '🇩🇪' },
          'it': { name: 'Italiano', flag: '🇮🇹' },
          'pt': { name: 'Português', flag: '🇵🇹' },
          'nl': { name: 'Nederlands', flag: '🇳🇱' },
          'ja': { name: '日本語', flag: '🇯🇵' },
          'ko': { name: '한국어', flag: '🇰🇷' },
          'zh': { name: '中文', flag: '🇨🇳' }
        };
        
        button.innerHTML = `${languageData[newLanguage]?.flag || '🌍'} ${languageData[newLanguage]?.name || newLanguage}`;
      }
      
      // Clear cache for new language
      this.clearCache();
      
      // Reset all processed elements so they can be translated again
      document.querySelectorAll('[data-translify-processed]').forEach(element => {
        element.removeAttribute('data-translify-processed');
        element.classList.remove('translify-translated', 'translify-loading');
      });
      
      // Re-translate the page
      console.log('🔄 Starting page translation...');
      await this.translatePage();
      console.log('✅ Page translation completed');
      
      // Close dropdown
      const dropdown = document.getElementById('translify-lang-dropdown');
      if (dropdown) {
        dropdown.classList.remove('show');
      }
    }

    /**
     * Translate the entire page
     */
    async translatePage() {
      if (!TRANSLIFY_CONFIG.enableAutoTranslation) {
        console.log('⚠️ Auto translation is disabled');
        return;
      }
      
      console.log('🔄 Translating page content...');
      console.log('🌍 Current language:', this.currentLanguage);
      console.log('🌍 Default language:', TRANSLIFY_CONFIG.defaultLanguage);
      
      // Get all translatable elements
      const elements = this.getTranslatableElements();
      
      if (elements.length === 0) {
        console.log('⚠️ No translatable elements found');
        return;
      }
      
      console.log(`📝 Found ${elements.length} elements to translate`);
      
      // Process elements in batches
      const batchSize = 10;
      for (let i = 0; i < elements.length; i += batchSize) {
        const batch = elements.slice(i, i + batchSize);
        console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(elements.length/batchSize)}`);
        await Promise.all(batch.map(element => this.translateElement(element)));
        
        // Small delay between batches to avoid overwhelming the API
        if (i + batchSize < elements.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`✅ Page translation completed (${elements.length} elements processed)`);
    }

    /**
     * Get all translatable elements on the page
     */
    getTranslatableElements() {
      const elements = [];
      
      console.log('🔍 Looking for translatable elements...');
      console.log('📋 Available selectors:', TRANSLIFY_CONFIG.selectors);
      
      // Add elements for each selector
      Object.values(TRANSLIFY_CONFIG.selectors).forEach(selector => {
        const found = document.querySelectorAll(selector);
        console.log(`🔍 Found ${found.length} elements for selector: ${selector}`);
        found.forEach(element => {
          if (element.textContent.trim() && !element.hasAttribute('data-translify-processed')) {
            elements.push(element);
            console.log(`📝 Found translatable text: "${element.textContent.trim().substring(0, 50)}..."`);
          }
        });
      });
      
      console.log(`✅ Total translatable elements found: ${elements.length}`);
      return elements;
    }

    /**
     * Translate a single element
     */
    async translateElement(element) {
      const originalText = element.textContent.trim();
      if (!originalText || element.hasAttribute('data-translify-processed')) return;
      
      // Mark as processed to avoid duplicate requests
      element.setAttribute('data-translify-processed', 'true');
      
      // If switching back to default language, restore original text
      if (this.currentLanguage === TRANSLIFY_CONFIG.defaultLanguage) {
        const originalTextAttr = element.getAttribute('data-translify-original');
        if (originalTextAttr) {
          element.textContent = originalTextAttr;
          element.removeAttribute('data-translify-original');
        }
        return;
      }
      
      // Check cache first
      const cacheKey = `${originalText}_${this.currentLanguage}`;
      const cachedTranslation = this.getFromCache(cacheKey);
      
      if (cachedTranslation) {
        this.applyTranslation(element, cachedTranslation);
        return;
      }
      
      element.classList.add('translify-loading');
      
      try {
        // Get translation from API
        const translation = await this.getTranslation(originalText, this.currentLanguage);
        
        if (translation) {
          this.applyTranslation(element, translation);
          this.addToCache(cacheKey, translation);
        }
      } catch (error) {
        console.error('Translation failed for:', originalText, error);
        element.classList.remove('translify-loading');
      }
    }

    /**
     * Apply translation to an element
     */
    applyTranslation(element, translation) {
      element.classList.remove('translify-loading');
      element.classList.add('translify-translated');
      
      // Store original text if not already stored
      if (!element.getAttribute('data-translify-original')) {
        element.setAttribute('data-translify-original', element.textContent);
      }
      
      element.textContent = translation;
    }

    /**
     * Get translation from API
     */
    async getTranslation(text, targetLanguage) {
      try {
        console.log(`🌐 Making API request to: ${TRANSLIFY_CONFIG.apiEndpoint}/translations/translate`);
        console.log(`📝 Request data:`, {
          text: text,
          sourceLanguage: TRANSLIFY_CONFIG.defaultLanguage,
          targetLanguage: targetLanguage,
          merchantId: TRANSLIFY_CONFIG.merchantId
        });
        
        console.log('🌐 Making fetch request...');
        const response = await fetch(`${TRANSLIFY_CONFIG.apiEndpoint}/translations/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Merchant-ID': TRANSLIFY_CONFIG.merchantId
          },
          body: JSON.stringify({
            text: text,
            sourceLanguage: TRANSLIFY_CONFIG.defaultLanguage,
            targetLanguage: targetLanguage
          })
        });
        console.log('📡 Fetch response received:', response.status, response.statusText);

        console.log(`📡 Response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ API request failed: ${response.status} - ${errorText}`);
          throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`✅ Translation response:`, data);
        return data.translation || text;
        
      } catch (error) {
        console.error('❌ Translation API error:', error);
        return text; // Fallback to original text
      }
    }

    /**
     * Cache management
     */
    addToCache(key, value) {
      const cacheData = {
        value: value,
        timestamp: Date.now()
      };
      this.translationCache.set(key, cacheData);
      
      // Also store in localStorage for persistence
      try {
        localStorage.setItem(`${TRANSLIFY_CONFIG.cachePrefix}${key}`, JSON.stringify(cacheData));
      } catch (error) {
        console.warn('Could not save to localStorage:', error);
      }
    }

    getFromCache(key) {
      // Check memory cache first
      const memoryCache = this.translationCache.get(key);
      if (memoryCache && Date.now() - memoryCache.timestamp < TRANSLIFY_CONFIG.cacheExpiry) {
        return memoryCache.value;
      }
      
      // Check localStorage
      try {
        const stored = localStorage.getItem(`${TRANSLIFY_CONFIG.cachePrefix}${key}`);
        if (stored) {
          const cacheData = JSON.parse(stored);
          if (Date.now() - cacheData.timestamp < TRANSLIFY_CONFIG.cacheExpiry) {
            this.translationCache.set(key, cacheData);
            return cacheData.value;
          }
        }
      } catch (error) {
        console.warn('Could not read from localStorage:', error);
      }
      
      return null;
    }

    clearCache() {
      this.translationCache.clear();
      
      // Clear localStorage cache
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(TRANSLIFY_CONFIG.cachePrefix)) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Could not clear localStorage:', error);
      }
    }

    /**
     * Set up mutation observer for dynamic content
     */
    setupMutationObserver() {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the new node contains translatable content
              const translatableElements = this.getTranslatableElements();
              translatableElements.forEach(element => {
                if (!element.hasAttribute('data-translify-processed')) {
                  this.translateElement(element);
                }
              });
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
      // Handle AJAX navigation
      document.addEventListener('DOMContentLoaded', () => {
        this.translatePage();
      });

      // Handle Shopify's AJAX cart updates
      document.addEventListener('cart:updated', () => {
        setTimeout(() => this.translatePage(), 100);
      });

      // Handle product quick view
      document.addEventListener('product:loaded', () => {
        setTimeout(() => this.translatePage(), 100);
      });
    }

    /**
     * Utility function to create element from HTML string
     */
    createElementFromHTML(htmlString) {
      const div = document.createElement('div');
      div.innerHTML = htmlString.trim();
      return div.firstChild;
    }
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTranslify);
  } else {
    initializeTranslify();
  }

  function initializeTranslify() {
    console.log('🚀 Initializing Translify Engine...');
    
    // Create global instance
    window.translifyEngine = new TranslifyEngine();
    
    // Initialize the engine
    window.translifyEngine.init().catch(error => {
      console.error('Failed to initialize Translify:', error);
    });
  }

})();