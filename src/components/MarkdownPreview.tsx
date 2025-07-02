
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Eye, Code } from 'lucide-react';

interface MarkdownPreviewProps {
  filename: string;
  content: string;
  onDownload: () => void;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  filename,
  content,
  onDownload
}) => {
  const [showPreview, setShowPreview] = React.useState(true);

  const renderMarkdownPreview = (markdown: string) => {
    // Simple markdown to HTML conversion for preview
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
      .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      .replace(/\n/gim, '<br>');
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl">Archivo convertido: {filename}</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <Code className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showPreview ? 'Ver Código' : 'Ver Vista Previa'}
          </Button>
          <Button onClick={onDownload} size="sm">
            <Download className="w-4 h-4 mr-2" />
            Descargar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showPreview ? (
          <div 
            className="prose prose-sm max-w-none p-4 border rounded-lg bg-background"
            dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(content) }}
          />
        ) : (
          <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">
            {content}
          </pre>
        )}
      </CardContent>
    </Card>
  );
};

export default MarkdownPreview;
