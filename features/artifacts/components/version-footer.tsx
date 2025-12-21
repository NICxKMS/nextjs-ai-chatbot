"use client";

import { isAfter } from "date-fns";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { Loader } from "@/components/ai-elements/loader";
import { Button } from "@/components/ui/button";
import { motion } from "@/lib/motion";
import { useWindowSize } from "@/shared/hooks";
import { useArtifact } from "../hooks";

type Document = {
    id: string;
    title: string;
    content: string | null;
    kind: string;
    createdAt: Date;
    userId: string;
};

type VersionFooterProps = {
    handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void;
    documents: Document[] | undefined;
    currentVersionIndex: number;
};

function getDocumentTimestampByIndex(
    documents: Document[],
    index: number
): string {
    if (!documents || !documents[index]) {
        return "";
    }
    return documents[index].createdAt.toISOString();
}

export const VersionFooter = ({
    handleVersionChange,
    documents,
    currentVersionIndex,
}: VersionFooterProps) => {
    const { artifact } = useArtifact();
    const { isMobile } = useWindowSize();

    const { mutate } = useSWRConfig();
    const [isMutating, setIsMutating] = useState(false);

    if (!documents) {
        return null;
    }

    return (
        <motion.div
            animate={{ y: 0 }}
            className="absolute bottom-0 z-50 flex w-full flex-col justify-between gap-4 border-t bg-background p-4 lg:flex-row"
            exit={{ y: isMobile ? 200 : 77 }}
            initial={{ y: isMobile ? 200 : 77 }}
            transition={{ type: "spring", stiffness: 140, damping: 20 }}
        >
            <div>
                <div>You are viewing a previous version</div>
                <div className="text-muted-foreground text-sm">
                    Restore this version to make edits
                </div>
            </div>

            <div className="flex flex-row gap-4">
                <Button
                    disabled={isMutating}
                    onClick={async () => {
                        setIsMutating(true);

                        mutate(
                            `/api/document?id=${artifact.documentId}`,
                            await fetch(
                                `/api/document?id=${artifact.documentId}&timestamp=${getDocumentTimestampByIndex(
                                    documents,
                                    currentVersionIndex
                                )}`,
                                {
                                    method: "DELETE",
                                }
                            ),
                            {
                                optimisticData: documents
                                    ? [
                                          ...documents.filter(
                                              (document) =>
                                                  !isAfter(
                                                      new Date(
                                                          document.createdAt
                                                      ),
                                                      new Date(
                                                          getDocumentTimestampByIndex(
                                                              documents,
                                                              currentVersionIndex
                                                          )
                                                      )
                                                  )
                                          ),
                                      ]
                                    : [],
                            }
                        );
                    }}
                >
                    <div>Restore this version</div>
                    {isMutating && <Loader size={16} />}
                </Button>
                <Button
                    onClick={() => {
                        handleVersionChange("latest");
                    }}
                    variant="outline"
                >
                    Back to latest version
                </Button>
            </div>
        </motion.div>
    );
};
