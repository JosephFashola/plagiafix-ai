
// Libraries are managed via package.json and bundled by Vite.

export const parseFile = async (file: File, onProgress?: (msg: string) => void): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    if (extension === 'pdf') {
      return await parsePdf(file, onProgress);
    } else if (extension === 'docx') {
      onProgress?.("Extracting Institutional DOCX...");
      return await parseDocx(file);
    } else {
      onProgress?.("Reading Source Text...");
      return await parseText(file);
    }
  } catch (error: any) {
    console.error("Error parsing file:", error);
    throw new Error(error.message || `Failed to read ${extension?.toUpperCase()} file. It may be corrupted or password protected.`);
  }
};

const parsePdf = async (file: File, onProgress?: (msg: string) => void): Promise<string> => {
  const pdfjsLib = await import('pdfjs-dist');
  
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  onProgress?.(`Initializing Forensic PDF Audit (0/${pdf.numPages})...`);

  // Optimized Extraction: Process pages in parallel chunks of 10 to balance speed and memory
  const totalPages = pdf.numPages;
  const BATCH_SIZE = 10;
  let allPagesText: string[] = new Array(totalPages);

  for (let i = 0; i < totalPages; i += BATCH_SIZE) {
    const end = Math.min(i + BATCH_SIZE, totalPages);
    const batchPromises = [];

    for (let j = i; j < end; j++) {
      batchPromises.push((async (pageIndex) => {
        const page = await pdf.getPage(pageIndex + 1);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => (item as any).str)
          .join(' ');
        return { index: pageIndex, text: pageText };
      })(j));
    }

    const results = await Promise.all(batchPromises);
    results.forEach(res => {
      allPagesText[res.index] = res.text;
    });

    onProgress?.(`Extracting Forensic DNA: Page ${end}/${totalPages}`);
  }

  const fullText = allPagesText.join('\n\n');

  if (!fullText.trim()) {
      throw new Error("No text found in PDF. Document might be image-only (Scanned PDF).");
  }
  
  return fullText;
};

const parseDocx = async (file: File): Promise<string> => {
  const mammothModule = await import('mammoth');
  const mammoth = (mammothModule as any).default || mammothModule;
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

const parseText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error("Failed to read text file."));
    };
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};
