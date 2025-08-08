import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  return await authenticate.begin(request);
} 