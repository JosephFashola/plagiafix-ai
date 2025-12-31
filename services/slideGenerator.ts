
import toast from 'react-hot-toast';
import { SlideContent } from '../types';

export const generatePptx = async (slides: SlideContent[], filename: string = 'Presentation') => {
    const loadingToast = toast.loading('Building Beautiful Slides...');
    
    try {
        // Dynamically import pptxgenjs
        const pptxModule = await import('pptxgenjs');
        // Fix: cast to any to resolve non-constructable type error in dynamic import interop
        const PptxGenJS = (pptxModule.default || pptxModule) as any;
        
        const pres = new PptxGenJS();
        pres.layout = 'LAYOUT_16x9';
        
        // --- THEME CONFIGURATION ---
        const theme = {
            primary: '4F46E5', // Indigo 600
            secondary: '818CF8', // Indigo 400
            dark: '1E293B', // Slate 800
            light: 'F8FAFC', // Slate 50
            white: 'FFFFFF',
            accent: 'F43F5E', // Rose 500
            text: '334155' // Slate 700
        };

        // --- MASTER SLIDE: MODERN CONTENT ---
        pres.defineSlideMaster({
            title: 'MASTER_MODERN',
            background: { color: theme.light },
            objects: [
                // Header Strip
                { rect: { x: 0, y: 0, w: '100%', h: 0.15, fill: { color: theme.primary } } },
                // Decorative Accent Top Right
                { rect: { x: '85%', y: 0, w: 1.5, h: 0.15, fill: { color: theme.accent } } },
                // Subtle sidebar line
                { rect: { x: 0.4, y: 1.2, w: 0.05, h: 4.5, fill: { color: 'E2E8F0' } } },
                // Footer Divider
                { line: { x: 0.5, y: '92%', w: '90%', h: 0, line: { color: 'CBD5E1', width: 1 } } },
                // Branding
                { text: { text: 'PlagiaFix AI • Professional Series', options: { x: 0.5, y: '94%', fontSize: 9, color: '94A3B8' } } },
            ],
            slideNumber: { x: '95%', y: '94%', color: '94A3B8', fontSize: 9 }
        });

        // --- 1. TITLE SLIDE (Cover) ---
        if (slides.length > 0) {
            const titleSlide = pres.addSlide();
            const firstData = slides[0];

            // Dark Rich Background
            titleSlide.background = { color: theme.primary };
            
            // Abstract Geometric Shapes (Glassmorphism effect simulation)
            titleSlide.addShape(pres.ShapeType.ellipse, { 
                x: '65%', y: '-20%', w: 7, h: 7, 
                fill: { color: theme.secondary, transparency: 85 } 
            });
            titleSlide.addShape(pres.ShapeType.rect, { 
                x: -1, y: 5.5, w: 5, h: 2, 
                fill: { color: theme.dark, transparency: 90 }, 
                rotate: -15 
            });

            // Main Title
            titleSlide.addText(firstData.title, {
                x: 0.8, y: 1.8, w: '90%', h: 2.5,
                fontSize: 44,
                color: theme.white,
                bold: true,
                fontFace: 'Arial',
                shadow: { type: 'outer', color: '000000', blur: 6, offset: 2, opacity: 0.3 }
            });
            
            // Accent Line
            titleSlide.addShape(pres.ShapeType.rect, {
                x: 0.8, y: 4.2, w: 1.2, h: 0.08,
                fill: { color: theme.accent }
            });

            // Subtitle constructed from bullets or default text
            const subtitle = firstData.bullets.length > 0 
                ? firstData.bullets.slice(0, 2).join('  |  ') 
                : 'Generated Presentation';
                
            titleSlide.addText(subtitle, {
                x: 0.8, y: 4.5, w: '90%', h: 1,
                fontSize: 16,
                color: 'E0E7FF',
                fontFace: 'Arial',
                italic: true
            });
            
            if (firstData.speakerNotes) titleSlide.addNotes(firstData.speakerNotes);
        }

        // --- 2. CONTENT SLIDES ---
        // Skip index 0 as it was used for Title
        for (let i = 1; i < slides.length; i++) {
            const s = slides[i];
            const slide = pres.addSlide({ masterName: 'MASTER_MODERN' });
            
            // Slide Title
            slide.addText(s.title, {
                x: 0.8, y: 0.4, w: '85%', h: 0.8,
                fontSize: 28,
                color: theme.dark,
                bold: true,
                fontFace: 'Arial'
            });
            
            // Visual Accent next to Title
            slide.addShape(pres.ShapeType.rect, {
                x: 0.5, y: 0.5, w: 0.15, h: 0.6,
                fill: { color: theme.accent }
            });

            // LAYOUT LOGIC:
            // If we have few bullets (<= 4), use a "Card" layout which looks beautiful.
            // If we have many bullets, use a clean list layout.
            
            if (s.bullets.length <= 4) {
                // --- BEAUTIFUL CARD LAYOUT ---
                let startY = 1.5;
                const cardGap = 0.2;
                // Calculate height dynamically to fill space
                const cardHeight = (4.5 - (s.bullets.length * cardGap)) / s.bullets.length; 
                
                s.bullets.forEach((bullet, idx) => {
                    // Card Container
                    slide.addShape(pres.ShapeType.roundRect, {
                        x: 0.8, y: startY, w: '90%', h: cardHeight,
                        fill: { color: theme.white },
                        line: { color: 'E2E8F0', width: 1 },
                        shadow: { type: 'outer', color: 'CBD5E1', blur: 3, offset: 2, opacity: 0.3 }
                    });

                    // Number/Icon Circle
                    slide.addShape(pres.ShapeType.ellipse, {
                        x: 1.0, y: startY + (cardHeight/2) - 0.2, w: 0.4, h: 0.4,
                        fill: { color: theme.primary }
                    });
                    
                    // Number inside circle
                    slide.addText((idx + 1).toString(), {
                        x: 1.0, y: startY + (cardHeight/2) - 0.2, w: 0.4, h: 0.4,
                        fontSize: 14,
                        color: theme.white,
                        bold: true,
                        align: 'center',
                        valign: 'middle'
                    });

                    // Bullet Text
                    slide.addText(bullet, {
                        x: 1.6, y: startY, w: '80%', h: cardHeight,
                        fontSize: 16,
                        color: theme.text,
                        fontFace: 'Arial',
                        valign: 'middle'
                    });
                    
                    startY += cardHeight + cardGap;
                });
            } else {
                // --- CLEAN LIST LAYOUT (Fallback for dense slides) ---
                // Add a faint background box for the list
                slide.addShape(pres.ShapeType.rect, {
                    x: 0.8, y: 1.4, w: '90%', h: 5,
                    fill: { color: theme.white },
                    line: { color: 'E2E8F0', width: 1 }
                });

                const bulletObjects = s.bullets.map(b => ({ text: b, options: { breakLine: true } }));
                slide.addText(bulletObjects, {
                    x: 1.0, y: 1.6, w: '85%', h: 4.6,
                    fontSize: 18,
                    color: theme.text,
                    bullet: { type: 'number', color: theme.primary },
                    lineSpacing: 30,
                    fontFace: 'Arial',
                    valign: 'top'
                });
            }

            if (s.speakerNotes) slide.addNotes(s.speakerNotes);
        }

        // --- 3. CLOSING SLIDE ---
        const endSlide = pres.addSlide();
        endSlide.background = { color: theme.dark };
        
        // Large background circle
        endSlide.addShape(pres.ShapeType.ellipse, { 
             x: '35%', y: '25%', w: 4, h: 4, 
             fill: { color: theme.primary, transparency: 60 } 
        });

        endSlide.addText('Thank You', {
            x: 0, y: '40%', w: '100%', h: 1,
            fontSize: 48,
            color: theme.white,
            bold: true,
            align: 'center',
            shadow: { type: 'outer', color: '000000', blur: 10, offset: 2, opacity: 0.5 }
        });
        
        endSlide.addText('Generated with PlagiaFix AI', {
            x: 0, y: '55%', w: '100%', h: 0.5,
            fontSize: 14,
            color: '94A3B8',
            align: 'center'
        });

        await pres.writeFile({ fileName: `${filename}.pptx` });
        toast.success('Professional Presentation downloaded!');

    } catch (error: any) {
        console.error("PPTX Gen Error", error);
        toast.error('Failed to generate PowerPoint: ' + error.message);
    } finally {
        toast.dismiss(loadingToast);
    }
};
