import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportData() {
  const [loading, setLoading] = useState<string | null>(null);

  const triggerDownload = async (url: string, filename: string) => {
    setLoading(filename);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (e) {
      toast.error('Export failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const dateSuffix = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Data Export
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => triggerDownload('/api/export?format=json', `financial-data-${dateSuffix}.json`)}
            disabled={loading === `financial-data-${dateSuffix}.json`}
          >
            <FileJson className="h-4 w-4 mr-2" />
            {loading === `financial-data-${dateSuffix}.json` ? 'Exporting…' : 'Export JSON (All)'}
          </Button>
          <Button
            variant="outline"
            onClick={() => triggerDownload('/api/export?format=csv&type=transactions', `transactions-${dateSuffix}.csv`)}
            disabled={loading === `transactions-${dateSuffix}.csv`}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {loading === `transactions-${dateSuffix}.csv` ? 'Exporting…' : 'Export Transactions CSV'}
          </Button>
          <Button
            variant="outline"
            onClick={() => triggerDownload('/api/export?format=csv&type=networth', `networth-${dateSuffix}.csv`)}
            disabled={loading === `networth-${dateSuffix}.csv`}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {loading === `networth-${dateSuffix}.csv` ? 'Exporting…' : 'Export Networth CSV'}
          </Button>
          <Button
            variant="outline"
            onClick={() => triggerDownload('/api/export?format=csv&type=summary', `monthly-summary-${dateSuffix}.csv`)}
            disabled={loading === `monthly-summary-${dateSuffix}.csv`}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {loading === `monthly-summary-${dateSuffix}.csv` ? 'Exporting…' : 'Export Summary CSV'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
