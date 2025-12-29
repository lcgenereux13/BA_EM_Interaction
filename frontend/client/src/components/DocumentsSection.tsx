import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { DocumentFile } from "@/hooks/useDocuments";

const PAGE_SIZE = 200;

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export function DocumentsSection({
  documents,
  totalCount,
  isLoading,
  error,
}: {
  documents: DocumentFile[];
  totalCount: number;
  isLoading: boolean;
  error?: Error | null;
}) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredDocuments = useMemo(() => {
    if (!query.trim()) return documents;
    const lowerQuery = query.toLowerCase();
    return documents.filter((doc) => doc.path.toLowerCase().includes(lowerQuery));
  }, [documents, query]);

  const visibleDocuments = useMemo(() => {
    return filteredDocuments.slice(0, visibleCount);
  }, [filteredDocuments, visibleCount]);

  const canLoadMore = visibleCount < filteredDocuments.length;

  return (
    <div className="border border-border rounded-md p-4" style={{ height: "30%", overflowY: "auto" }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-md font-medium">Documents</h3>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Loading files..." : `${totalCount} files available`}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="text-xs">
          <a href="/api/documents/download">
            <i className="ri-download-cloud-line mr-1"></i>
            Download all
          </a>
        </Button>
      </div>

      <Input
        placeholder="Search documents"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setVisibleCount(PAGE_SIZE);
        }}
        className="mb-3 h-8 text-xs"
      />

      {error && (
        <div className="text-xs text-destructive flex items-center gap-2">
          <i className="ri-error-warning-line"></i>
          <span>Unable to load documents.</span>
        </div>
      )}

      {!error && !isLoading && filteredDocuments.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-xs">
          <i className="ri-folder-open-line text-xl mb-2"></i>
          <p>No documents found. Add files to the documents folder to share them here.</p>
        </div>
      )}

      {!error && (isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-6 bg-muted/60 rounded"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {visibleDocuments.map((doc) => (
            <div key={doc.path} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <i className="ri-file-text-line text-muted-foreground"></i>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-primary hover:underline"
                >
                  {doc.path}
                </a>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground shrink-0">
                <span>{formatBytes(doc.size)}</span>
                <span>{formatDate(doc.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      ))}

      {canLoadMore && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            Load more
          </Button>
        </div>
      )}

      {filteredDocuments.length > 0 && (
        <p className="text-[11px] text-muted-foreground mt-3 text-right">
          Showing {Math.min(visibleDocuments.length, filteredDocuments.length)} of {filteredDocuments.length} matching files
        </p>
      )}
    </div>
  );
}
