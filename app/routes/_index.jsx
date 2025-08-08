import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  LegacyCard,
  Button,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Icon,
} from "@shopify/polaris";
import { authenticate } from "../../shopify.server";
import { TranslationIcon, GlobeIcon, SettingsIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  // Get basic shop info
  const response = await admin.graphql(
    `query {
      shop {
        name
        myshopifyDomain
        plan {
          displayName
        }
      }
    }`
  );
  
  const {
    data: { shop },
  } = await response.json();

  return json({ shop });
};

export default function Index() {
  const { shop } = useLoaderData();

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <LegacyCard>
            <BlockStack gap="500">
              <InlineStack align="space-between">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Welcome to Translify
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Translate your Shopify store into multiple languages automatically
                  </Text>
                </BlockStack>
                <Badge tone="success">Active</Badge>
              </InlineStack>
            </BlockStack>
          </LegacyCard>
        </Layout.Section>

        <Layout.Section>
          <BlockStack gap="500">
            <Text as="h3" variant="headingMd">
              Quick Actions
            </Text>
            <InlineStack gap="400" wrap={false}>
              <Button
                variant="primary"
                icon={TranslationIcon}
                url="/app/translations"
              >
                Manage Translations
              </Button>
              <Button
                variant="secondary"
                icon={GlobeIcon}
                url="/app/settings"
              >
                Language Settings
              </Button>
              <Button
                variant="secondary"
                icon={SettingsIcon}
                url="/app/configuration"
              >
                App Configuration
              </Button>
            </InlineStack>
          </BlockStack>
        </Layout.Section>

        <Layout.Section>
          <BlockStack gap="500">
            <Text as="h3" variant="headingMd">
              Store Information
            </Text>
            <LegacyCard>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd">
                    Store Name
                  </Text>
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    {shop.name}
                  </Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd">
                    Domain
                  </Text>
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    {shop.myshopifyDomain}
                  </Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd">
                    Plan
                  </Text>
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    {shop.plan.displayName}
                  </Text>
                </InlineStack>
              </BlockStack>
            </LegacyCard>
          </BlockStack>
        </Layout.Section>

        <Layout.Section>
          <BlockStack gap="500">
            <Text as="h3" variant="headingMd">
              Features
            </Text>
            <InlineStack gap="400" wrap>
              <LegacyCard>
                <BlockStack gap="300">
                  <Icon source={TranslationIcon} tone="base" />
                  <Text as="h4" variant="headingSm">
                    Product Translation
                  </Text>
                  <Text as="p" variant="bodySm">
                    Automatically translate product titles, descriptions, and content
                  </Text>
                </BlockStack>
              </LegacyCard>
              
              <LegacyCard>
                <BlockStack gap="300">
                  <Icon source={GlobeIcon} tone="base" />
                  <Text as="h4" variant="headingSm">
                    Language Switcher
                  </Text>
                  <Text as="p" variant="bodySm">
                    Add a language switcher to your storefront
                  </Text>
                </BlockStack>
              </LegacyCard>
              
              <LegacyCard>
                <BlockStack gap="300">
                  <Icon source={SettingsIcon} tone="base" />
                  <Text as="h4" variant="headingSm">
                    Smart Caching
                  </Text>
                  <Text as="p" variant="bodySm">
                    Intelligent caching to improve performance and reduce costs
                  </Text>
                </BlockStack>
              </LegacyCard>
            </InlineStack>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 