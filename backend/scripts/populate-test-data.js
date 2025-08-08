#!/usr/bin/env node

const Translation = require('../models/Translation');
const { getDatabase } = require('../db');

async function populateTestData() {
  try {
    console.log('📝 Creating sample translations...');
    
    const sampleTranslations = [
      {
        merchant_id: 1,
        resource_type: 'product',
        resource_id: '123',
        field: 'title',
        original_text: 'Premium Cotton T-Shirt',
        translated_text: 'Camiseta de Algodón Premium',
        language: 'es',
        status: 'completed',
        auto_translated: true
      },
      {
        merchant_id: 1,
        resource_type: 'product',
        resource_id: '123',
        field: 'description',
        original_text: 'Comfortable and stylish t-shirt made from 100% organic cotton.',
        translated_text: 'Camiseta cómoda y elegante hecha de 100% algodón orgánico.',
        language: 'es',
        status: 'completed',
        auto_translated: true
      },
      {
        merchant_id: 1,
        resource_type: 'product',
        resource_id: '123',
        field: 'title',
        original_text: 'Premium Cotton T-Shirt',
        translated_text: 'T-Shirt en Coton Premium',
        language: 'fr',
        status: 'completed',
        auto_translated: false
      },
      {
        merchant_id: 1,
        resource_type: 'page',
        resource_id: '456',
        field: 'title',
        original_text: 'About Our Company',
        translated_text: '',
        language: 'es',
        status: 'pending',
        auto_translated: false
      },
      {
        merchant_id: 1,
        resource_type: 'page',
        resource_id: '456',
        field: 'body',
        original_text: 'We are a sustainable fashion company dedicated to creating high-quality clothing.',
        translated_text: '',
        language: 'fr',
        status: 'pending',
        auto_translated: false
      },
      {
        merchant_id: 1,
        resource_type: 'collection',
        resource_id: '789',
        field: 'title',
        original_text: 'Summer Collection 2024',
        translated_text: 'Colección de Verano 2024',
        language: 'es',
        status: 'completed',
        auto_translated: true
      },
      {
        merchant_id: 1,
        resource_type: 'blog',
        resource_id: '101',
        field: 'title',
        original_text: 'Sustainable Fashion Trends',
        translated_text: 'Tendencias de Moda Sostenible',
        language: 'es',
        status: 'completed',
        auto_translated: false
      },
      {
        merchant_id: 1,
        resource_type: 'blog',
        resource_id: '101',
        field: 'body',
        original_text: 'Discover the latest trends in sustainable fashion and how to incorporate them into your wardrobe.',
        translated_text: '',
        language: 'de',
        status: 'pending',
        auto_translated: false
      }
    ];
    
    for (const translation of sampleTranslations) {
      await Translation.create(translation);
    }
    
    console.log('✅ Sample data created successfully!');
    console.log(`📊 Created ${sampleTranslations.length} translations`);
    console.log('\n🎯 You can now test the advanced features:');
    console.log('- Bulk operations (select multiple translations)');
    console.log('- Translation memory (similar translations)');
    console.log('- Advanced filtering (date range, auto-translated)');
    console.log('- Export functionality');
    console.log('- Real-time translation suggestions');
    
  } catch (error) {
    console.error('❌ Error populating test data:', error);
    process.exit(1);
  }
}

populateTestData(); 