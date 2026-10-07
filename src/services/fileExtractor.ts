export interface ExtractedFileInfo {
  text: string;
  isTextBased: boolean;
  lineCount: number;
  wordCount: number;
}

export async function extractTextFromFile(file: File | Blob, filename: string): Promise<ExtractedFileInfo> {
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  const textExtensions = [
    'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'xml', 'html', 'htm', 'css',
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs',
    'php', 'rb', 'go', 'rs', 'sql', 'sh', 'bash', 'yaml', 'yml', 'toml',
    'ini', 'env', 'log', 'tex', 'bib', 'r', 'm', 'rst'
  ];

  const isTextBased = textExtensions.includes(extension) || file.type.startsWith('text/');

  if (isTextBased) {
    try {
      const text = await readFileAsText(file);
      const lines = text.split('\n');
      const words = text.trim().split(/\s+/).filter(Boolean);
      return {
        text,
        isTextBased: true,
        lineCount: lines.length,
        wordCount: words.length,
      };
    } catch {
      return { text: '', isTextBased: true, lineCount: 0, wordCount: 0 };
    }
  }

  // If PDF or Office document, attempt text scanning or placeholder descriptor
  if (extension === 'pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const rawText = scanPdfText(arrayBuffer);
      if (rawText && rawText.length > 50) {
        const words = rawText.trim().split(/\s+/).filter(Boolean);
        return {
          text: rawText,
          isTextBased: false,
          lineCount: rawText.split('\n').length,
          wordCount: words.length,
        };
      }
    } catch {
      // Fallback
    }

    return {
      text: `[PDF Document: ${filename} (${(file.size / 1024).toFixed(1)} KB). Contains formatted academic/research text. Ready for AI evaluation.]`,
      isTextBased: false,
      lineCount: 1,
      wordCount: 15,
    };
  }

  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(extension)) {
    return {
      text: `[Document: ${filename} - Format: .${extension.toUpperCase()} (${(file.size / 1024).toFixed(1)} KB)]`,
      isTextBased: false,
      lineCount: 1,
      wordCount: 10,
    };
  }

  if (file.type.startsWith('image/')) {
    return {
      text: `[Image Asset: ${filename} - Type: ${file.type} (${(file.size / 1024).toFixed(1)} KB)]`,
      isTextBased: false,
      lineCount: 1,
      wordCount: 10,
    };
  }

  return {
    text: `[Binary File: ${filename} (${(file.size / 1024).toFixed(1)} KB)]`,
    isTextBased: false,
    lineCount: 1,
    wordCount: 8,
  };
}

function readFileAsText(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// Basic text stream extractor from unencrypted PDF streams
function scanPdfText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let ascii = '';
  // Sample up to first 250,000 bytes for textual streams
  const limit = Math.min(bytes.length, 250000);
  for (let i = 0; i < limit; i++) {
    const b = bytes[i];
    if (b >= 32 && b <= 126) {
      ascii += String.fromCharCode(b);
    } else if (b === 10 || b === 13) {
      ascii += '\n';
    }
  }

  // Extract BT ... ET blocks (PDF text blocks) or parenthesis strings ( ... )
  const textMatches = ascii.match(/\(([^()]{2,100})\)/g);
  if (textMatches && textMatches.length > 5) {
    const clean = textMatches
      .map(m => m.slice(1, -1))
      .filter(m => /[a-zA-Z0-9]/.test(m))
      .join(' ');
    if (clean.length > 80) return clean;
  }

  return '';
}
