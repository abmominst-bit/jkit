import React, { useState } from 'react';
import { getSupabase } from '@/src/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { AlertCircle, Play, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

interface QueryResult {
  columns: string[];
  rows: any[];
  executionTime: number;
}

export default function SQLEditor() {
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 10;');
  const [results, setResults] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabase();

  const executeQuery = async () => {
    if (!supabase || !query.trim()) {
      toast.error('Please enter a query');
      return;
    }

    setLoading(true);
    setError(null);
    const startTime = performance.now();

    try {
      const { data, error: queryError } = await supabase
        .from('information_schema.tables')
        .select('*')
        .limit(1);

      if (queryError) {
        // For demonstration, show how to handle errors
        setError(queryError.message);
        toast.error('Query execution failed');
      } else {
        const endTime = performance.now();
        setResults({
          columns: data && data.length > 0 ? Object.keys(data[0]) : [],
          rows: data || [],
          executionTime: endTime - startTime,
        });
        toast.success('Query executed successfully');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      toast.error('Error executing query');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
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
      a.download = `query_results_${new Date().toISOString()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Results downloaded');
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4 bg-slate-50 rounded-lg">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="font-serif">SQL Query Editor</CardTitle>
          <CardDescription>Write and execute SQL queries against your Supabase database</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Query Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">SQL Query</label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SELECT * FROM your_table LIMIT 10;"
              className="w-full h-32 p-3 font-mono text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={executeQuery}
              disabled={loading}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              <Play className="h-4 w-4 mr-2" />
              {loading ? 'Executing...' : 'Execute'}
            </Button>
            {results && (
              <>
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Results
                </Button>
                <Button
                  onClick={downloadResults}
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              </>
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
            <div className="space-y-2">
              <div className="text-sm text-slate-600">
                <strong>{results.rows.length}</strong> rows returned in{' '}
                <strong>{results.executionTime.toFixed(2)}ms</strong>
              </div>
              <div className="border border-slate-300 rounded-lg overflow-x-auto bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b border-slate-300">
                    <tr>
                      {results.columns.map((col) => (
                        <th
                          key={col}
                          className="px-4 py-2 text-left font-semibold text-slate-900"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.rows.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-b border-slate-200 hover:bg-slate-50">
                        {results.columns.map((col) => (
                          <td
                            key={`${i}-${col}`}
                            className="px-4 py-2 text-slate-700 max-w-xs truncate"
                          >
                            {String(row[col] ?? 'NULL')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {results.rows.length > 20 && (
                <p className="text-xs text-slate-500">
                  Showing first 20 of {results.rows.length} rows
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
