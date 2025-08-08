import { useState, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  TextField,
  Select,
  Spinner,
  Modal,
  FormLayout,
  Checkbox,
  Tabs,
  DataTable,
  Banner,
  EmptyState
} from "@shopify/polaris";
import {
  SettingsIcon,
  GlobeIcon,
  AutomationIcon,
  LanguageIcon,
  SunIcon,
  SaveIcon
} from "@shopify/polaris-icons";
import { useTranslation } from "react-i18next";
import { useApi } from '../utils/api';

export default function Settings() {
  const { t } = useTranslation();
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    languages: ['es', 'fr', 'de'],
    autoTranslate: true,
    syncToShopify: true,
    googleTranslateApiKey: '',
    doNotTranslate: [],
    automationRules: {
      productTitles: true,
      productDescriptions: true,
      productTags: false,
      pageTitles: true,
      pageContent: true,
      metaDescriptions: false
    }
  });
  const [testResults, setTestResults] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [testText, setTestText] = useState('Hello world');
  const [testTranslationResult, setTestTranslationResult] = useState(null);
  const [testTranslationLoading, setTestTranslationLoading] = useState(false);
  const [testTargetLanguage, setTestTargetLanguage] = useState('es');
  const [merchantId, setMerchantId] = useState(null);

  useEffect(() => {
    loadMerchantInfo();
  }, []);

  useEffect(() => {
    if (merchantId) {
      loadSettings();
    }
  }, [merchantId]);

  const loadMerchantInfo = async () => {
    try {
      const merchantInfo = await api.get('/merchant');
      setMerchantId(merchantInfo.merchantId);
    } catch (err) {
      console.error('Failed to load merchant info:', err);
      // Fallback to default merchant ID for development
      setMerchantId('1');
    }
  };

  const loadSettings = async () => {
    if (!merchantId) return;
    
    setLoading(true);
    try {
      const data = await api.get(`/settings/${merchantId}`);
      // Merge with defaults to ensure all properties exist
      setSettings(prev => ({
        ...prev,
        ...data,
        doNotTranslate: data.doNotTranslate || [],
        automationRules: data.automationRules || {}
      }));
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Keep default settings if API fails
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put(`/settings/${merchantId}`, settings);
      setSaving(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await api.post(`/settings/${merchantId}/test-connection`);
      setTestResults(result);
    } catch (error) {
      setTestResults({ success: false, message: error.message });
    }
  };



  const languageOptions = [
    { label: 'Spanish', value: 'es' },
    { label: 'French', value: 'fr' },
    { label: 'German', value: 'de' },
    { label: 'Italian', value: 'it' },
    { label: 'Portuguese', value: 'pt' },
    { label: 'Dutch', value: 'nl' },
    { label: 'Japanese', value: 'ja' },
    { label: 'Korean', value: 'ko' },
    { label: 'Chinese (Simplified)', value: 'zh' },
    { label: 'Arabic', value: 'ar' }
  ];

  const languageLabels = {
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    nl: 'Dutch',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese (Simplified)',
    ar: 'Arabic'
  };

  const tabs = [
    {
      id: 'general',
      content: 'General',
      icon: SettingsIcon,
      accessibilityLabel: 'General settings'
    },
    {
      id: 'languages',
      content: 'Languages',
      icon: GlobeIcon,
      accessibilityLabel: 'Language settings'
    },
    {
      id: 'automation',
      content: 'Automation',
      icon: AutomationIcon,
      accessibilityLabel: 'Automation settings'
    },
    {
      id: 'testing',
      content: 'Testing',
      icon: SunIcon,
      accessibilityLabel: 'Testing settings'
    }
  ];

  // Debug tabs
  console.log('Tabs configuration:', tabs);
  console.log('Active tab:', activeTab);
  console.log('Tabs component props:', { tabs, selected: activeTab });
  console.log('Current automation rules:', settings.automationRules);

  if (loading) {
    return (
      <Page title={t('Settings.title', 'Settings')}>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spinner size="large" />
                <Text variant="bodyMd" as="p" style={{ marginTop: '16px' }}>
                  {t('Settings.loading', 'Loading settings...')}
                </Text>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <>
      <Page
        title={t('Settings.title', 'Settings')}
        primaryAction={{
          content: t('Settings.save', 'Save Settings'),
          icon: SaveIcon,
          onAction: handleSaveSettings,
          loading: saving
        }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: '0', minHeight: '400px' }}>
                {/* Custom tab navigation */}
                <div style={{ 
                  display: 'flex', 
                  borderBottom: '1px solid #e1e3e5',
                  marginBottom: '20px'
                }}>
                  {tabs.map((tab, index) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(index)}
                      style={{
                        padding: '12px 16px',
                        border: 'none',
                        background: activeTab === index ? '#008060' : 'transparent',
                        color: activeTab === index ? 'white' : '#202223',
                        cursor: 'pointer',
                        borderBottom: activeTab === index ? '2px solid #008060' : 'none',
                        fontWeight: activeTab === index ? '600' : '400',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px'
                      }}
                    >
                      {tab.icon && <tab.icon />}
                      {tab.content}
                    </button>
                  ))}
                </div>
                
                {/* Tab content */}
                {activeTab === 0 && (
                  <div style={{ padding: '20px' }}>
                    <BlockStack gap="loose">
                      <Text variant="headingMd" as="h3">
                        {t('Settings.General.title', 'General Settings')}
                      </Text>
                      
                      <FormLayout>
                        <TextField
                          label={t('Settings.General.apiKey', 'Google Translate API Key')}
                          value={settings.googleTranslateApiKey}
                          onChange={(value) => setSettings(prev => ({ ...prev, googleTranslateApiKey: value }))}
                          placeholder={t('Settings.General.apiKeyPlaceholder', 'Enter your Google Translate API key')}
                          helpText={t('Settings.General.apiKeyHelp', 'Required for automatic translation functionality')}
                        />
                        
                        <Checkbox
                          label={t('Settings.General.autoTranslate', 'Enable automatic translation')}
                          checked={settings.autoTranslate}
                          onChange={(checked) => setSettings(prev => ({ ...prev, autoTranslate: checked }))}
                          helpText={t('Settings.General.autoTranslateHelp', 'Automatically translate new content using Google Translate')}
                        />
                        
                        <Checkbox
                          label={t('Settings.General.autoSync', 'Auto-sync to Shopify')}
                          checked={settings.syncToShopify}
                          onChange={(checked) => setSettings(prev => ({ ...prev, syncToShopify: checked }))}
                          helpText={t('Settings.General.autoSyncHelp', 'Automatically sync completed translations to your Shopify store')}
                        />
                      </FormLayout>
                    </BlockStack>
                  </div>
                )}

                {/* Language Settings */}
                {activeTab === 1 && (
                  <div style={{ padding: '20px' }}>
                    <BlockStack gap="loose">
                      <Text variant="headingMd" as="h3">
                        {t('Settings.Languages.title', 'Target Languages')}
                      </Text>
                      
                      <Text variant="bodyMd" as="p" color="subdued">
                        {t('Settings.Languages.description', 'Select the languages you want to translate your content into:')}
                      </Text>
                      
                      <FormLayout>
                        {languageOptions.map((lang) => (
                          <Checkbox
                            key={lang.value}
                            label={lang.label}
                            checked={settings.languages.includes(lang.value)}
                            onChange={(checked) => {
                              if (checked) {
                                setSettings(prev => ({
                                  ...prev,
                                  languages: [...prev.languages, lang.value]
                                }));
                              } else {
                                setSettings(prev => ({
                                  ...prev,
                                  languages: prev.languages.filter(l => l !== lang.value)
                                }));
                              }
                            }}
                          />
                        ))}
                      </FormLayout>
                    </BlockStack>
                  </div>
                )}

                {/* Automation Rules */}
                {activeTab === 2 && (
                  <div style={{ padding: '20px' }}>
                    <BlockStack gap="loose">
                      <Text variant="headingMd" as="h3">
                        {t('Settings.Automation.title', 'Automation Rules')}
                      </Text>
                      
                      <Text variant="bodyMd" as="p" color="subdued">
                        {t('Settings.Automation.description', 'Configure automatic translation rules for different content types:')}
                      </Text>
                      
                      <Card>
                        <div style={{ padding: '20px' }}>
                          <BlockStack gap="loose">
                            <Text variant="bodyMd" as="h4" fontWeight="semibold">
                              {t('Settings.Automation.productContent', 'Product Content')}
                            </Text>
                            <FormLayout>
                              <Checkbox
                                label={t('Settings.Automation.autoTranslateTitles', 'Auto-translate product titles')}
                                checked={settings.automationRules.productTitles}
                                onChange={(checked) => {
                                  console.log('Setting productTitles to:', checked);
                                  setSettings(prev => ({ 
                                    ...prev, 
                                    automationRules: { 
                                      ...prev.automationRules, 
                                      productTitles: checked 
                                    } 
                                  }));
                                }}
                              />
                              <Checkbox
                                label={t('Settings.Automation.autoTranslateDescriptions', 'Auto-translate product descriptions')}
                                checked={settings.automationRules.productDescriptions}
                                onChange={(checked) => {
                                  console.log('Setting productDescriptions to:', checked);
                                  setSettings(prev => ({ 
                                    ...prev, 
                                    automationRules: { 
                                      ...prev.automationRules, 
                                      productDescriptions: checked 
                                    } 
                                  }));
                                }}
                              />
                              <Checkbox
                                label={t('Settings.Automation.autoTranslateTags', 'Auto-translate product tags')}
                                checked={settings.automationRules.productTags}
                                onChange={(checked) => {
                                  console.log('Setting productTags to:', checked);
                                  setSettings(prev => ({ 
                                    ...prev, 
                                    automationRules: { 
                                      ...prev.automationRules, 
                                      productTags: checked 
                                    } 
                                  }));
                                }}
                              />
                            </FormLayout>
                          </BlockStack>
                        </div>
                      </Card>
                      
                      <Card>
                        <div style={{ padding: '20px' }}>
                          <BlockStack gap="loose">
                            <Text variant="bodyMd" as="h4" fontWeight="semibold">
                              {t('Settings.Automation.pageContent', 'Page Content')}
                            </Text>
                            <FormLayout>
                              <Checkbox
                                label={t('Settings.Automation.autoTranslatePageTitles', 'Auto-translate page titles')}
                                checked={settings.automationRules.pageTitles}
                                onChange={(checked) => {
                                  console.log('Setting pageTitles to:', checked);
                                  setSettings(prev => ({ 
                                    ...prev, 
                                    automationRules: { 
                                      ...prev.automationRules, 
                                      pageTitles: checked 
                                    } 
                                  }));
                                }}
                              />
                              <Checkbox
                                label={t('Settings.Automation.autoTranslatePageContent', 'Auto-translate page content')}
                                checked={settings.automationRules.pageContent}
                                onChange={(checked) => {
                                  console.log('Setting pageContent to:', checked);
                                  setSettings(prev => ({ 
                                    ...prev, 
                                    automationRules: { 
                                      ...prev.automationRules, 
                                      pageContent: checked 
                                    } 
                                  }));
                                }}
                              />
                              <Checkbox
                                label={t('Settings.Automation.autoTranslateMetaDescriptions', 'Auto-translate meta descriptions')}
                                checked={settings.automationRules.metaDescriptions}
                                onChange={(checked) => {
                                  console.log('Setting metaDescriptions to:', checked);
                                  setSettings(prev => ({ 
                                    ...prev, 
                                    automationRules: { 
                                      ...prev.automationRules, 
                                      metaDescriptions: checked 
                                    } 
                                  }));
                                }}
                              />
                            </FormLayout>
                          </BlockStack>
                        </div>
                      </Card>
                    </BlockStack>
                  </div>
                )}

                {/* Testing */}
                {activeTab === 3 && (
                  <div style={{ padding: '20px' }}>
                    <BlockStack gap="loose">
                      <Text variant="headingMd" as="h3">
                        {t('Settings.Testing.title', 'API Testing')}
                      </Text>
                      
                      <Text variant="bodyMd" as="p" color="subdued">
                        {t('Settings.Testing.description', 'Test your API connections and translation services:')}
                      </Text>
                      
                      <Card>
                        <div style={{ padding: '20px' }}>
                          <BlockStack gap="loose">
                            <InlineStack align="center" distribution="equalSpacing">
                              <div style={{marginTop: '5px'}}>
                              <Text variant="bodyMd" as="h4" fontWeight="semibold">
                                {t('Settings.Testing.connectionTests', 'Connection Tests')}
                              </Text>
                              </div>
                              <div style={{ marginLeft: '20px', paddingBottom: '10px' }}>
                              <Button onClick={handleTestConnection}>
                                {t('Settings.Testing.testAllConnections', 'Test All Connections')}
                              </Button>
                              </div>
                            </InlineStack>
                            
                            {testResults && (
                              <Banner
                                status={testResults.success ? 'success' : 'critical'}
                                title={testResults.success ? t('Settings.Testing.allTestsPassed', 'All tests passed!') : t('Settings.Testing.someTestsFailed', 'Some tests failed')}
                              >
                                <p>{testResults.message}</p>
                              </Banner>
                            )}
                            
                            <FormLayout>
                              <Checkbox
                                label={t('Settings.Testing.googleTranslateAPI', 'Google Translate API')}
                                checked={!!settings.googleTranslateApiKey}
                                onChange={() => {}}
                                disabled
                              />
                              <Checkbox
                                label={t('Settings.Testing.shopifyAPI', 'Shopify API')}
                                checked={true}
                                onChange={() => {}}
                                disabled
                              />
                              <Checkbox
                                label={t('Settings.Testing.databaseConnection', 'Database Connection')}
                                checked={true}
                                onChange={() => {}}
                                disabled
                              />
                            </FormLayout>
                          </BlockStack>
                        </div>
                      </Card>
                      
                      <Card>
                        <div style={{ padding: '20px' }}>
                          <BlockStack gap="loose">
                            <Text variant="bodyMd" as="h4" fontWeight="semibold">
                              {t('Settings.Testing.testTranslation', 'Test Translation')}
                            </Text>
                            <InlineStack align="center" distribution="equalSpacing">
                              <TextField
                                label={t('Settings.Testing.testText', 'Test Text')}
                                value={testText}
                                onChange={(value) => setTestText(value)}
                                multiline={2}
                              />
                              <Select
                                label={t('Settings.Testing.testTargetLanguage', 'Target Language')}
                                options={languageOptions}
                                value={testTargetLanguage}
                                onChange={(value) => setTestTargetLanguage(value)}
                              />
                            </InlineStack>
                            <Button onClick={() => {
                              setTestTranslationLoading(true);
                              api.post(`/settings/${merchantId}/test-translation`, { text: testText, targetLanguage: testTargetLanguage })
                                .then(result => {
                                  setTestTranslationResult(result);
                                })
                                .catch(error => {
                                  setTestTranslationResult({ success: false, message: error.message });
                                })
                                .finally(() => {
                                  setTestTranslationLoading(false);
                                });
                            }}>
                              {testTranslationLoading ? <Spinner size="small" /> : t('Settings.Testing.testTranslationButton', 'Test Translation')}
                            </Button>
                            {testTranslationResult && (
                              <Banner
                                status={testTranslationResult.success ? 'success' : 'critical'}
                                title={testTranslationResult.success ? t('Settings.Testing.translationPassed', 'Translation passed!') : t('Settings.Testing.translationFailed', 'Translation failed')}
                              >
                                {testTranslationResult.success ? (
                                  <div>
                                    <p><strong>Original:</strong> {testTranslationResult.original}</p>
                                    <p><strong>Translated:</strong> {testTranslationResult.translated}</p>
                                    <p><strong>Target Language:</strong> {testTranslationResult.targetLanguage}</p>
                                  </div>
                                ) : (
                                  <p>{testTranslationResult.message}</p>
                                )}
                              </Banner>
                            )}
                          </BlockStack>
                        </div>
                      </Card>
                    </BlockStack>
                  </div>
                )}
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>


    </>
  );
} 