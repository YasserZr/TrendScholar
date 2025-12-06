// src/app/admin/reset-papers/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ResetPapersPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleReset = async () => {
    if (!confirm('⚠️ This will delete ALL papers, summaries, chat messages, and saved papers. Are you sure?')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/reset-papers', {
        method: 'POST',
      });

      const data = await response.json();
      
      // Log to console for debugging
      console.log('Response status:', response.status);
      console.log('Response data:', data);
      
      setResult(data);
    } catch (error) {
      console.error('Fetch error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-12">
      <Card>
        <CardHeader>
          <CardTitle>Reset Papers Database</CardTitle>
          <CardDescription>
            Delete all papers and related data to start fresh with dynamic summaries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h3 className="font-medium text-yellow-900 mb-2">⚠️ Warning</h3>
            <p className="text-sm text-yellow-800">
              This will permanently delete:
            </p>
            <ul className="list-disc list-inside text-sm text-yellow-800 mt-2">
              <li>All papers from the database</li>
              <li>All AI-generated summaries (old cached ones)</li>
              <li>All chat messages</li>
              <li>All saved papers</li>
            </ul>
          </div>

          <Button
            onClick={handleReset}
            disabled={loading}
            variant="destructive"
            className="w-full"
          >
            {loading ? 'Deleting...' : '🗑️ Delete All Papers'}
          </Button>

          {result && (
            <div
              className={`rounded-md p-4 ${
                result.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {result.success ? (
                <>
                  <h3 className="font-medium text-green-900 mb-2">
                    ✅ Success!
                  </h3>
                  <p className="text-sm text-green-800 mb-2">
                    {result.message}
                  </p>
                  <div className="text-sm text-green-800 space-y-1">
                    <p><strong>Deleted:</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      <li>{result.deleted.papers} papers</li>
                      <li>{result.deleted.summaries} summaries</li>
                      <li>{result.deleted.chatMessages} chat messages</li>
                      <li>{result.deleted.savedPapers} saved papers</li>
                    </ul>
                  </div>
                  <div className="mt-4 pt-4 border-t border-green-300">
                    <p className="text-sm font-medium text-green-900 mb-2">
                      Next Steps:
                    </p>
                    <ol className="list-decimal list-inside text-sm text-green-800 space-y-1">
                      {result.nextSteps.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-medium text-red-900 mb-2">❌ Error</h3>
                  <p className="text-sm text-red-800">{result.error}</p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
