import { useState, useEffect, useCallback } from "react";
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
  Badge,
  Spinner,
  Modal,
  FormLayout,
  Checkbox,
  DataTable,
  Pagination,
  Icon,
  EmptyState,
  Banner,
  Tooltip,
  ButtonGroup,
  ProgressBar,
  Frame,
  Toast,
  ContextualSaveBar
} from "@shopify/polaris";
import {
  SearchIcon,
  ExportIcon,
  ImportIcon,
  LanguageIcon,
  RefreshIcon,
  DeleteIcon,
  ViewIcon,
  EditIcon
} from "@shopify/polaris-icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useApi } from '../utils/api';

export default function TranslationEditor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const api = useApi();
  
  const [loading, setLoading] = useState(true);
  const [translations, setTranslations] = useState([]);
  const [selectedTranslation, setSelectedTranslation] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [toastProps, setToastProps] = useState({ active: false });
  const [filters, setFilters] = useState({
    status: 'all',
    language: 'all',
    resourceType: 'all',
    search: '',
    dateRange: 'all'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });


  useEffect(() => {
    loadTranslations();
  }, [filters, pagination.page]);



  const loadTranslations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });
      
      const data = await api.get(`/translations?${params}`);
      setTranslations(data.translations || []);
      setPagination(prev => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      console.error('Failed to load translations:', error);
      showToast('Failed to load translations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTranslation = (translation) => {
    setSelectedTranslation(translation);
    setEditModalOpen(true);
  };

  const handlePreviewTranslation = (translation) => {
    setSelectedTranslation(translation);
    setPreviewModalOpen(true);
  };

  const handleSaveTranslation = async (updatedTranslation) => {
    try {
      await api.put(`/translations/${updatedTranslation.id}`, updatedTranslation);
      setEditModalOpen(false);
      setSelectedTranslation(null);
      loadTranslations();
      showToast('Translation saved successfully');
    } catch (error) {
      console.error('Failed to save translation:', error);
      showToast('Failed to save translation', 'error');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedItems.length === 0) return;
    
    setBulkActionInProgress(true);
    setProgressValue(0);
    
    try {
      const total = selectedItems.length;
      let processed = 0;
      
      for (const id of selectedItems) {
        await api.post(`/translations/${id}/${action}`);
        processed++;
        setProgressValue((processed / total) * 100);
      }
      
      loadTranslations();
      setSelectedItems([]);
      showToast(`Bulk ${action} completed successfully`);
    } catch (error) {
      console.error(`Failed to perform bulk ${action}:`, error);
      showToast(`Failed to perform bulk ${action}`, 'error');
    } finally {
      setBulkActionInProgress(false);
      setProgressValue(0);
    }
  };

  const handleImport = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await api.post('/translations/import', formData);
      loadTranslations();
      showToast('Import completed successfully');
    } catch (error) {
      console.error('Failed to import translations:', error);
      showToast('Failed to import translations', 'error');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/translations/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'translations.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export translations:', error);
      showToast('Failed to export translations', 'error');
    }
  };

  const showToast = (message, error = false) => {
    setToastProps({
      active: true,
      content: message,
      error: error,
      onDismiss: () => setToastProps({ active: false })
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { status: 'attention', text: 'Pending' },
      completed: { status: 'success', text: 'Completed' },
      auto_translated: { status: 'info', text: 'Auto-translated' },
      synced: { status: 'success', text: 'Synced' },
      failed: { status: 'critical', text: 'Failed' }
    };
    const config = statusConfig[status] || { status: 'default', text: status };
    return <Badge status={config.status}>{config.text}</Badge>;
  };

  const resourceTypeLabels = {
    product: 'Product',
    page: 'Page',
    blog: 'Blog',
    article: 'Article',
    collection: 'Collection'
  };

  const languageLabels = {
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    ru: 'Russian',
    ar: 'Arabic'
  };

  const rows = translations.map((translation) => [
    <Checkbox
      checked={selectedItems.includes(translation.id)}
      onChange={() => {
        const newSelected = selectedItems.includes(translation.id)
          ? selectedItems.filter(id => id !== translation.id)
          : [...selectedItems, translation.id];
        setSelectedItems(newSelected);
      }}
    />,
    <Text variant="bodyMd" as="span" fontWeight="semibold">
      {translation.resource_title || translation.resource_id}
    </Text>,
    <Text variant="bodyMd" as="span">
      {resourceTypeLabels[translation.resource_type] || translation.resource_type}
    </Text>,
    <Text variant="bodyMd" as="span">
      {translation.field}
    </Text>,
    <Text variant="bodyMd" as="span">
      {languageLabels[translation.language] || translation.language}
    </Text>,
    <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <Text variant="bodyMd" as="span" color="subdued">
        {translation.original_text?.substring(0, 50)}...
      </Text>
    </div>,
    getStatusBadge(translation.status),
    <ButtonGroup>
      <Tooltip content="Preview">
        <Button
          icon={ViewIcon}
          onClick={() => handlePreviewTranslation(translation)}
          variant="tertiary"
          size="slim"
        />
      </Tooltip>
      <Tooltip content="Edit">
        <Button
          icon={EditIcon}
          onClick={() => handleEditTranslation(translation)}
          variant="tertiary"
          size="slim"
        />
      </Tooltip>
    </ButtonGroup>
  ]);

  const headers = [
    '',
    'Resource',
    'Type',
    'Field',
    'Language',
    'Original Text',
    'Status',
    'Actions'
  ];

  if (loading) {
    return (
      <Page title="Translation Editor">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spinner size="large" />
                <Text variant="bodyMd" as="p" style={{ marginTop: '16px' }}>
                  Loading translations...
                </Text>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '0 24px',
      minHeight: '100vh',
      backgroundColor: '#f6f6f7'
    }}>
      <Page
        title="Translation Editor"
        primaryAction={{
          content: 'Import Content',
          icon: ImportIcon,
          onAction: () => document.getElementById('importInput').click()
        }}
        secondaryActions={[
          {
            content: 'Export',
            icon: ExportIcon,
            onAction: handleExport
          }
        ]}
      >
        

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <ContextualSaveBar
            message={`${selectedItems.length} items selected`}
            saveAction={{
              content: 'Auto-translate',
              onAction: () => handleBulkAction('auto-translate')
            }}
            discardAction={{
              content: 'Cancel',
              onAction: () => setSelectedItems([])
            }}
          />
        )}

        {/* Filters */}
        <Layout.Section>
          <div style={{ marginBottom: '24px' }}>
            <Card>
            <div style={{ padding: '24px' }}>
              <BlockStack gap="loose">
                <Text variant="headingMd" as="h3">
                  Filters & Search
                </Text>
                <FormLayout>
                  <Layout>
                    <Layout.Section>
                      <TextField
                        label="Search"
                        value={filters.search}
                        onChange={(value) => setFilters(prev => ({ ...prev, search: value }))}
                        placeholder="Search translations..."
                        prefix={<Icon source={SearchIcon} />}
                        clearButton
                        onClearButtonClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                      />
                    </Layout.Section>
                    <Layout.Section oneThird>
                      <Select
                        label="Status"
                        options={[
                          { label: 'All Statuses', value: 'all' },
                          { label: 'Pending', value: 'pending' },
                          { label: 'Completed', value: 'completed' },
                          { label: 'Auto-translated', value: 'auto_translated' },
                          { label: 'Synced', value: 'synced' },
                          { label: 'Failed', value: 'failed' }
                        ]}
                        value={filters.status}
                        onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                      />
                    </Layout.Section>
                    <Layout.Section oneThird>
                      <Select
                        label="Language"
                        options={[
                          { label: 'All Languages', value: 'all' },
                          ...Object.entries(languageLabels).map(([value, label]) => ({
                            label,
                            value
                          }))
                        ]}
                        value={filters.language}
                        onChange={(value) => setFilters(prev => ({ ...prev, language: value }))}
                      />
                    </Layout.Section>
                    <Layout.Section oneThird>
                      <Select
                        label="Resource Type"
                        options={[
                          { label: 'All Types', value: 'all' },
                          ...Object.entries(resourceTypeLabels).map(([value, label]) => ({
                            label,
                            value
                          }))
                        ]}
                        value={filters.resourceType}
                        onChange={(value) => setFilters(prev => ({ ...prev, resourceType: value }))}
                      />
                    </Layout.Section>
                  </Layout>
                </FormLayout>
              </BlockStack>
            </div>
          </Card>
          </div>
        </Layout.Section>

        {/* Translations Table */}
        <Layout.Section>
          <div style={{ marginBottom: '24px' }}>
            <Card>
            <div style={{ padding: '24px 0' }}>
              {translations.length === 0 ? (
                <EmptyState
                  heading="No translations found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  action={{
                    content: 'Import Content',
                    onAction: () => document.getElementById('importInput').click()
                  }}
                >
                  <p>No translations match your current filters. Try adjusting your search criteria or import new content.</p>
                </EmptyState>
              ) : (
                <>
                  <div style={{ padding: '0 24px 16px 24px' }}>
                    <Text variant="headingMd" as="h3">
                      Translations ({translations.length})
                    </Text>
                  </div>
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text', 'text']}
                    headings={headers}
                    rows={rows}
                    hasZebraStriping
                    increasedTableDensity
                    showTotals
                  />
                  {bulkActionInProgress && (
                    <div style={{ padding: '24px' }}>
                      <ProgressBar progress={progressValue} size="small" />
                      <Text variant="bodySm" as="p" alignment="center">
                        Processing... {Math.round(progressValue)}%
                      </Text>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
          </div>
        </Layout.Section>

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <Layout.Section>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                <Pagination
                  hasPrevious={pagination.page > 1}
                  onPrevious={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  hasNext={pagination.page * pagination.limit < pagination.total}
                  onNext={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  label={`Page ${pagination.page} of ${Math.ceil(pagination.total / pagination.limit)}`}
                />
              </div>
            </Card>
          </Layout.Section>
        )}
      </Page>

      {/* Edit Modal */}
      {selectedTranslation && (
        <Modal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedTranslation(null);
          }}
          title="Edit Translation"
          primaryAction={{
            content: 'Save',
            onAction: () => handleSaveTranslation(selectedTranslation)
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => {
                setEditModalOpen(false);
                setSelectedTranslation(null);
              }
            }
          ]}
        >
          <Modal.Section>
            <BlockStack gap="loose">
              <Text variant="bodyMd" as="p" color="subdued">
                <strong>Resource:</strong> {selectedTranslation.resource_title || selectedTranslation.resource_id}
              </Text>
              <Text variant="bodyMd" as="p" color="subdued">
                <strong>Field:</strong> {selectedTranslation.field}
              </Text>
              <Text variant="bodyMd" as="p" color="subdued">
                <strong>Language:</strong> {languageLabels[selectedTranslation.language] || selectedTranslation.language}
              </Text>
              
              <TextField
                label="Original Text"
                value={selectedTranslation.original_text || ''}
                onChange={() => {}} // Read-only
                multiline={4}
                disabled
              />
              
              <TextField
                label="Translated Text"
                value={selectedTranslation.translated_text || ''}
                onChange={(value) => setSelectedTranslation(prev => ({ ...prev, translated_text: value }))}
                multiline={4}
                placeholder="Enter translation..."
                helpText="Use HTML tags to maintain formatting"
              />
              
              <Checkbox
                label="Mark as reviewed"
                checked={selectedTranslation.reviewed || false}
                onChange={(checked) => setSelectedTranslation(prev => ({ ...prev, reviewed: checked }))}
              />
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}

      {/* Preview Modal */}
      {selectedTranslation && (
        <Modal
          open={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setSelectedTranslation(null);
          }}
          title="Translation Preview"
        >
          <Modal.Section>
            <BlockStack gap="loose">
              <Card>
                <BlockStack gap="tight">
                  <Text variant="headingSm">Original Content</Text>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: selectedTranslation.original_text
                    }}
                  />
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="tight">
                  <Text variant="headingSm">Translated Content</Text>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: selectedTranslation.translated_text
                    }}
                  />
                </BlockStack>
              </Card>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}

      {/* Hidden file input for import */}
      <input
        type="file"
        id="importInput"
        accept=".csv,.xlsx"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleImport(e.target.files[0]);
          }
        }}
      />

      {toastProps.active && (
        <Toast {...toastProps} />
      )}
    </div>
  );
} 