import { useState, useEffect, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  TextField,
  Select,
  DataTable,
  Banner,
  Modal,
  FormLayout,
  Spinner,
  Tooltip,
  ButtonGroup,
  Tag,
  Autocomplete,
  Frame,
  Toast,
  ContextualSaveBar,
  DropZone,
  Checkbox,
  Tabs,
  Badge,
  Icon,
  EmptyState
} from "@shopify/polaris";
import {
  PlusIcon,
  DeleteIcon,
  ImportIcon,
  ExportIcon,
  SearchIcon,
  EditIcon,
  SortIcon
} from "@shopify/polaris-icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useApi } from '../utils/api';

export default function Glossary() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const api = useApi();
  
  const [loading, setLoading] = useState(true);
  const [glossary, setGlossary] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newTerm, setNewTerm] = useState({
    original: '',
    translated: '',
    language: 'es',
    category: '',
    notes: '',
    tags: []
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [message, setMessage] = useState(null);
  const [toastProps, setToastProps] = useState({ active: false });
  const [searchValue, setSearchValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [categorySuggestions, setCategorySuggestions] = useState([]);
  const [sortOrder, setSortOrder] = useState({ field: 'original', direction: 'asc' });
  const [selectedTab, setSelectedTab] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    languages: {},
    categories: {}
  });

  useEffect(() => {
    loadGlossary();
    loadStats();
    loadSuggestions();
  }, []);

  const loadStats = async () => {
    try {
      // Calculate stats from the actual glossary data
      const languages = {};
      const categories = {};
      
      glossary.forEach(term => {
        // Count by language (default to Spanish since backend doesn't store language)
        const lang = 'es';
        languages[lang] = (languages[lang] || 0) + 1;
        
        // Count by category (use context as category)
        const category = term.context || 'General';
        categories[category] = (categories[category] || 0) + 1;
      });
      
      setStats({
        total: glossary.length,
        languages,
        categories
      });
    } catch (error) {
      console.error('Failed to load glossary stats:', error);
      showToast('Failed to load statistics', true);
    }
  };

  const loadSuggestions = async () => {
    try {
      // For now, return empty suggestions since the backend doesn't have suggestions endpoint
      setTagSuggestions([]);
      setCategorySuggestions([]);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const loadGlossary = async () => {
    setLoading(true);
    try {
      const data = await api.get('/settings/1/glossary');
      setGlossary(data.glossary || []);
    } catch (error) {
      console.error('Failed to load glossary:', error);
      showToast('Failed to load glossary', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGlossary();
  }, [searchValue, selectedCategory, selectedTags, sortOrder]);

  useEffect(() => {
    loadStats();
  }, [glossary]);

  const handleAddTerm = async () => {
    if (!newTerm.original || !newTerm.translated) {
      showToast('Please fill in both original and translated terms', true);
      return;
    }

    try {
      const response = await api.post('/settings/1/glossary', {
        term: newTerm.original,
        translation: newTerm.translated,
        context: newTerm.notes
      });
      setGlossary(prev => [...prev, response.term]);
      setNewTerm({
        original: '',
        translated: '',
        language: 'es',
        category: '',
        notes: '',
        tags: []
      });
      setShowAddModal(false);
      showToast('Glossary term added successfully');
      loadStats();
    } catch (error) {
      console.error('Failed to add glossary term:', error);
      showToast('Failed to add glossary term', true);
    }
  };

  const handleDeleteTerms = async (termIds) => {
    try {
      // Delete terms one by one since bulk delete doesn't exist
      for (const termId of termIds) {
        await api.delete(`/settings/1/glossary/${termId}`);
      }
      setGlossary(prev => prev.filter(term => !termIds.includes(term.id)));
      setSelectedItems([]);
      showToast('Terms deleted successfully');
      loadStats();
    } catch (error) {
      console.error('Failed to delete terms:', error);
      showToast('Failed to delete terms', true);
    }
  };

  const handleImport = async (files) => {
    try {
      // For now, show a message that import is not implemented
      showToast('Import functionality will be implemented soon', false);
      setShowImportModal(false);
    } catch (error) {
      console.error('Failed to import terms:', error);
      showToast('Failed to import terms', true);
    }
  };

  const handleExport = async () => {
    try {
      // Create CSV content manually since export endpoint doesn't exist
      const csvContent = 'Term,Translation,Context\n' + 
        glossary.map(term => 
          `"${term.term}","${term.translation}","${term.context || ''}"`
        ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'glossary.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showToast('Export completed successfully');
    } catch (error) {
      console.error('Failed to export terms:', error);
      showToast('Failed to export terms', true);
    }
  };

  const showToast = (content, error = false) => {
    setToastProps({
      content,
      error,
      active: true,
      onDismiss: () => setToastProps({ active: false })
    });
  };

  const handleSort = (field) => {
    setSortOrder(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const tabs = [
    {
      id: 'all',
      content: 'All Terms',
      accessibilityLabel: 'All terms',
      panelID: 'all-terms-content'
    },
    {
      id: 'categories',
      content: 'Categories',
      accessibilityLabel: 'Categories',
      panelID: 'categories-content'
    },
    {
      id: 'languages',
      content: 'Languages',
      accessibilityLabel: 'Languages',
      panelID: 'languages-content'
    }
  ];

  const languageOptions = [
    { label: 'Spanish', value: 'es' },
    { label: 'French', value: 'fr' },
    { label: 'German', value: 'de' },
    { label: 'Italian', value: 'it' },
    { label: 'Portuguese', value: 'pt' },
    { label: 'Japanese', value: 'ja' },
    { label: 'Korean', value: 'ko' },
    { label: 'Chinese', value: 'zh' },
    { label: 'Russian', value: 'ru' },
    { label: 'Arabic', value: 'ar' }
  ];

  const rows = glossary.map((term) => [
    <Checkbox
      checked={selectedItems.includes(term.id)}
      onChange={() => {
        const newSelected = selectedItems.includes(term.id)
          ? selectedItems.filter(id => id !== term.id)
          : [...selectedItems, term.id];
        setSelectedItems(newSelected);
      }}
    />,
    <Text variant="bodyMd" as="span" fontWeight="semibold">
      {term.term}
    </Text>,
    <Text variant="bodyMd" as="span">
      {term.translation}
    </Text>,
    <Text variant="bodyMd" as="span">
      {languageOptions.find(l => l.value === term.language)?.label || 'Spanish'}
    </Text>,
    <Text variant="bodyMd" as="span">
      {term.context || 'General'}
    </Text>,
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {/* Tags not supported in backend yet */}
    </div>,
    <ButtonGroup>
      <Tooltip content="Edit">
        <Button
          icon={EditIcon}
          onClick={() => {
            setNewTerm({
              ...term,
              original: term.term,
              translated: term.translation,
              notes: term.context
            });
            setShowAddModal(true);
          }}
          variant="tertiary"
          size="slim"
        />
      </Tooltip>
      <Tooltip content="Delete">
        <Button
          icon={DeleteIcon}
          onClick={() => handleDeleteTerms([term.id])}
          variant="tertiary"
          size="slim"
        />
      </Tooltip>
    </ButtonGroup>
  ]);

  const headers = [
    '',
    <Button
      plain
      icon={SortIcon}
      onClick={() => handleSort('original')}
    >
      Original Term
    </Button>,
    <Button
      plain
      icon={SortIcon}
      onClick={() => handleSort('translated')}
    >
      Translated Term
    </Button>,
    'Language',
    <Button
      plain
      icon={SortIcon}
      onClick={() => handleSort('category')}
    >
      Category
    </Button>,
    'Tags',
    'Actions'
  ];

  if (loading) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spinner size="large" />
                <Text variant="bodyMd" as="p" style={{ marginTop: '16px' }}>
                  Loading glossary...
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
        title="Translation Glossary"
        primaryAction={{
          content: 'Add Term',
          icon: PlusIcon,
          onAction: () => setShowAddModal(true)
        }}
        secondaryActions={[
          {
            content: 'Import',
            icon: ImportIcon,
            onAction: () => setShowImportModal(true)
          },
          {
            content: 'Export',
            icon: ExportIcon,
            onAction: handleExport
          }
        ]}
      >
        {selectedItems.length > 0 && (
          <ContextualSaveBar
            message={`${selectedItems.length} items selected`}
            saveAction={{
              content: 'Delete Selected',
              onAction: () => handleDeleteTerms(selectedItems),
              destructive: true
            }}
            discardAction={{
              content: 'Cancel',
              onAction: () => setSelectedItems([])
            }}
          />
        )}

        <Layout>
          {/* Statistics */}
          <Layout.Section>
            <div style={{ marginBottom: '24px' }}>
              <Card>
                <BlockStack gap="loose">
                  <Text variant="headingMd" as="h3">Glossary Statistics</Text>
                  <Layout>
                    <Layout.Section oneThird>
                      <div style={{ textAlign: 'center', padding: '16px' }}>
                        <Text variant="headingLg" as="h2">{stats.total}</Text>
                        <Text variant="bodyMd" color="subdued">Total Terms</Text>
                      </div>
                    </Layout.Section>
                    <Layout.Section oneThird>
                      <div style={{ textAlign: 'center', padding: '16px' }}>
                        <Text variant="headingLg" as="h2" color="success">
                          {Object.keys(stats.languages || {}).length}
                        </Text>
                        <Text variant="bodyMd" color="subdued">Languages</Text>
                      </div>
                    </Layout.Section>
                    <Layout.Section oneThird>
                      <div style={{ textAlign: 'center', padding: '16px' }}>
                        <Text variant="headingLg" as="h2" color="warning">
                          {Object.keys(stats.categories || {}).length}
                        </Text>
                        <Text variant="bodyMd" color="subdued">Categories</Text>
                      </div>
                    </Layout.Section>
                  </Layout>
                </BlockStack>
              </Card>
            </div>
          </Layout.Section>

          {/* Filters */}
          <Layout.Section>
            <div style={{ marginBottom: '24px' }}>
              <Card>
                <div style={{ padding: '24px' }}>
                  <BlockStack gap="loose">
                    <Text variant="headingMd" as="h3">Filters & Search</Text>
                    <FormLayout>
                      <Layout>
                        <Layout.Section>
                          <TextField
                            label="Search"
                            value={searchValue}
                            onChange={setSearchValue}
                            placeholder="Search terms..."
                            prefix={<Icon source={SearchIcon} />}
                            clearButton
                            onClearButtonClick={() => setSearchValue('')}
                          />
                        </Layout.Section>
                        <Layout.Section oneThird>
                          <Select
                            label="Category"
                            options={[
                              { label: 'All Categories', value: 'all' },
                              ...categorySuggestions.map(cat => ({
                                label: cat,
                                value: cat
                              }))
                            ]}
                            value={selectedCategory}
                            onChange={setSelectedCategory}
                          />
                        </Layout.Section>
                        <Layout.Section oneThird>
                          <Autocomplete
                            allowMultiple
                            options={tagSuggestions.map(tag => ({ label: tag, value: tag }))}
                            selected={selectedTags}
                            textField={
                              <Autocomplete.TextField
                                label="Tags"
                                placeholder="Search tags"
                              />
                            }
                            onSelect={setSelectedTags}
                          />
                        </Layout.Section>
                      </Layout>
                    </FormLayout>
                  </BlockStack>
                </div>
              </Card>
            </div>
          </Layout.Section>

          {/* Glossary Table */}
          <Layout.Section>
            <div style={{ marginBottom: '24px' }}>
              <Card>
                <div style={{ padding: '24px 0' }}>
                  <div style={{ padding: '0 24px 16px 24px' }}>
                    <Text variant="headingMd" as="h3">
                      Glossary Terms ({glossary.length})
                    </Text>
                  </div>
                  {glossary.length === 0 ? (
                    <EmptyState
                      heading="No terms found"
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                      action={{
                        content: 'Add Term',
                        onAction: () => setShowAddModal(true)
                      }}
                    >
                      <p>No glossary terms match your current filters. Try adjusting your search criteria or add new terms.</p>
                    </EmptyState>
                  ) : (
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
                      headings={headers}
                      rows={rows}
                      hasZebraStriping
                      increasedTableDensity
                      showTotals
                    />
                  )}
                </div>
              </Card>
            </div>
          </Layout.Section>
        </Layout>

        {/* Add/Edit Term Modal */}
        <Modal
          open={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setNewTerm({
              original: '',
              translated: '',
              language: 'es',
              category: '',
              notes: '',
              tags: []
            });
          }}
          title={newTerm.id ? 'Edit Term' : 'Add Term'}
          primaryAction={{
            content: newTerm.id ? 'Save' : 'Add',
            onAction: handleAddTerm
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => {
                setShowAddModal(false);
                setNewTerm({
                  original: '',
                  translated: '',
                  language: 'es',
                  category: '',
                  notes: '',
                  tags: []
                });
              }
            }
          ]}
        >
          <Modal.Section>
            <FormLayout>
              <TextField
                label="Original Term"
                value={newTerm.original}
                onChange={(value) => setNewTerm({ ...newTerm, original: value })}
                autoComplete="off"
              />
              <TextField
                label="Translated Term"
                value={newTerm.translated}
                onChange={(value) => setNewTerm({ ...newTerm, translated: value })}
                autoComplete="off"
              />
              <Select
                label="Language"
                options={languageOptions}
                value={newTerm.language}
                onChange={(value) => setNewTerm({ ...newTerm, language: value })}
              />
              <Autocomplete
                label="Category"
                options={categorySuggestions.map(cat => ({ label: cat, value: cat }))}
                selected={newTerm.category ? [newTerm.category] : []}
                onSelect={(selected) => setNewTerm({ ...newTerm, category: selected[0] || '' })}
                allowMultiple={false}
              />
              <Autocomplete
                allowMultiple
                label="Tags"
                options={tagSuggestions.map(tag => ({ label: tag, value: tag }))}
                selected={newTerm.tags}
                onSelect={(selected) => setNewTerm({ ...newTerm, tags: selected })}
              />
              <TextField
                label="Notes"
                value={newTerm.notes}
                onChange={(value) => setNewTerm({ ...newTerm, notes: value })}
                multiline={3}
                placeholder="Add any additional context or usage notes..."
              />
            </FormLayout>
          </Modal.Section>
        </Modal>

        {/* Import Modal */}
        <Modal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Import Glossary Terms"
          primaryAction={{
            content: 'Import',
            onAction: () => document.getElementById('fileInput').click()
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setShowImportModal(false)
            }
          ]}
        >
          <Modal.Section>
            <BlockStack gap="loose">
              <Text>
                Upload a CSV file containing your glossary terms. The file should have the following columns:
              </Text>
              <ul style={{ listStyleType: 'disc', marginLeft: '2rem' }}>
                <li>original_term</li>
                <li>translated_term</li>
                <li>language</li>
                <li>category (optional)</li>
                <li>tags (optional, comma-separated)</li>
                <li>notes (optional)</li>
              </ul>
              <div style={{ marginTop: '1rem' }}>
                <DropZone
                  accept=".csv"
                  onDrop={([file]) => handleImport([file])}
                >
                  <DropZone.FileUpload />
                </DropZone>
              </div>
            </BlockStack>
          </Modal.Section>
        </Modal>

        {toastProps.active && (
          <Toast {...toastProps} />
        )}
      </Page>
    </div>
  );
} 