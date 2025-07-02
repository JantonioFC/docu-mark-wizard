
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar el worker de PDF.js para que use el archivo local del paquete
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

/**
 * Convierte un archivo .docx a formato Markdown.
 * Primero lo convierte a HTML usando Mammoth, y luego aplica reglas de reemplazo.
 * @param file El archivo .docx a convertir.
 * @returns Una promesa que se resuelve con el contenido en formato Markdown.
 */
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

    const result = await mammoth.convertToHtml({ arrayBuffer }, options);
    
    if (result.messages.length > 0) {
      console.warn('Advertencias en la conversión de DOCX:', result.messages);
    }

    // Función interna para convertir el HTML resultante a Markdown
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
        .replace(/<\/?\w+[^>]*>/g, '') // Elimina etiquetas HTML restantes
        .replace(/\n{3,}/g, '\n\n') // Normaliza saltos de línea múltiples
        .trim();
    };

    const markdown = htmlToMarkdown(result.value || '');
    return markdown || 'No se pudo extraer contenido del documento.';
  } catch (error) {
    console.error('Error convirtiendo DOCX:', error);
    throw new Error('Error al procesar el archivo DOCX. Asegúrate de que el archivo no esté corrupto.');
  }
};

/**
 * Extrae datos específicos (Lote, Total, etc.) de un archivo PDF.
 * En lugar de intentar convertir todo el documento, busca patrones definidos.
 * @param file El archivo .pdf a procesar.
 * @returns Una promesa que se resuelve con un objeto de datos clave-valor.
 */
export const extractDataFromPdf = async (file: File): Promise<Record<string, string>> => {
  try {
    console.log('Iniciando extracción de datos del PDF:', file.name);
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Une el texto de la página en un solo bloque, es suficiente para la búsqueda con regex
      const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
      fullText += pageText + '\n'; // Añade salto de línea entre páginas
    }

    console.log('Texto extraído del PDF, longitud:', fullText.length);

    // --- Lógica de Extracción de Datos Específicos ---

    const patterns: Record<string, RegExp> = {
      lote: /Lote\s*N?°?:\s*(\S+)/i,
      total: /Total.*?:?\s*\$?([\d,.-]+)/i,
      // Añade aquí más patrones en el futuro si es necesario. Ejemplo:
      // fecha: /Fecha\s*de\s*emisi[oó]n:\s*(\d{2}\/\d{2}\/\d{4})/i
    };

    const extractedData: Record<string, string> = {
      filename: file.name
    };

    // Itera sobre los patrones y busca las coincidencias en el texto extraído
    for (const key in patterns) {
      const pattern = patterns[key];
      const match = fullText.match(pattern);
      
      // match[1] contiene el primer grupo de captura (el valor que queremos)
      extractedData[key] = match && match[1] ? match[1].trim() : 'No encontrado';
    }

    console.log('Datos extraídos:', extractedData);
    return extractedData;

  } catch (error) {
    console.error('Error extrayendo datos del PDF:', error);
    throw new Error('Error al procesar el archivo PDF. Asegúrate de que el archivo no esté corrupto o protegido.');
  }
};

/**
 * Toma un objeto de datos y genera un archivo Markdown para descargar.
 * @param data Un objeto con los datos extraídos, debe incluir 'filename'.
 */
export const downloadDataAsMarkdown = (data: Record<string, string>) => {
  const originalFilename = data.filename || 'documento';
  const markdownFilename = `${originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename}.md`;

  let content = `# Datos Extraídos de ${data.filename}\n\n`;
  
  // Construye el contenido del archivo .md a partir del objeto de datos
  for (const key in data) {
    if (key !== 'filename') {
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
      content += `**${capitalizedKey}:** ${data[key]}\n\n`;
    }
  }

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = markdownFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Mantener compatibilidad con la función anterior para archivos DOCX
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

// Para mantener compatibilidad con el código existente
export const convertPdfToMarkdown = extractDataFromPdf;
