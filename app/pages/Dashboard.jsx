import { Card, BlockStack, InlineStack, Page, Layout, Text, Button, Spinner, Badge, Banner } from "@shopify/polaris";
import {
  SettingsIcon,
  RefreshIcon,
  PlusIcon
} from "@shopify/polaris-icons";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from '../utils/api';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [merchantId, setMerchantId] = useState(null);
  const [stats, setStats] = useState({
    totalTranslations: 0,
    pendingTranslations: 0,
    completedTranslations: 0,
    autoTranslated: 0,
    languages: [],
    recentActivity: []
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState({
    languages: ['es', 'fr', 'de'],
    autoTranslate: true,
    syncToShopify: true
  });

  useEffect(() => {
    loadMerchantInfo();
  }, []);

  useEffect(() => {
    if (merchantId) {
      loadStats();
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

  const loadStats = async () => {
    if (!merchantId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/translations/${merchantId}/stats`);
      setStats({
        totalTranslations: data.total || 0,
        pendingTranslations: data.byStatus?.pending || 0,
        completedTranslations: data.byStatus?.completed || 0,
        autoTranslated: data.auto_translated || 0,
        languages: Object.entries(data.byLanguage || {}).map(([code, count]) => ({
          code,
          name: code,
          count,
          progress: data.byLanguageProgress ? data.byLanguageProgress[code] : 0
        })),
        recentActivity: [] // TODO: Fetch recent activity from backend
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadStats();
  };

  const handleAutoTranslate = async () => {
    if (!merchantId) return;
    
    setActionLoading(true);
    setActionMessage(null);
    try {
      const response = await api.post(`/translations/${merchantId}/bulk/auto-translate`, {
        status: 'pending',
        limit: 10
      });
      setActionMessage({ type: 'success', content: `Auto-translated ${response.translated || 0} items` });
      loadStats();
    } catch (error) {
      setActionMessage({ type: 'critical', content: 'Failed to auto-translate: ' + error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncToShopify = async () => {
    if (!merchantId) return;
    
    setActionLoading(true);
    setActionMessage(null);
    try {
      const response = await api.post(`/translations/${merchantId}/bulk/sync`, {
        status: 'completed'
      });
      setActionMessage({ type: 'success', content: `Synced ${response.synced || 0} translations to Shopify` });
      loadStats();
    } catch (error) {
      setActionMessage({ type: 'critical', content: 'Failed to sync to Shopify: ' + error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const handleImportProducts = async () => {
    if (!merchantId) return;
    try {
      const response = await api.post(`/translations/${merchantId}/import-products`, { limit: 5 });
      console.log('Import result:', response);
      loadStats();
    } catch (error) {
      console.error('Failed to import products:', error);
      setActionMessage({ type: 'critical', content: 'Failed to import products: ' + error.message });
    }
  };

  if (loading) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spinner size="large" />
                <Text variant="bodyMd" as="p" style={{ marginTop: '16px' }}>
                  Loading dashboard...
                </Text>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Translation Dashboard"
      primaryAction={{
        content: actionLoading ? 'Processing...' : 'Auto Translate',
        icon: PlusIcon,
        onAction: handleAutoTranslate,
        loading: actionLoading
      }}
      secondaryActions={[
        {
          content: actionLoading ? 'Processing...' : 'Sync to Shopify',
          icon: RefreshIcon,
          onAction: handleSyncToShopify,
          loading: actionLoading
        },
        {
          content: 'Settings',
          icon: SettingsIcon,
          onAction: handleSettings
        }
      ]}
    >
      {actionMessage && (
        <Layout.Section>
          <Banner
            title={actionMessage.content}
            status={actionMessage.type}
            onDismiss={() => setActionMessage(null)}
          />
        </Layout.Section>
      )}
      <Layout>
        {/* Stats Cards */}
        <Layout.Section>
          <Card>
            <Layout>
              <Layout.Section oneThird>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <BlockStack gap="tight">
                    <Text variant="headingLg" as="h2">
                      {stats.totalTranslations}
                    </Text>
                    <Text variant="bodyMd" as="p" color="subdued">
                      Total Translations
                    </Text>
                  </BlockStack>
                </div>
              </Layout.Section>
              <Layout.Section oneThird>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <BlockStack gap="tight">
                    <Text variant="headingLg" as="h2" color="critical">
                      {stats.pendingTranslations}
                    </Text>
                    <Text variant="bodyMd" as="p" color="subdued">
                      Pending
                    </Text>
                  </BlockStack>
                </div>
              </Layout.Section>
              <Layout.Section oneThird>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <BlockStack gap="tight">
                    <Text variant="headingLg" as="h2" color="success">
                      {stats.completedTranslations}
                    </Text>
                    <Text variant="bodyMd" as="p" color="subdued">
                      Completed
                    </Text>
                  </BlockStack>
                </div>
              </Layout.Section>
            </Layout>
          </Card>
        </Layout.Section>

        {/* Language Progress */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h3">
                Language Progress
              </Text>
              <BlockStack gap="loose">
                {stats.languages.map((lang) => (
                  <div key={lang.code}>
                    <InlineStack align="center" distribution="equalSpacing">
                      <InlineStack gap="tight">
                        <Text variant="bodyMd" as="span" fontWeight="semibold">
                          {lang.name}
                        </Text>
                        <Badge status="info">{lang.count} items</Badge>
                      </InlineStack>
                      <Text variant="bodyMd" as="span">
                        {lang.progress}%
                      </Text>
                    </InlineStack>
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ 
                        width: '100%', 
                        height: '4px', 
                        backgroundColor: '#e1e3e5', 
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <div style={{ 
                          width: `${lang.progress}%`, 
                          height: '100%', 
                          backgroundColor: '#5c6ac4' 
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </BlockStack>
            </div>
          </Card>
        </Layout.Section>

        {/* Quick Actions */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <BlockStack gap="loose">
                <Text variant="headingMd" as="h3">
                  Quick Actions
                </Text>
                <Layout>
                  <Layout.Section oneHalf>
                    <Card>
                      <div style={{ padding: '20px' }}>
                        <BlockStack gap="tight">
                          <Text variant="bodyMd" as="h4" fontWeight="semibold">
                            Test with Products
                          </Text>
                          <Text variant="bodyMd" as="p" color="subdued">
                            Import sample products from your Shopify store for testing
                          </Text>
                          <Button primary onClick={handleImportProducts}>
                            Import Products
                          </Button>
                        </BlockStack>
                      </div>
                    </Card>
                  </Layout.Section>
                  <Layout.Section oneHalf>
                    <Card>
                      <div style={{ padding: '20px' }}>
                        <BlockStack gap="tight">
                          <Text variant="bodyMd" as="h4" fontWeight="semibold">
                            Glossary Management
                          </Text>
                          <Text variant="bodyMd" as="p" color="subdued">
                            Manage translation glossary and terminology
                          </Text>
                          <Button>Manage Glossary</Button>
                        </BlockStack>
                      </div>
                    </Card>
                  </Layout.Section>
                </Layout>
              </BlockStack>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 