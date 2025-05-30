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
  // Paragraph styles
  "p[style-name='Normal'] => p.doc-normal:fresh",
  "p[style-name='Body Text'] => p.doc-body-text:fresh",
  "p[style-name='Table Paragraph'] => p.doc-table-paragraph:fresh",
  
  // Default paragraph - simplified to avoid complex formatting issues
  "p => p:fresh",
  
  // Heading styles - simplified
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => h2:fresh",
  
  // Other paragraph styles - simplified
  "p[style-name='Caption'] => p:fresh",
  "p[style-name='Intense Quote'] => blockquote:fresh",
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='List Paragraph'] => p:fresh",
  
  // Character styles - simplified and using spans instead of semantic elements
  // This helps prevent broken HTML tags appearing in the document comparison
  "r[style-name='Strong'] => span.doc-strong",
  "r[style-name='Emphasis'] => span.doc-emphasis",
  "r[style-name='Intense Emphasis'] => span.doc-intense-emphasis",
  "r[style-name='Strong Emphasis'] => span.doc-strong-emphasis",
  "r[style-name='Book Title'] => span.doc-book-title",
  
  // Tables - using div-based layout to avoid HTML tag leakage
  "table => div.doc-table",
  "tr => div.doc-row",
  "td => div.doc-cell",
  "th => div.doc-header",
  
  // Lists
  "p:unordered-list(1) => ul > li.doc-list-item:fresh",
  "p:unordered-list(2) => ul > li > ul > li.doc-list-item-2:fresh",
  "p:ordered-list(1) => ol > li.doc-list-item:fresh",
  "p:ordered-list(2) => ol > li > ol > li.doc-list-item-2:fresh"
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
    // Create options with image conversion to data URIs
    const options = {
      ...getMammothConversionOptions(),
      convertImage: mammoth.images.imgElement(function(image) {
        return image.read("base64").then(function(imageBuffer) {
          const mimeType = image.contentType || "image/png";
          return {
            src: `data:${mimeType};base64,${imageBuffer}`,
            alt: "Document image",
            style: "max-width: 100%"
          };
        });
      })
    };
    
    const result = await mammoth.convertToHtml(
      { buffer },
      options
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
 * Wrap the HTML with document container but without exposing CSS as text
 * @param html The HTML content
 * @returns The wrapped HTML with semantic structure
 */
function wrapWithDocumentStyles(html: string): string {
  // For document comparison purposes, we want to preserve the document structure
  // but avoid including CSS that might be rendered as text in the diff view
  return `<div class="document-content">${html}</div>`;
}