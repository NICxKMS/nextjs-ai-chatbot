"use server";

import { unstable_cache as cache } from "next/cache";
import { getSuggestionsByDocumentId } from "@/lib/db/queries";

const getSuggestionsCached = cache(
  (documentId: string) =>
    getSuggestionsByDocumentId({ documentId }).then(
      (suggestions) => suggestions ?? []
    ),
  ["artifact-suggestions"],
  {
    revalidate: 60,
  }
);

export async function getSuggestions({ documentId }: { documentId: string }) {
  return await getSuggestionsCached(documentId);
}
