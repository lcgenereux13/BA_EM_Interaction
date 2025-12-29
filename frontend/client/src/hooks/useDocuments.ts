import { useQuery } from "@tanstack/react-query";

export type DocumentFile = {
  name: string;
  path: string;
  url: string;
  size: number;
  updatedAt: string;
  extension: string;
};

export type DocumentsResponse = {
  files: DocumentFile[];
  totalCount: number;
};

export function useDocuments() {
  return useQuery<DocumentsResponse>({
    queryKey: ["/api/documents"],
  });
}
