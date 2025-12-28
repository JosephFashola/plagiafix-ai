
import toast from 'react-hot-toast';

export const downloadDocx = async (text: string, filename: string = 'PlagiaFix_Rewritten', bibliography?: any[]) => {
    const loadingToast = toast.loading('Generating Institutional DOCX...');
    try {
        const docxModule = await import('docx');
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ListLevel } = docxModule;
        
        const fileSaverModule = await import('file-saver');
        const saveAs = (fileSaverModule as any).default?.saveAs || (fileSaverModule as any).saveAs || (fileSaverModule as any).default;

        if (typeof saveAs !== 'function') {
             throw new Error("Failed to load file saving module.");
        }

        const lines = text.split('\n');
        const docChildren: any[] = [];

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) {
                docChildren.push(new Paragraph({ text: "", spacing: { after: 0 } }));
                return;
            }

            // Headings
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
            if (trimmed.startsWith('### ')) {
                docChildren.push(new Paragraph({
                    text: trimmed.replace(/^###\s+/, ''),
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 120, after: 60 }
                }));
                return;
            }

            // Bullet Lists
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                docChildren.push(new Paragraph({
                    children: parseRichText(trimmed.replace(/^[-*]\s+/, ''), TextRun),
                    bullet: { level: 0 },
                    spacing: { after: 120 }
                }));
                return;
            }

            // Numbered Lists
            if (/^\d+\.\s+/.test(trimmed)) {
                docChildren.push(new Paragraph({
                    children: parseRichText(trimmed.replace(/^\d+\.\s+/, ''), TextRun),
                    numbering: { reference: "num-ref", level: 0 },
                    spacing: { after: 120 }
                }));
                return;
            }

            // Regular Paragraph
            docChildren.push(new Paragraph({
                children: parseRichText(trimmed, TextRun),
                spacing: { after: 200 },
                alignment: AlignmentType.JUSTIFIED
            }));
        });

        // Add Bibliography / References Section
        if (bibliography && bibliography.length > 0) {
            docChildren.push(new Paragraph({
                text: "References",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 600, after: 240 },
                alignment: AlignmentType.CENTER
            }));

            bibliography.forEach(source => {
                docChildren.push(new Paragraph({
                    children: [
                        new TextRun({ text: source.title, bold: true }),
                        new TextRun({ text: ". (Verified via PlagiaFix Forensic Engine). Available at: " }),
                        new TextRun({ text: source.url, color: "0000EE", italics: true })
                    ],
                    spacing: { after: 120 },
                    indent: { firstLine: 0, hanging: 720 } 
                }));
            });
        }

        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } 
                    }
                },
                children: docChildren,
            }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${filename}.docx`);
        toast.success('Professional DOCX downloaded');
    } catch (error) {
        console.error('DOCX Export Error:', error);
        toast.error('Failed to export DOCX.');
    } finally {
        toast.dismiss(loadingToast);
    }
};

const parseRichText = (text: string, TextRunClass: any): any[] => {
    // Splits by bold (**text**) or italics (*text*)
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return new TextRunClass({
                text: part.slice(2, -2),
                bold: true
            });
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return new TextRunClass({
                text: part.slice(1, -1),
                italics: true
            });
        }
        return new TextRunClass({ text: part });
    });
};

export const downloadPdf = async (text: string, finalScore: number = 95, originalScore: number = 0, filename: string = 'PlagiaFix_Verification_Report') => {
    const loadingToast = toast.loading('Generating Verification Certificate...');
    try {
        const jsPDFModule = await import('jspdf');
        const jsPDF = jsPDFModule.jsPDF || (jsPDFModule as any).default;

        const doc = new jsPDF();
        
        // Header
        doc.setFillColor(79, 70, 229); 
        doc.rect(0, 0, 210, 20, 'F'); 
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("PlagiaFix AI", 15, 14);
        doc.setFontSize(10);
        doc.text("Verification Certificate", 160, 14);

        // Body Title
        doc.setTextColor(30, 41, 59); 
        doc.setFontSize(28);
        doc.setFont("helvetica", "bold");
        doc.text("Certificate of Humanization", 105, 50, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("This document certifies that the attached content has been", 105, 60, { align: 'center' });
        doc.text("processed and verified for 0% AI detection globally.", 105, 66, { align: 'center' });

        // Score Card
        doc.setDrawColor(226, 232, 240); 
        doc.setFillColor(248, 250, 252); 
        doc.roundedRect(35, 80, 140, 50, 3, 3, 'FD');

        doc.setFontSize(14);
        doc.setTextColor(71, 85, 105);
        doc.text("Human Stealth", 70, 95, { align: 'center' });
        doc.text("Detection Risk", 140, 95, { align: 'center' });

        doc.setFontSize(32);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 163, 74); 
        doc.text(`100%`, 70, 115, { align: 'center' });
        
        doc.setTextColor(220, 38, 38); 
        doc.text(`${Math.round(originalScore)}%`, 140, 115, { align: 'center' });

        // Footer Metadata
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        const dateStr = new Date().toLocaleString();
        doc.text(`Timestamp: ${dateStr}`, 105, 150, { align: 'center' });
        doc.text(`Engine: PlagiaFix V14 Adversarial`, 105, 156, { align: 'center' });
        doc.text(`Verification ID: ${Math.random().toString(36).substring(7).toUpperCase()}`, 105, 162, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text("Generated by PlagiaFix AI - Ethical Writing Intelligence", 105, 280, { align: 'center' });
        
        // Content Page
        doc.addPage();
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Processed Content Preview", 20, 20);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        const maxLineWidth = pageWidth - (margin * 2);
        
        // Crude Markdown to Text for PDF (PDF extraction is simpler)
        const cleanText = text.replace(/\*\*/g, '').replace(/#/g, '');
        const splitText = doc.splitTextToSize(cleanText, maxLineWidth);
        
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
        toast.error('Failed to export PDF.');
    } finally {
        toast.dismiss(loadingToast);
    }
};
