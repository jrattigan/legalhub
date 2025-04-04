/**
 * Mammoth.js style mapping configuration
 * This file contains style mappings for converting Word documents to HTML
 * while preserving the original styling and formatting.
 */
import * as mammoth from 'mammoth';

/**
 * Comprehensive style map for Word documents
 * Maps Word document styles to HTML elements with appropriate CSS classes
 */
export const documentStyleMap = [
  // Paragraph styles with explicit styling to match Word
  "p[style-name='Normal'] => p:fresh{font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.2; margin-bottom: 10pt;}",
  "p[style-name='Body Text'] => p:fresh{font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.2; margin-bottom: 10pt; text-align: justify;}",
  "p[style-name='Table Paragraph'] => p:fresh{font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.2; margin-bottom: 10pt;}",
  
  // Default paragraph
  "p => p:fresh{font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.2; margin-bottom: 10pt;}",
  
  // Heading styles with explicit styling
  "p[style-name='Heading 1'] => h1:fresh{font-family: 'Calibri', sans-serif; font-size: 16pt; font-weight: bold; margin-top: 12pt; margin-bottom: 12pt; text-align: center;}",
  "p[style-name='Heading 2'] => h2:fresh{font-family: 'Calibri', sans-serif; font-size: 14pt; font-weight: bold; margin-top: 10pt; margin-bottom: 10pt;}",
  "p[style-name='Heading 3'] => h3:fresh{font-family: 'Calibri', sans-serif; font-size: 12pt; font-weight: bold; margin-top: 10pt; margin-bottom: 10pt;}",
  "p[style-name='Title'] => h1:fresh{font-family: 'Calibri', sans-serif; font-size: 16pt; font-weight: bold; text-align: center; margin-bottom: 12pt; margin-top: 0;}",
  "p[style-name='Subtitle'] => h2:fresh{font-family: 'Calibri', sans-serif; font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 12pt; color: #444;}",
  
  // Other paragraph styles
  "p[style-name='Caption'] => p:fresh{font-family: 'Calibri', sans-serif; font-size: 9pt; font-style: italic; text-align: center; margin-bottom: 10pt; color: #666;}",
  "p[style-name='Intense Quote'] => blockquote:fresh{font-family: 'Calibri', sans-serif; font-size: 11pt; font-style: italic; margin: 10pt 30pt; padding: 10pt; border-left: 4px solid #ccc; background-color: #f8f8f8;}",
  "p[style-name='Quote'] => blockquote:fresh{font-family: 'Calibri', sans-serif; font-size: 11pt; font-style: italic; margin: 10pt 20pt; padding: 5pt; border-left: 2px solid #eee;}",
  "p[style-name='List Paragraph'] => p:fresh{font-family: 'Calibri', sans-serif; font-size: 11pt; margin-bottom: 5pt; margin-left: 20pt;}",
  
  // Character styles with explicit formatting
  "r[style-name='Strong'] => strong",
  "r[style-name='Emphasis'] => em",
  "r[style-name='Intense Emphasis'] => em{color: #333; font-weight: bold;}",
  "r[style-name='Strong Emphasis'] => strong{font-style: italic;}",
  "r[style-name='Book Title'] => span{font-style: italic;}",
  
  // Tables and list items with better styling
  "table => table{width: 100%; border-collapse: collapse; margin-bottom: 10pt; font-family: 'Calibri', sans-serif; font-size: 11pt;}",
  "tr => tr",
  "td => td{padding: 5pt; border: 1px solid #ddd;}",
  "th => th{padding: 5pt; border: 1px solid #ddd; background-color: #f5f5f5; font-weight: bold;}",
  
  // Lists with proper styling
  "p:unordered-list(1) => ul > li:fresh{font-family: 'Calibri', sans-serif; font-size: 11pt; margin-bottom: 5pt;}",
  "p:unordered-list(2) => ul > li > ul > li:fresh{font-family: 'Calibri', sans-serif; font-size: 11pt; margin-bottom: 5pt;}",
  "p:ordered-list(1) => ol > li:fresh{font-family: 'Calibri', sans-serif; font-size: 11pt; margin-bottom: 5pt;}",
  "p:ordered-list(2) => ol > li > ol > li:fresh{font-family: 'Calibri', sans-serif; font-size: 11pt; margin-bottom: 5pt;}"
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
  // Apply a minimal wrapper that preserves the document structure
  // without overriding the styles from Mammoth's conversion
  return `
  <div class="document-content">
    ${html}
  </div>`;
}