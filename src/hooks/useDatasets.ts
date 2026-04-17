import { useQuery } from '@tanstack/react-query';
import { datasetApi } from '@/lib/api';

export function useDatasets() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => datasetApi.getDatasets(),
  });

  return {
    datasets: data?.datasets || [],
    isLoading,
    error,
  };
}

export function useDatasetTables(datasetId: string | null | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['datasetTables', datasetId],
    queryFn: () => datasetApi.getTables(datasetId!),
    enabled: !!datasetId,
  });

  return {
    tables: data?.tables || [],
    isLoading,
    error,
  };
}

export function useTableColumns(datasetId: string | null | undefined, tableId: string | null | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tableColumns', datasetId, tableId],
    queryFn: () => datasetApi.getTableColumns(datasetId!, tableId!),
    enabled: !!datasetId && !!tableId,
  });

  return {
    columns: data?.columns || [],
    isLoading,
    error,
  };
}

