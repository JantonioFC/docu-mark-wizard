
import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Download, AlertCircle } from 'lucide-react';
import { convertDocxToMarkdown, convertPdfToMarkdown } from '@/utils/documentConverter';

interface FileUploaderProps {
  onConversionComplete: (filename: string, content: string) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onConversionComplete }) => {
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Listo para convertir');
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      handleConversion(file);
    }
  }, []);

  const handleConversion = async (file: File) => {
    setIsConverting(true);
    setProgress(0);
    setError(null);
    setStatus(`Convirtiendo ${file.name}...`);

    try {
      const fileExtension = file.name.toLowerCase().split('.').pop();
      let markdownContent: string;

      setProgress(25);

      if (fileExtension === 'docx') {
        markdownContent = await convertDocxToMarkdown(file);
      } else if (fileExtension === 'pdf') {
        markdownContent = await convertPdfToMarkdown(file);
      } else {
        throw new Error('Formato de archivo no soportado. Solo se admiten archivos .docx y .pdf');
      }

      setProgress(75);

      const filename = file.name.replace(/\.(docx|pdf)$/i, '.md');
      onConversionComplete(filename, markdownContent);

      setProgress(100);
      setStatus(`¡Éxito! Se ha creado el archivo: ${filename}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido durante la conversión';
      setError(errorMessage);
      setStatus('Error en la conversión');
      console.error('Conversion error:', err);
    } finally {
      setIsConverting(false);
      setTimeout(() => {
        setProgress(0);
        if (!error) {
          setStatus('Listo para convertir');
        }
      }, 3000);
    }
  };

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const fileExtension = file.name.toLowerCase().split('.').pop();
      if (fileExtension === 'docx' || fileExtension === 'pdf') {
        setSelectedFile(file);
        setError(null);
        handleConversion(file);
      } else {
        setError('Solo se admiten archivos .docx y .pdf');
      }
    }
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <FileText className="w-16 h-16 mx-auto text-primary" />
        <h1 className="text-3xl font-bold">DocuMark Converter</h1>
        <p className="text-muted-foreground">
          Convierte archivos .docx y .pdf a formato Markdown de forma privada y segura
        </p>
      </div>

      <div
        className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-4 transition-colors hover:border-primary/50"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
        <div className="space-y-2">
          <Label htmlFor="file-input" className="text-lg font-medium">
            Seleccione un archivo (.docx o .pdf) para convertir
          </Label>
          <p className="text-sm text-muted-foreground">
            Arrastra y suelta un archivo aquí o haz clic para seleccionar
          </p>
        </div>
        
        <Input
          id="file-input"
          type="file"
          accept=".docx,.pdf"
          onChange={handleFileSelect}
          disabled={isConverting}
          className="hidden"
        />
        
        <Button
          onClick={() => document.getElementById('file-input')?.click()}
          disabled={isConverting}
          size="lg"
        >
          {isConverting ? 'Convirtiendo...' : 'Seleccionar Archivo...'}
        </Button>
      </div>

      {selectedFile && (
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm">
            <strong>Archivo seleccionado:</strong> {selectedFile.name}
          </p>
          <p className="text-xs text-muted-foreground">
            Tamaño: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      )}

      {isConverting && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-center text-muted-foreground">
            {progress}% completado
          </p>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-muted p-3 rounded-lg">
        <p className="text-sm font-medium">Estado: {status}</p>
      </div>
    </div>
  );
};

export default FileUploader;
