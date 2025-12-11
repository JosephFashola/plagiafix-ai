
// Libraries are managed via package.json and bundled by Vite.

export const parseFile = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    if (extension === 'pdf') {
      return await parsePdf(file);
    } else if (extension === 'docx') {
      return await parseDocx(file);
    } else {
      return await parseText(file);
    }
  } catch (error: any) {
    console.error("Error parsing file:", error);
    throw new Error(error.message || `Failed to read ${extension?.toUpperCase()} file. It may be corrupted or password protected.`);
  }
};

const parsePdf = async (file: File): Promise<string> => {
  // Dynamically import pdfjs-dist
  const pdfjsLib = await import('pdfjs-dist');
  
  // Configure worker using the exact version from index.html import map
  // CRITICAL: This version must match the installed 'pdfjs-dist' version exactly.
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';
  }

  const arrayBuffer = await file.arrayBuffer();
  
  // Load the PDF document
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  
  // Extract text from each page
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Join items with a space. 
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
      
    fullText += pageText + '\n\n';
  }

  if (!fullText.trim()) {
      throw new Error("No text found in PDF. This might be a scanned image.");
  }
  
  return fullText;
};

const parseDocx = async (file: File): Promise<string> => {
  // Dynamically import mammoth
  const mammothModule = await import('mammoth');
  // Handle default export differences in build environments
  const mammoth = mammothModule.default || mammothModule;

  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  
  if (result.messages && result.messages.length > 0) {
      console.warn("Mammoth messages:", result.messages);
  }
  
  return result.value;
};

const parseText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error("Failed to read text file."));
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};