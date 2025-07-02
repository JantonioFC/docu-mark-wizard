
import React, { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import MarkdownPreview from '@/components/MarkdownPreview';
import { downloadMarkdownFile } from '@/utils/documentConverter';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [convertedFile, setConvertedFile] = useState<{
    filename: string;
    content: string;
  } | null>(null);
  const { toast } = useToast();

  const handleConversionComplete = (filename: string, content: string) => {
    setConvertedFile({ filename, content });
    toast({
      title: "Conversión exitosa",
      description: `El archivo ${filename} ha sido convertido correctamente.`,
    });
  };

  const handleDownload = () => {
    if (convertedFile) {
      downloadMarkdownFile(convertedFile.filename, convertedFile.content);
      toast({
        title: "Descarga iniciada",
        description: `Descargando ${convertedFile.filename}...`,
      });
    }
  };

  const handleNewConversion = () => {
    setConvertedFile(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-8 px-4">
      <div className="container mx-auto space-y-8">
        {!convertedFile ? (
          <FileUploader onConversionComplete={handleConversionComplete} />
        ) : (
          <div className="space-y-6">
            <MarkdownPreview
              filename={convertedFile.filename}
              content={convertedFile.content}
              onDownload={handleDownload}
            />
            <div className="text-center">
              <button
                onClick={handleNewConversion}
                className="text-primary hover:underline"
              >
                Convertir otro archivo
              </button>
            </div>
          </div>
        )}
        
        <div className="text-center text-sm text-muted-foreground">
          <p>🔒 Procesamiento completamente local - Tus archivos nunca salen de tu dispositivo</p>
          <p>Compatible con archivos .docx y .pdf</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
