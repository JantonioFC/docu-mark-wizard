import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker to use the local worker from the package
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

export const convertDocxToMarkdown = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    const options = {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        "b => strong",
        "i => em"
      ]
    };

    // Use ArrayBuffer directly with mammoth in browser environment
    const result = await mammoth.convertToHtml({ arrayBuffer }, options);
    
    if (result.messages.length > 0) {
      console.warn('Conversion warnings:', result.messages);
    }

    // Convert HTML to Markdown
    const htmlToMarkdown = (html: string): string => {
      return html
        .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
        .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
        .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
        .replace(/<h4>(.*?)<\/h4>/g, '#### $1\n\n')
        .replace(/<h5>(.*?)<\/h5>/g, '##### $1\n\n')
        .replace(/<h6>(.*?)<\/h6>/g, '###### $1\n\n')
        .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
        .replace(/<em>(.*?)<\/em>/g, '*$1*')
        .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/<\/?\w+[^>]*>/g, '') // Remove remaining HTML tags
        .replace(/\n{3,}/g, '\n\n') // Normalize multiple line breaks
        .trim();
    };

    const markdown = htmlToMarkdown(result.value || '');
    return markdown || 'No se pudo extraer contenido del documento.';
  } catch (error) {
    console.error('Error converting DOCX:', error);
    throw new Error('Error al procesar el archivo DOCX. Asegúrate de que el archivo no esté corrupto.');
  }
};

export const convertPdfToMarkdown = async (file: File): Promise<string> => {
  try {
    console.log('Starting PDF conversion for file:', file.name, 'Size:', file.size);
    
    const arrayBuffer = await file.arrayBuffer();
    console.log('ArrayBuffer created, size:', arrayBuffer.byteLength);
    
    // Simplified PDF loading configuration
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      verbosity: 0
    });
    console.log('PDF loading task created');
    
    const pdf = await loadingTask.promise;
    console.log('PDF loaded successfully, pages:', pdf.numPages);
    
    let fullText = '';
    const totalPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      console.log(`Processing page ${pageNum}/${totalPages}`);
      
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Define the TextItem interface for better type safety
      interface TextItemWithTransform {
        str: string;
        transform: number[];
      }

      // Type guard function to check if item is a TextItem
      const isTextItem = (item: any): item is TextItemWithTransform => {
        return item && 
               typeof item === 'object' && 
               'str' in item && 
               'transform' in item && 
               typeof item.str === 'string' && 
               Array.isArray(item.transform) &&
               item.str.trim().length > 0;
      };

      // Filter and properly type text items - only keep TextItem objects
      const textItems = textContent.items.filter(isTextItem) as TextItemWithTransform[];

      console.log(`Page ${pageNum} has ${textItems.length} text items`);

      // Sort text items by their position (top to bottom, left to right)
      const sortedItems = textItems.sort((a, b) => {
        // First sort by Y position (top to bottom)
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 5) { // 5 pixel threshold for same line
          return yDiff > 0 ? 1 : -1;
        }
        // Then sort by X position (left to right) for items on same line
        return a.transform[4] - b.transform[4];
      });

      let pageText = '';
      let lastY: number | null = null;
      
      for (const item of sortedItems) {
        const currentY = item.transform[5];
        const text = item.str.trim();
        
        if (text) {
          // Add line break if this is a new line (significant Y position change)
          if (lastY !== null && Math.abs(currentY - lastY) > 5) {
            pageText += '\n';
          }
          
          pageText += text + ' ';
          lastY = currentY;
        }
      }
      
      if (pageText.trim()) {
        fullText += pageText.trim() + '\n\n';
      }
    }

    console.log('PDF text extraction completed, text length:', fullText.length);

    // Clean up the text and add basic markdown formatting
    let markdown = fullText
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n\n') // Normalize paragraph breaks
      .trim();

    // Try to detect headings (simple heuristic based on common patterns)
    markdown = markdown.replace(/^([A-Z][A-Z\s]{10,})\s*$/gm, '## $1'); // All caps lines as headings
    markdown = markdown.replace(/^(\d+\.\s+[A-Z][^.]*)\s*$/gm, '### $1'); // Numbered sections
    
    return markdown || 'No se pudo extraer contenido del archivo PDF.';
  } catch (error) {
    console.error('Error converting PDF:', error);
    throw new Error('Error al procesar el archivo PDF. Asegúrate de que el archivo no esté corrupto o protegido.');
  }
};

export const downloadMarkdownFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
