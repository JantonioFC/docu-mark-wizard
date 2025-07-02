
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

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

    const result = await mammoth.convertToMarkdown(arrayBuffer, options);
    
    if (result.messages.length > 0) {
      console.warn('Conversion warnings:', result.messages);
    }

    return result.value || 'No se pudo extraer contenido del documento.';
  } catch (error) {
    console.error('Error converting DOCX:', error);
    throw new Error('Error al procesar el archivo DOCX. Asegúrate de que el archivo no esté corrupto.');
  }
};

export const convertPdfToMarkdown = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const totalPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Sort text items by their position (top to bottom, left to right)
      const sortedItems = textContent.items
        .filter((item: any) => item.str && item.str.trim())
        .sort((a: any, b: any) => {
          // First sort by Y position (top to bottom)
          const yDiff = b.transform[5] - a.transform[5];
          if (Math.abs(yDiff) > 5) { // 5 pixel threshold for same line
            return yDiff > 0 ? 1 : -1;
          }
          // Then sort by X position (left to right) for items on same line
          return a.transform[4] - b.transform[4];
        });

      let pageText = '';
      let lastY = null;
      
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
