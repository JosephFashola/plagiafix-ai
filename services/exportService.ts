
import toast from 'react-hot-toast';

export const downloadDocx = async (text: string, filename: string = 'PlagiaFix_Rewritten', references?: string[]) => {
    const loadingToast = toast.loading('Generating DOCX...');
    try {
        const docxModule = await import('docx');
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docxModule;
        
        const fileSaverModule = await import('file-saver');
        // Robustly handle different export formats (ESM/CJS interoperability)
        const saveAs = (fileSaverModule as any).default?.saveAs || (fileSaverModule as any).saveAs || (fileSaverModule as any).default;

        if (typeof saveAs !== 'function') {
             throw new Error("Failed to load file saving module.");
        }

        const lines = text.split('\n');
        const docChildren: any[] = [];

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) {
                // Add empty space
                docChildren.push(new Paragraph({ text: "", spacing: { after: 0 } }));
                return;
            }

            // 1. Detect Headings
            if (trimmed.startsWith('# ')) {
                docChildren.push(new Paragraph({
                    text: trimmed.replace(/^#\s+/, ''),
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 240, after: 120 }
                }));
                return;
            }
            if (trimmed.startsWith('## ')) {
                docChildren.push(new Paragraph({
                    text: trimmed.replace(/^##\s+/, ''),
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 240, after: 120 }
                }));
                return;
            }

            // 2. Detect Bullet Points
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const cleanText = trimmed.replace(/^[-*]\s+/, '');
                docChildren.push(new Paragraph({
                    children: parseBoldText(cleanText, TextRun),
                    bullet: { level: 0 },
                    spacing: { after: 120 }
                }));
                return;
            }

            // 3. Standard Paragraph with Bold parsing
            docChildren.push(new Paragraph({
                children: parseBoldText(trimmed, TextRun),
                spacing: { after: 200 } // Professional spacing
            }));
        });

        // 4. Append References if provided
        if (references && references.length > 0) {
            docChildren.push(new Paragraph({
                text: "References",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 240, after: 120 }
            }));

            references.forEach(ref => {
                docChildren.push(new Paragraph({
                    children: parseBoldText(ref, TextRun),
                    spacing: { after: 120 }
                }));
            });
        }

        const doc = new Document({
            sections: [{
                properties: {},
                children: docChildren,
            }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${filename}.docx`);
        toast.success('DOCX downloaded successfully');
    } catch (error) {
        console.error('DOCX Export Error:', error);
        toast.error('Failed to export DOCX. Please try again.');
    } finally {
        toast.dismiss(loadingToast);
    }
};

// Helper to parse **bold** text
const parseBoldText = (text: string, TextRunClass: any): any[] => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return new TextRunClass({
                text: part.slice(2, -2),
                bold: true
            });
        }
        return new TextRunClass({ text: part });
    });
};

export const downloadPdf = async (text: string, finalScore: number = 95, originalScore: number = 0, filename: string = 'PlagiaFix_Certificate_Report') => {
    const loadingToast = toast.loading('Generating Verification Certificate...');
    try {
        const jsPDFModule = await import('jspdf');
        // Handle esm.sh default export differences
        const jsPDF = jsPDFModule.jsPDF || (jsPDFModule as any).default;

        const doc = new jsPDF();
        
        // --- PAGE 1: VERIFICATION CERTIFICATE ---
        doc.setFillColor(79, 70, 229); // Indigo 600
        doc.rect(0, 0, 210, 20, 'F'); // Top Bar
        
        // Header
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("PlagiaFix AI", 15, 14);
        
        doc.setFontSize(10);
        doc.text("Verification Certificate", 160, 14);

        // Title
        doc.setTextColor(30, 41, 59); // Slate 800
        doc.setFontSize(28);
        doc.setFont("helvetica", "bold");
        doc.text("Certificate of Humanization", 105, 50, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("This document certifies that the attached content has been", 105, 60, { align: 'center' });
        doc.text("processed and verified for originality and academic standards.", 105, 66, { align: 'center' });

        // Scores
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.setFillColor(248, 250, 252); // Slate 50
        doc.roundedRect(35, 80, 140, 50, 3, 3, 'FD');

        doc.setFontSize(14);
        doc.setTextColor(71, 85, 105);
        doc.text("Uniqueness Score", 70, 95, { align: 'center' });
        doc.text("Original Risk", 140, 95, { align: 'center' });

        doc.setFontSize(32);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 163, 74); // Green
        doc.text(`${Math.round(finalScore)}%`, 70, 115, { align: 'center' });
        
        doc.setTextColor(220, 38, 38); // Red
        doc.text(`${Math.round(originalScore)}%`, 140, 115, { align: 'center' });

        // Metadata
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        const dateStr = new Date().toLocaleString();
        doc.text(`Timestamp: ${dateStr}`, 105, 150, { align: 'center' });
        doc.text(`Engine: Gemini 3 Pro (Education Build)`, 105, 156, { align: 'center' });
        doc.text(`Verification ID: ${Math.random().toString(36).substring(7).toUpperCase()}`, 105, 162, { align: 'center' });

        // Footer
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text("Generated by PlagiaFix AI - The Ethical Writing Assistant", 105, 280, { align: 'center' });
        
        // --- PAGE 2+: CONTENT ---
        doc.addPage();
        doc.setTextColor(0, 0, 0);
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Processed Document Content", 20, 20);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        const maxLineWidth = pageWidth - (margin * 2);
        
        const splitText = doc.splitTextToSize(text, maxLineWidth);
        
        let y = 30;
        const pageHeight = doc.internal.pageSize.height;
        const lineHeight = 6;

        for (const line of splitText) {
            if (y > pageHeight - 20) {
                doc.addPage();
                y = 20;
            }
            doc.text(line, margin, y);
            y += lineHeight;
        }

        doc.save(`${filename}.pdf`);
        toast.success('Verification Certificate downloaded');
    } catch (error) {
        console.error('PDF Export Error:', error);
        toast.error('Failed to export PDF. Please try again.');
    } finally {
        toast.dismiss(loadingToast);
    }
};
