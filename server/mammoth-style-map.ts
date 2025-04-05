/**
 * Mammoth.js style mapping configuration
 * This file contains style mappings for converting Word documents to HTML
 * while preserving the original styling and formatting.
 */
import * as mammoth from 'mammoth';

/**
 * Comprehensive style map for Word documents
 * Maps Word document styles to HTML elements with appropriate CSS classes
 * Note: Mammoth style map does not support inline styles directly in the mapping
 * We'll use class names and a stylesheet approach instead
 */
export const documentStyleMap = [
  // Paragraph styles with enhanced formatting preservation
  "p[style-name='Normal'] => p.doc-normal:fresh",
  "p[style-name='Body Text'] => p.doc-body-text:fresh",
  "p[style-name='Table Paragraph'] => p.doc-table-paragraph:fresh",
  
  // Default paragraph
  "p => p.doc-paragraph:fresh",
  
  // Heading styles with proper hierarchical structure
  "p[style-name='Heading 1'] => h1.doc-heading1:fresh",
  "p[style-name='Heading 2'] => h2.doc-heading2:fresh",
  "p[style-name='Heading 3'] => h3.doc-heading3:fresh",
  "p[style-name='Heading 4'] => h4.doc-heading4:fresh",
  "p[style-name='Heading 5'] => h5.doc-heading5:fresh",
  "p[style-name='Heading 6'] => h6.doc-heading6:fresh",
  "p[style-name='Title'] => h1.doc-title:fresh",
  "p[style-name='Subtitle'] => h2.doc-subtitle:fresh",
  
  // Other paragraph styles with improved semantics
  "p[style-name='Caption'] => p.doc-caption:fresh",
  "p[style-name='Intense Quote'] => blockquote.doc-intense-quote:fresh",
  "p[style-name='Quote'] => blockquote.doc-quote:fresh",
  "p[style-name='List Paragraph'] => p.doc-list-paragraph:fresh",
  
  // Character styles with proper formatting
  "r[style-name='Strong'] => strong",
  "r[style-name='Emphasis'] => em",
  "r[style-name='Intense Emphasis'] => em.doc-intense-emphasis",
  "r[style-name='Strong Emphasis'] => strong.doc-strong-emphasis",
  "r[style-name='Book Title'] => span.doc-book-title",
  "r[style-name='Underline'] => span.doc-underline",
  "r[style-name='Strikethrough'] => span.doc-strikethrough",
  "r[style-name='Highlight'] => span.doc-highlight",
  "r[style-name='Subscript'] => sub",
  "r[style-name='Superscript'] => sup",
  
  // Enhanced table support for better structure preservation
  "table => table.doc-table",
  "tr => tr.doc-tr",
  "td => td.doc-td",
  "th => th.doc-th",
  "table[style-name='Table Grid'] => table.doc-table-grid",
  "table[style-name='Table List'] => table.doc-table-list",
  
  // Lists with proper nesting support
  "p:unordered-list(1) => ul > li.doc-list-item:fresh",
  "p:unordered-list(2) => ul > li > ul > li.doc-list-item-2:fresh",
  "p:unordered-list(3) => ul > li > ul > li > ul > li.doc-list-item-3:fresh",
  "p:ordered-list(1) => ol > li.doc-list-item:fresh",
  "p:ordered-list(2) => ol > li > ol > li.doc-list-item-2:fresh",
  "p:ordered-list(3) => ol > li > ol > li > ol > li.doc-list-item-3:fresh",
  
  // Special content types
  "p[style-name='TOC Heading'] => h2.doc-toc-heading:fresh",
  "p[style-name='TOC 1'] => p.doc-toc-1:fresh",
  "p[style-name='TOC 2'] => p.doc-toc-2:fresh",
  "p[style-name='TOC 3'] => p.doc-toc-3:fresh",
  "p[style-name='Footer'] => div.doc-footer > p:fresh",
  "p[style-name='Header'] => div.doc-header > p:fresh",
  "p[style-name='Footnote Text'] => div.doc-footnote > p:fresh"
];

/**
 * Mammoth.js conversion options with style map
 * @returns Conversion options object for mammoth.js
 */
export function getMammothConversionOptions() {
  return {
    styleMap: documentStyleMap,
    ignoreEmptyParagraphs: false,
    includeDefaultStyleMap: true,
    idPrefix: "doc-"
  };
}

/**
 * Convert a Word document buffer to HTML with preserved formatting
 * @param buffer The document buffer
 * @returns The HTML content with preserved formatting
 */
export async function convertDocumentWithStyles(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.convertToHtml(
      { buffer },
      getMammothConversionOptions()
    );
    
    // Check for any warnings
    if (result.messages.length > 0) {
      console.log("Document conversion warnings:");
      result.messages.forEach(msg => console.log(`- ${msg.type}: ${msg.message}`));
    }
    
    // Return the HTML
    return wrapWithDocumentStyles(result.value);
  } catch (err) {
    console.error("Error converting document:", err);
    return `<div class="error">Error converting document: ${err instanceof Error ? err.message : "Unknown error"}</div>`;
  }
}

/**
 * Wrap the HTML with document styles to ensure consistent rendering
 * @param html The HTML content
 * @returns The wrapped HTML with document styles
 */
function wrapWithDocumentStyles(html: string): string {
  // Add CSS styles that correspond to our class-based style mapping
  const documentStyles = `
    <style>
      /* Document container */
      .document-content {
        font-family: 'Calibri', sans-serif;
        line-height: 1.2;
        color: #000;
        max-width: 21cm;
        margin: 0 auto;
        padding: 20px;
      }
      
      /* Paragraph styles */
      .doc-paragraph, .doc-normal, .doc-body-text, .doc-table-paragraph {
        font-family: 'Calibri', sans-serif;
        font-size: 11pt;
        line-height: 1.2;
        margin-bottom: 10pt;
      }
      
      .doc-body-text {
        text-align: justify;
      }
      
      /* Heading styles */
      .doc-heading1, .doc-title {
        font-family: 'Calibri', sans-serif;
        font-size: 16pt;
        font-weight: bold;
        margin-top: 12pt;
        margin-bottom: 12pt;
      }
      
      .doc-title {
        text-align: center;
        margin-top: 0;
      }
      
      .doc-heading2, .doc-subtitle {
        font-family: 'Calibri', sans-serif;
        font-size: 14pt;
        font-weight: bold;
        margin-top: 10pt;
        margin-bottom: 10pt;
      }
      
      .doc-subtitle {
        text-align: center;
        color: #444;
      }
      
      .doc-heading3 {
        font-family: 'Calibri', sans-serif;
        font-size: 12pt;
        font-weight: bold;
        margin-top: 10pt;
        margin-bottom: 10pt;
      }
      
      /* Other paragraph styles */
      .doc-caption {
        font-family: 'Calibri', sans-serif;
        font-size: 9pt;
        font-style: italic;
        text-align: center;
        margin-bottom: 10pt;
        color: #666;
      }
      
      .doc-intense-quote {
        font-family: 'Calibri', sans-serif;
        font-size: 11pt;
        font-style: italic;
        margin: 10pt 30pt;
        padding: 10pt;
        border-left: 4px solid #ccc;
        background-color: #f8f8f8;
      }
      
      .doc-quote {
        font-family: 'Calibri', sans-serif;
        font-size: 11pt;
        font-style: italic;
        margin: 10pt 20pt;
        padding: 5pt;
        border-left: 2px solid #eee;
      }
      
      .doc-list-paragraph {
        font-family: 'Calibri', sans-serif;
        font-size: 11pt;
        margin-bottom: 5pt;
        margin-left: 20pt;
      }
      
      /* Character styles */
      .doc-intense-emphasis {
        color: #333;
        font-weight: bold;
      }
      
      .doc-strong-emphasis {
        font-style: italic;
      }
      
      .doc-book-title {
        font-style: italic;
      }
      
      .doc-underline {
        text-decoration: underline;
      }
      
      .doc-strikethrough {
        text-decoration: line-through;
      }
      
      .doc-highlight {
        background-color: #ffff00;
      }
      
      /* Tables */
      .doc-table, .doc-table-grid, .doc-table-list {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10pt;
        font-family: 'Calibri', sans-serif;
        font-size: 11pt;
      }
      
      .doc-table-grid {
        border: 1px solid #ccc;
      }
      
      .doc-table-list {
        border-top: 2px solid #666;
        border-bottom: 2px solid #666;
      }
      
      .doc-td {
        padding: 5pt;
        border: 1px solid #ddd;
        vertical-align: top;
      }
      
      .doc-th {
        padding: 5pt;
        border: 1px solid #ddd;
        background-color: #f5f5f5;
        font-weight: bold;
      }
      
      /* List items */
      .doc-list-item, .doc-list-item-2, .doc-list-item-3 {
        font-family: 'Calibri', sans-serif;
        font-size: 11pt;
        margin-bottom: 5pt;
      }
      
      /* Special content types */
      .doc-toc-heading {
        font-weight: bold;
        font-size: 14pt;
        margin-bottom: 10pt;
      }
      
      .doc-toc-1 {
        margin-left: 0;
        margin-bottom: 5pt;
      }
      
      .doc-toc-2 {
        margin-left: 20pt;
        margin-bottom: 5pt;
      }
      
      .doc-toc-3 {
        margin-left: 40pt; 
        margin-bottom: 5pt;
      }
      
      .doc-header {
        border-bottom: 1px solid #eee;
        margin-bottom: 20pt;
        color: #666;
      }
      
      .doc-footer {
        border-top: 1px solid #eee;
        margin-top: 20pt;
        padding-top: 10pt;
        color: #666;
      }
      
      .doc-footnote {
        font-size: 9pt;
        color: #555;
        border-top: 1px solid #ccc;
        margin-top: 20pt;
        padding-top: 10pt;
      }
      
      /* Diff markup styles */
      .deletion {
        color: #991b1b; 
        text-decoration: line-through;
        text-decoration-color: #991b1b;
        background-color: #fee2e2;
      }
      
      .addition {
        color: #166534;
        text-decoration: underline;
        text-decoration-color: #166534;
        background-color: #dcfce7;
      }
    </style>
  `;
  
  // Return HTML with embedded styles
  return `
  <div class="document-content">
    ${documentStyles}
    ${html}
  </div>`;
}