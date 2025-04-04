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
  // Paragraph styles
  "p[style-name='Normal'] => p.normal:fresh",
  "p[style-name='Body Text'] => p.body-text:fresh",
  "p[style-name='Table Paragraph'] => p.table-paragraph:fresh",
  
  // Heading styles
  "p[style-name='Heading 1'] => h1.heading1:fresh",
  "p[style-name='Heading 2'] => h2.heading2:fresh",
  "p[style-name='Heading 3'] => h3.heading3:fresh",
  "p[style-name='Title'] => h1.title:fresh",
  "p[style-name='Subtitle'] => h2.subtitle:fresh",
  
  // Other paragraph styles
  "p[style-name='Caption'] => p.caption:fresh",
  "p[style-name='Intense Quote'] => blockquote.intense-quote:fresh",
  "p[style-name='Quote'] => blockquote.quote:fresh",
  "p[style-name='List Paragraph'] => p.list-paragraph:fresh",
  
  // Character styles
  "r[style-name='Strong'] => strong",
  "r[style-name='Emphasis'] => em",
  "r[style-name='Intense Emphasis'] => em.intense-emphasis",
  "r[style-name='Strong Emphasis'] => strong.strong-emphasis",
  "r[style-name='Book Title'] => span.book-title",
  
  // Tables and list items
  "table => table.document-table",
  "p:unordered-list(1) => ul > li:fresh",
  "p:unordered-list(2) => ul > li > ul > li:fresh",
  "p:ordered-list(1) => ol > li:fresh",
  "p:ordered-list(2) => ol > li > ol > li:fresh"
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
  // Apply styles directly using inline style attributes instead of a style tag
  return `
  <div class="document-content" style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #333; margin: 0; padding: 0;">
    ${html}
  </div>`;
}