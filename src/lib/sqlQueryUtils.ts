import { getSupabase } from '@/src/lib/supabase';

export interface TableSchema {
  table_name: string;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

/**
 * Get all tables in the current database
 */
export const getTables = async (): Promise<string[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (error) throw error;
    return data?.map((t: any) => t.table_name) || [];
  } catch (err) {
    console.error('Error fetching tables:', err);
    return [];
  }
};

/**
 * Get column information for a specific table
 */
export const getTableSchema = async (tableName: string): Promise<ColumnInfo[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', tableName)
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching table schema:', err);
    return [];
  }
};

/**
 * Execute a raw SQL query (limited to SELECT)
 * For security, this should only allow SELECT queries in production
 */
export const executeRawQuery = async (query: string) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not initialized');

  // Basic validation - only allow SELECT queries
  const trimmedQuery = query.trim().toUpperCase();
  if (!trimmedQuery.startsWith('SELECT')) {
    throw new Error('Only SELECT queries are allowed');
  }

  try {
    // Note: Direct raw SQL execution is limited in Supabase JS client
    // This is a workaround using RPC or edge functions
    // For production, create a Supabase RPC function or Edge Function
    throw new Error('Raw SQL execution requires a Supabase RPC function or Edge Function');
  } catch (err: any) {
    console.error('Query execution error:', err);
    throw err;
  }
};

/**
 * Get data from a table with filters
 */
export const getTableData = async (
  tableName: string,
  options?: {
    limit?: number;
    offset?: number;
    filters?: Record<string, any>;
    orderBy?: string;
  }
) => {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    let query = supabase.from(tableName).select('*');

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1);
    }
    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    if (options?.orderBy) {
      const [column, direction] = options.orderBy.split(':');
      query = query.order(column, { ascending: direction !== 'desc' });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching table data:', err);
    return [];
  }
};

/**
 * Insert a row into a table
 */
export const insertRow = async (tableName: string, data: Record<string, any>) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not initialized');

  const { data: result, error } = await supabase
    .from(tableName)
    .insert([data])
    .select();

  if (error) throw error;
  return result;
};

/**
 * Update rows in a table
 */
export const updateRows = async (
  tableName: string,
  updates: Record<string, any>,
  filters: Record<string, any>
) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not initialized');

  let query = supabase.from(tableName).update(updates);

  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  const { data, error } = await query.select();
  if (error) throw error;
  return data;
};

/**
 * Delete rows from a table
 */
export const deleteRows = async (
  tableName: string,
  filters: Record<string, any>
) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not initialized');

  let query = supabase.from(tableName).delete();

  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  const { error } = await query;
  if (error) throw error;
};
