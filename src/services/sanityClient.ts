import { createClient } from "@sanity/client";

const sanityClient = createClient({
  projectId: "vjx6z54y",
  dataset: "markets",
  apiVersion: "2023-01-01",
  useCdn: true,
});

export default sanityClient; 