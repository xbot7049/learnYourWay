import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SourceMetadata {
  id: string;
  title: string;
  type: string;
  content: string;
  summary: string;
  url: string;
}

export const useSourceMetadata = (notebookId?: string, sourceIds?: string[]) => {
  const { user } = useAuth();

  const {
    data: sourceMetadataMap,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['source-metadata', notebookId, sourceIds],
    queryFn: async () => {
      if (!notebookId || !sourceIds || sourceIds.length === 0) {
        return new Map<string, SourceMetadata>();
      }

      const { data, error } = await supabase
        .from('sources')
        .select('id, title, type, content, summary, url')
        .eq('notebook_id', notebookId)
        .in('id', sourceIds);

      if (error) throw error;

      const metadataMap = new Map<string, SourceMetadata>();
      data?.forEach((source) => {
        metadataMap.set(source.id, {
          id: source.id,
          title: source.title || 'Untitled Source',
          type: source.type || 'text',
          content: source.content || '',
          summary: source.summary || '',
          url: source.url || ''
        });
      });

      return metadataMap;
    },
    enabled: !!notebookId && !!user && !!sourceIds && sourceIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return {
    sourceMetadataMap,
    isLoading,
    error,
  };
};
