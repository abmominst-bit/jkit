import React, { useState, useRef, useEffect } from 'react';
import { getSupabase } from '@/src/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Play, Copy, Download, Database } from 'lucide-react';
import { toast } from 'sonner';
import { getTables, getTableSchema, getTableData } from '@/src/lib/sqlQueryUtils';

interface QueryResult {
  columns: string[];
  rows: any[];
  executionTime: number;
  rowCount: number;
}

interface TableInfo {
  name: string;
  columns: string[];
}

export default function AdvancedSQLEditor() {
  const [query, setQuery] = useState('-- Write your SQL query here\nSELECT * FROM users LIMIT 10;');
  const [results, setResults] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [showSchema, setShowSchema] = useState(false);
  const supabase = getSupabase();

  // Load available tables on mount
  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const tableNames = await getTables();
      const tableInfos: TableInfo[] = [];

      for (const tableName of tableNames) {
        const columns = await getTableSchema(tableName);
        tableInfos.push({
          name: tableName,
          columns: columns.map(c => c.column_name),
        });
      }

      setTables(tableInfos);
    } catch (err) {
      console.error('Error loading tables:', err);
    }
  };

  const executeQuery = async () => {
    if (!supabase || !query.trim()) {
      toast.error('Please enter a query');
      return;
    }

    setLoading(true);
    setError(null);
    const startTime = performance.now();

    try {
      // Parse the first table name from the query for demo purposes
      const tableMatch = query.match(/FROM\s+(\w+)/i);
      if (!tableMatch) {
        throw new Error('Could not find table name in query');
      }

      const tableName = tableMatch[1];
      const data = await getTableData(tableName, { limit: 100 });

      const endTime = performance.now();
      setResults({
        columns: data.length > 0 ? Object.keys(data[0]) : [],
        rows: data,
        executionTime: endTime - startTime,
        rowCount: data.length,
      });
      toast.success(`Query executed: ${data.length} rows returned`);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      toast.error('Query execution failed');
    } finally {
      setLoading(false);
    }
  };

  const copyQuery = () => {
    navigator.clipboard.writeText(query);
    toast.success('Query copied to clipboard');
  };

  const copyResults = () => {
    if (results) {
      const csv = [
        results.columns.join(','),
        ...results.rows.map(row =>
          results.columns.map(col => {
            const val = row[col];
            return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
          }).join(',')
        ),
      ].join('\n');
      navigator.clipboard.writeText(csv);
      toast.success('Results copied to clipboard');
    }
  };

  const downloadResults = () => {
    if (results) {
      const csv = [
        results.columns.join(','),
        ...results.rows.map(row =>
          results.columns.map(col => {
            const val = row[col];
            return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
          }).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query_results_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Results downloaded');
    }
  };

  const insertQueryTemplate = (template: string) => {
    setQuery(template);
    setResults(null);
  };

  return (
    <div className="w-full space-y-4 p-4">
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-serif flex items-center gap-2">
                <Database className="h-5 w-5" />
                Advanced SQL Editor
              </CardTitle>
              <CardDescription>Write queries against your Supabase database</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSchema(!showSchema)}
              className="border-slate-300"
            >
              {showSchema ? 'Hide' : 'Show'} Schema
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Main Editor */}
            <div className="lg:col-span-3 space-y-2">
              <label className="text-sm font-medium text-slate-700">SQL Query</label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SELECT * FROM your_table LIMIT 10;"
                className="w-full h-48 p-3 font-mono text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
              />
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={executeQuery}
                  disabled={loading}
                  className="bg-slate-900 text-white hover:bg-slate-800"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {loading ? 'Executing...' : 'Execute'}
                </Button>
                <Button
                  onClick={copyQuery}
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Query
                </Button>
              </div>
            </div>

            {/* Schema Panel */}
            {showSchema && (
              <div className="lg:col-span-1 space-y-2">
                <label className="text-sm font-medium text-slate-700">Database Schema</label>
                <div className="border border-slate-300 rounded-lg p-2 bg-white max-h-96 overflow-y-auto text-xs">
                  {tables.length === 0 ? (
                    <p className="text-slate-500">Loading tables...</p>
                  ) : (
                    <div className="space-y-2">
                      {tables.map((table) => (
                        <div key={table.name} className="pb-2 border-b border-slate-200 last:border-0">
                          <button
                            onClick={() =>
                              insertQueryTemplate(`SELECT * FROM ${table.name} LIMIT 10;`)
                            }
                            className="font-semibold text-blue-600 hover:text-blue-800 text-left w-full"
                          >
                            {table.name}
                          </button>
                          <div className="text-slate-600 pl-2 space-y-0.5">
                            {table.columns.map((col) => (
                              <div key={col} className="truncate hover:text-clip">
                                • {col}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}

          {/* Results Display */}
          {results && (
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  <strong>{results.rowCount}</strong> rows returned in{' '}
                  <strong>{results.executionTime.toFixed(2)}ms</strong>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={copyResults}
                    variant="outline"
                    size="sm"
                    className="border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    onClick={downloadResults}
                    variant="outline"
                    size="sm"
                    className="border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </div>

              <div className="border border-slate-300 rounded-lg overflow-auto max-h-96 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b border-slate-300 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-slate-900 text-center w-10">
                        #
                      </th>
                      {results.columns.map((col) => (
                        <th
                          key={col}
                          className="px-4 py-2 text-left font-semibold text-slate-900 min-w-max"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.rows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-500 text-center font-mono text-xs">
                          {i + 1}
                        </td>
                        {results.columns.map((col) => (
                          <td
                            key={`${i}-${col}`}
                            className="px-4 py-2 text-slate-700 max-w-xs truncate"
                            title={String(row[col] ?? 'NULL')}
                          >
                            {String(row[col] ?? 'NULL')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {results.rowCount > 50 && (
                <p className="text-xs text-slate-500">
                  Showing first 50 of {results.rowCount} rows
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
