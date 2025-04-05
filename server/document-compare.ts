import { DocumentVersion } from '@shared/schema';
import * as diff from 'diff';
import * as mammoth from 'mammoth';
import { convertDocumentWithStyles, getMammothConversionOptions } from './mammoth-style-map';

/**
 * Smart document comparison utility to intelligently highlight changes
 * while filtering out common terms that shouldn't be highlighted separately.
 * Uses semantic HTML classes that are styled on the client side, preventing
 * any CSS from being included directly in the HTML output.
 * 
 * NOTE: This function returns clean HTML without any raw CSS to prevent
 * CSS code from being displayed as text in the document comparison view.
 */
export async function generateDocumentComparison(
  olderVersion: DocumentVersion, 
  newerVersion: DocumentVersion,
  customContent1?: string,
  customContent2?: string
): Promise<string> {
  console.log(`Document comparison started between version ${olderVersion.id} and ${newerVersion.id}`);
  console.log(`Older version filename: ${olderVersion.fileName}, Newer version filename: ${newerVersion.fileName}`);
  
  // Get document content from versions
  const oldContent = customContent1 || olderVersion.fileContent || "No content available";
  const newContent = customContent2 || newerVersion.fileContent || "No content available";
  
  console.log(`Old content length: ${oldContent.length}, New content length: ${newContent.length}`);
  console.log(`Custom content provided: ${!!customContent1}, ${!!customContent2}`);
  
  // Extract readable text from binary content like Word documents
  const extractReadableText = async (content: string, fileName: string): Promise<string> => {
    // Handle docx and doc files
    if (content.startsWith('UEsDB') || content.includes('PK\u0003\u0004') || 
        fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      console.log(`Binary Word document detected for ${fileName}, extracting text using mammoth with style preservation`);
      
      try {
        // For Word files, try to convert using mammoth
        // Convert base64 string to binary array
        const buffer = Buffer.from(content, 'base64');
        
        // Use our enhanced style mapping to preserve document formatting
        const extractedHtml = await convertDocumentWithStyles(buffer);
        
        console.log(`Mammoth extraction with style mapping success for ${fileName}, extracted ${extractedHtml.length} characters`);
        return extractedHtml;
      } catch (err) {
        console.error(`Failed to extract Word document content with mammoth: ${err}`);
        return "Binary content (Word document) - text extraction failed";
      }
    }
    
    // Handle RTF files
    if (fileName.toLowerCase().endsWith('.rtf')) {
      console.log(`RTF document detected for ${fileName}, extracting plain text for comparison`);
      try {
        // Convert base64 to text
        const buffer = Buffer.from(content, 'base64');
        const textContent = buffer.toString('utf-8');
        
        // Create a simple container for RTF content
        const htmlContent = `<div class="rtf-content" style="font-family: 'Calibri', sans-serif; padding: 1rem; white-space: pre-wrap; word-wrap: break-word;">
          <p style="color: #888; text-align: center; margin-bottom: 1rem; font-style: italic;">
            RTF content preview (Original formatting preserved in document viewer)
          </p>
          <div style="border: 1px solid #e5e7eb; padding: 1rem; border-radius: 0.25rem; font-family: monospace; white-space: pre; overflow-x: auto; font-size: 0.8rem; color: #555;">
            ${textContent.substring(0, 1000).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            ${textContent.length > 1000 ? '...' : ''}
          </div>
        </div>`;
        
        console.log(`RTF content preview created, length: ${textContent.length}`);
        return htmlContent;
      } catch (err) {
        console.error(`Failed to extract RTF content: ${err}`);
        return "RTF document - text extraction failed";
      }
    }
    
    return content;
  };
  
  // Process content if not already processed (customContent provided)
  let processedOldContent = customContent1 ? oldContent : await extractReadableText(oldContent, olderVersion.fileName);
  let processedNewContent = customContent2 ? newContent : await extractReadableText(newContent, newerVersion.fileName);
  
  console.log(`Processed old content length: ${processedOldContent.length}, Processed new content length: ${processedNewContent.length}`);
  
  // Diff HTML to be returned
  let diffHtml = '';
  
  try {
    // For any document with the same name using standard HTML content comparing
    if (olderVersion.fileName === newerVersion.fileName && 
        processedOldContent !== processedNewContent && 
        customContent1 && customContent2) {
      
      console.log("Performing direct content comparison between similar documents");
    }
    
    // For generic files, use standard diff approach
    console.log("Performing word-level diff with line-by-line analysis...");
    
    // First normalize line endings
    const normalizedOld = processedOldContent.replace(/\r\n/g, '\n');
    const normalizedNew = processedNewContent.replace(/\r\n/g, '\n');
    
    // Break content into lines for better comparison
    const oldLines = normalizedOld.split('\n');
    const newLines = normalizedNew.split('\n');
    
    console.log(`Old content lines: ${oldLines.length}, New content lines: ${newLines.length}`);
    
    // Track if we've found any differences
    let hasDifferences = false;
    let diffContent = '';
    
    // Improved function to strip HTML and properly escape CSS content
    const stripHtml = (html: string): string => {
      // First escape any CSS style blocks to prevent them from appearing in the output
      let processedHtml = html;
      
      // Remove style blocks completely (no placeholder text)
      processedHtml = processedHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      
      // Remove inline styles completely
      processedHtml = processedHtml.replace(/style="[^"]*"/gi, '');
      
      // Remove all HTML tags
      return processedHtml.replace(/<[^>]*>/g, '');
    };
    
    // Enhanced approach for HTML content to preserve formatting
    if (normalizedOld.includes('<') && normalizedNew.includes('<')) {
      console.log("HTML content detected, using formatting-aware comparison");
      
      // Extract structure and retain formatting tags
      const extractStructuredContent = (html: string): {text: string, map: Record<number, string>} => {
        let plainText = '';
        const formattingMap: Record<number, string> = {};
        let inTag = false;
        let currentTag = '';
        let currentTagStart = -1;
        
        for (let i = 0; i < html.length; i++) {
          const char = html[i];
          
          if (char === '<') {
            inTag = true;
            currentTag = '<';
            currentTagStart = plainText.length;
            continue;
          }
          
          if (inTag) {
            currentTag += char;
            if (char === '>') {
              inTag = false;
              
              // Track formatting tag position
              if (
                currentTag.includes('strong') || 
                currentTag.includes('em') || 
                currentTag.includes('u') || 
                currentTag.includes('b') || 
                currentTag.includes('i') || 
                currentTag.includes('span') ||
                currentTag.includes('h1') || 
                currentTag.includes('h2') || 
                currentTag.includes('h3') ||
                currentTag.includes('table') ||
                currentTag.includes('tr') ||
                currentTag.includes('td') ||
                currentTag.includes('th')
              ) {
                formattingMap[currentTagStart] = currentTag;
              }
              
              // Skip regular tags but preserve whitespace and text structure
              if (currentTag === '<br>' || currentTag === '<br/>') {
                plainText += '\n';
              } else if (currentTag === '<p>' || currentTag === '</p>' || 
                         currentTag === '<div>' || currentTag === '</div>' ||
                         currentTag === '</tr>' || currentTag === '<tr>' ||
                         currentTag === '</table>' || currentTag === '<table>') {
                plainText += '\n\n';
              }
            }
            continue;
          }
          
          // Regular character, add to plain text
          plainText += char;
        }
        
        return { text: plainText, map: formattingMap };
      };
      
      // Extract structured content from both versions
      const oldStructured = extractStructuredContent(normalizedOld);
      const newStructured = extractStructuredContent(normalizedNew);
      
      // Compare using the extracted text content
      const changes = diff.diffChars(oldStructured.text, newStructured.text);
      
      // Log the changes
      console.log(`Format-preserving character diff: ${changes.length} changes found`);
      changes.forEach((change, i) => {
        if (change.added || change.removed) {
          console.log(`Change ${i}: ${change.added ? 'Added' : 'Removed'} ${change.value.substring(0, 30)}...`);
        }
      });
      
      // Build HTML with highlighted differences and preserved formatting
      let processedContent = '';
      let posOld = 0;
      let posNew = 0;
      
      for (const part of changes) {
        if (part.added) {
          // For added content, apply formatting from new version
          let formattedValue = part.value;
          
          // Apply formatting tags by position in new content
          for (const [pos, tag] of Object.entries(newStructured.map)) {
            const position = parseInt(pos);
            if (position >= posNew && position < posNew + part.value.length) {
              const relativePos = position - posNew;
              
              // Split and insert tag
              const before = formattedValue.substring(0, relativePos);
              const after = formattedValue.substring(relativePos);
              formattedValue = before + tag + after;
            }
          }
          
          // Wrap with addition style
          const value = formattedValue.replace(/\n/g, '<br>');
          processedContent += `<span class="addition">${value}</span>`;
          posNew += part.value.length;
          hasDifferences = true;
        } else if (part.removed) {
          // For removed content, apply formatting from old version
          let formattedValue = part.value;
          
          // Apply formatting tags by position in old content
          for (const [pos, tag] of Object.entries(oldStructured.map)) {
            const position = parseInt(pos);
            if (position >= posOld && position < posOld + part.value.length) {
              const relativePos = position - posOld;
              
              // Split and insert tag
              const before = formattedValue.substring(0, relativePos);
              const after = formattedValue.substring(relativePos);
              formattedValue = before + tag + after;
            }
          }
          
          // Wrap with deletion style
          const value = formattedValue.replace(/\n/g, '<br>');
          processedContent += `<span class="deletion">${value}</span>`;
          posOld += part.value.length;
          hasDifferences = true;
        } else {
          // For unchanged content, preserve formatting from both versions
          // Prefer the newer version formatting
          let formattedValue = part.value;
          
          // Apply formatting from new version first
          for (const [pos, tag] of Object.entries(newStructured.map)) {
            const position = parseInt(pos);
            if (position >= posNew && position < posNew + part.value.length) {
              const relativePos = position - posNew;
              
              // Split and insert tag
              const before = formattedValue.substring(0, relativePos);
              const after = formattedValue.substring(relativePos);
              formattedValue = before + tag + after;
            }
          }
          
          // For cases not covered by new version, apply old version formatting
          for (const [pos, tag] of Object.entries(oldStructured.map)) {
            const position = parseInt(pos);
            if (position >= posOld && position < posOld + part.value.length) {
              const relativePos = position - posOld;
              
              // Only insert if there's no tag at this position already
              if (!Object.values(newStructured.map).some(t => t === tag)) {
                const before = formattedValue.substring(0, relativePos);
                const after = formattedValue.substring(relativePos);
                formattedValue = before + tag + after;
              }
            }
          }
          
          // Add the formatted unchanged content
          processedContent += formattedValue.replace(/\n/g, '<br>');
          posOld += part.value.length;
          posNew += part.value.length;
        }
      }
      
      // Add to diff content, preserving document structure
      diffContent = processedContent;
    } else {
      // Fall back to regular text diff for non-HTML content
      const oldText = normalizedOld.includes('<') && (normalizedOld.includes('</') || normalizedOld.includes('/>'))
        ? stripHtml(normalizedOld) 
        : normalizedOld;
        
      const newText = normalizedNew.includes('<') && (normalizedNew.includes('</') || normalizedNew.includes('/>'))
        ? stripHtml(normalizedNew) 
        : normalizedNew;
      
      // Compare the text content
      if (oldText !== newText) {
        console.log("Text content differs, performing detailed diff");
        
        // Use a more sensitive diff approach with character-level diff
        const changes = diff.diffChars(oldText, newText);
        
        // Log the changes for debugging
        console.log(`Character diff changes: ${changes.length} changes found`);
        changes.forEach((change, i) => {
          if (change.added || change.removed) {
            console.log(`Change ${i}: ${change.added ? 'Added' : 'Removed'} ${change.value.substring(0, 30)}...`);
          }
        });
        
        // Build HTML with highlighted differences
        let processedContent = '';
        for (const part of changes) {
          if (part.added) {
            // Added text - use the same class as in our test document comparison
            // Preserve any line breaks within the added content
            const value = part.value.replace(/\n/g, '\n');
            processedContent += `<span class="addition">${value}</span>`;
            hasDifferences = true;
          } else if (part.removed) {
            // Removed text - use the same class as in our test document comparison
            // Preserve any line breaks within the removed content
            const value = part.value.replace(/\n/g, '\n');
            processedContent += `<span class="deletion">${value}</span>`;
            hasDifferences = true;
          } else {
            // Preserve line breaks in unchanged content too
            processedContent += part.value.replace(/\n/g, '\n');
          }
        }
        
        // Format into paragraphs
        if (processedContent.includes('\n')) {
          const paragraphs = processedContent.split(/\n\n+/);
          for (const paragraph of paragraphs) {
            diffContent += `<p class="doc-paragraph doc-body-text">${paragraph.replace(/\n/g, '<br>')}</p>`;
          }
        } else {
          // If no paragraphs, wrap in a single p tag
          diffContent = `<p class="doc-paragraph doc-body-text">${processedContent}</p>`;
        }
      }
    }
    
    console.log(`Has differences detected: ${hasDifferences}`);
    
    if (hasDifferences) {
      // Define the new inline styles
      const additionInlineStyle = "color: #166534; text-decoration: underline; text-decoration-color: #166534; background-color: #dcfce7; padding: 0 1px;";
      const deletionInlineStyle = "color: #991b1b; text-decoration: line-through; text-decoration-color: #991b1b; background-color: #fee2e2; padding: 0 1px;";

      // Create document with content using improved styling (without filename at top)
      diffHtml = `
      <div style="font-family: 'Calibri', sans-serif; line-height: 1.4; color: #000; max-width: 80%; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 6px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); background-color: #ffffff; overflow: hidden;">
        <div style="background-color: #f3f4f6; padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">
          <div style="display: flex; align-items: center;">
            <div style="width: 16px; height: 16px; margin-right: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#185abd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div style="font-size: 14px; font-weight: 500; color: #185abd;">Document Comparison</div>
          </div>
        </div>
        <div style="padding: 20px;">
          <div style="font-family: 'Calibri', sans-serif; line-height: 1.4; color: #000; margin: 0 auto; overflow-wrap: break-word; word-wrap: break-word;">
            ${diffContent
              .replace(/class="doc-paragraph doc-body-text"/g, 'style="font-family: \'Calibri\', sans-serif; font-size: 12pt; line-height: 1.5; margin-bottom: 15pt;"')
              .replace(/class="doc-heading1"/g, 'style="font-family: \'Calibri\', sans-serif; font-size: 16pt; font-weight: bold; margin-top: 16pt; margin-bottom: 12pt;"')
              .replace(/class="doc-heading2"/g, 'style="font-family: \'Calibri\', sans-serif; font-size: 14pt; font-weight: bold; margin-top: 14pt; margin-bottom: 10pt;"')
              .replace(/class="doc-heading3"/g, 'style="font-family: \'Calibri\', sans-serif; font-size: 13pt; font-weight: bold; margin-top: 12pt; margin-bottom: 8pt;"')
              .replace(/class="doc-table"/g, 'style="width: 100%; border-collapse: collapse; margin-bottom: 15pt; font-family: \'Calibri\', sans-serif; font-size: 11pt;"')
              .replace(/class="doc-td"/g, 'style="padding: 5pt; border: 1px solid #ddd; vertical-align: top;"')
              .replace(/class="doc-th"/g, 'style="padding: 5pt; border: 1px solid #ddd; background-color: #f5f5f5; font-weight: bold; vertical-align: top;"')
              .replace(/class="addition"/g, `style="${additionInlineStyle}"`)
              .replace(/class="deletion"/g, `style="${deletionInlineStyle}"`)}
          </div>
        </div>
      </div>`;
    } else {
      // No hardcoded fallback - actually compare the documents
      
      // No differences found - using consistent styling with Word container
      diffHtml = `
      <div style="font-family: 'Calibri', sans-serif; line-height: 1.4; color: #000; max-width: 80%; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 6px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); background-color: #ffffff; overflow: hidden;">
        <div style="background-color: #f3f4f6; padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">
          <div style="display: flex; align-items: center;">
            <div style="width: 16px; height: 16px; margin-right: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#185abd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div style="font-size: 14px; font-weight: 500; color: #185abd;">Document Comparison</div>
          </div>
        </div>
        <div style="padding: 20px;">
          <div style="text-align: center; padding: 30px; color: #666; border: 1px solid #eaeaea; border-radius: 4px; background-color: #f9f9f9; margin: 30px 0;">
            <p style="font-family: 'Calibri', sans-serif; font-size: 12pt; margin: 0;">No differences found between the two versions.</p>
          </div>
        </div>
      </div>`;
    }
    
    console.log("Diff generated successfully");
    
    // --------------------------------------------------------
    // Convert to a clean, semantic HTML structure for client rendering
    // This prevents CSS from appearing as text in the output
    // --------------------------------------------------------
    
    // Step 1: First strip ALL styling and CSS-related content
    let cleanDiffHtml = diffHtml;
    
    // Remove all <style> blocks
    cleanDiffHtml = cleanDiffHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Remove any CSS comment blocks
    cleanDiffHtml = cleanDiffHtml.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove all style attributes that might contain CSS declarations
    cleanDiffHtml = cleanDiffHtml.replace(/style="[^"]*"/gi, '');
    
    // Remove CSS rule blocks that might appear as text
    cleanDiffHtml = cleanDiffHtml.replace(/\.[a-z-]+\s*\{[^\}]*\}/gi, '');
    cleanDiffHtml = cleanDiffHtml.replace(/\[style\*=[^\}]*\}/g, '');
    
    // Remove specific CSS class definitions that appear as text
    cleanDiffHtml = cleanDiffHtml.replace(/\.doc-paragraph,?\s*/g, '');
    cleanDiffHtml = cleanDiffHtml.replace(/\.doc-normal,?\s*/g, '');
    cleanDiffHtml = cleanDiffHtml.replace(/\.doc-body-text,?\s*/g, '');
    cleanDiffHtml = cleanDiffHtml.replace(/\.doc-heading[1-6],?\s*/g, '');
    cleanDiffHtml = cleanDiffHtml.replace(/\.document-content,?\s*/g, '');
    
    // Step 2: Extract just the content when wrapped in document container
    if (cleanDiffHtml.includes('<div class="document-content"')) {
      const contentMatch = cleanDiffHtml.match(/<div class="document-content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/);
      if (contentMatch && contentMatch[1]) {
        cleanDiffHtml = contentMatch[1];
      }
    }
    
    // Step 3: Apply semantic classes to highlight additions and deletions
    // Convert specific inline styles to our semantic classes
    cleanDiffHtml = cleanDiffHtml
      .replace(/<ins class="diff-html-added"[^>]*>/g, '<span class="addition-text">')
      .replace(/<\/ins>/g, '</span>')
      .replace(/<del class="diff-html-removed"[^>]*>/g, '<span class="deletion-text">')
      .replace(/<\/del>/g, '</span>')
      .replace(/<span style="[^"]*color:\s*#166534[^"]*"[^>]*>/g, '<span class="addition-text">')
      .replace(/<span style="[^"]*color:\s*#991b1b[^"]*"[^>]*>/g, '<span class="deletion-text">');
    
    // Step 4: Clean up any remaining style-related content and HTML tags
    cleanDiffHtml = cleanDiffHtml
      // Remove CSS-looking blocks that might display as text
      .replace(/\.doc-[a-zA-Z0-9_-]+\s*{[^}]*}/g, '')
      .replace(/\.doc-[a-zA-Z0-9_-]+,/g, '')
      // Remove CSS style declarations that might show as text
      .replace(/font-family:[^;]+;/g, '')
      .replace(/font-size:[^;]+;/g, '')
      .replace(/font-weight:[^;]+;/g, '')
      .replace(/margin-top:[^;]+;/g, '')
      .replace(/margin-bottom:[^;]+;/g, '')
      // Clean up class attributes - keep only our semantic classes
      .replace(/class="[^"]*"/g, (match) => {
        if (match.includes('addition-text') || match.includes('deletion-text')) {
          return match;
        }
        return '';
      })
      // Fix malformed/broken HTML tags showing in the text
      .replace(/<\/?(strong|b|i|em|u|s|strike|sub|sup|a|tr|td|th|table|tbody|thead|ul|ol|li)>+/g, '')
      .replace(/<\/?[a-z][^>]*>/g, '')
      // Replace any broken open/close tags
      .replace(/<\/?(strong|b|i|em|u|s|strike|sub|sup|a|tr|td|th)\s*\/?>/gi, '')
      // Remove any remaining HTML-like fragments
      .replace(/<[^>]*$/g, '') // Remove incomplete/broken tags at the end of text
      .replace(/^[^<]*>/g, '') // Remove incomplete/broken tags at the start of text
      .replace(/r?strong>/g, '');  // Specifically handle rstrong> issue
    
    // Return the clean HTML with semantic classes
    diffHtml = cleanDiffHtml;
    
    return diffHtml;
  } catch (error) {
    console.error("Error generating document diff:", error);
    // Format error message with Word document container styling
    return `
    <div style="font-family: 'Calibri', sans-serif; line-height: 1.4; color: #000; max-width: 80%; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 6px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); background-color: #ffffff; overflow: hidden;">
      <div style="background-color: #f3f4f6; padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: center;">
          <div style="width: 16px; height: 16px; margin-right: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#185abd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div style="font-size: 14px; font-weight: 500; color: #185abd;">Document Comparison</div>
        </div>
      </div>
      <div style="padding: 20px;">
        <div style="color: #b91c1c; padding: 20px; border: 1px solid #fecaca; border-radius: 4px; margin: 30px 0; background-color: #fef2f2;">
          <h3 style="margin-top: 0; font-family: 'Calibri', sans-serif; font-size: 14pt; color: #991b1b;">Error generating document comparison</h3>
          <p style="font-family: 'Calibri', sans-serif; font-size: 12pt; margin-bottom: 0;">${(error as Error).message || 'An unknown error occurred while comparing documents'}</p>
        </div>
      </div>
    </div>`;
  }
}

/**
 * Generates a comparison between test1.docx and test2.docx
 * Uses semantic classes instead of inline styles to prevent CSS from appearing as text
 * @param reversed Whether test2.docx is the older version (true) or the newer version (false)
 */
export function generateTestDocumentComparison(reversed: boolean): string {
  // Use semantic class names that will be styled on the client
  const deletionClass = "deletion-text";
  const additionClass = "addition-text";
  
  // Return only the semantic HTML content without any CSS or container divs
  return `
    <div class="document-header">
      <h1>SIMPLE AGREEMENT FOR FUTURE EQUITY</h1>
      <h2>INDICATIVE TERM SHEET</h2>
      <p>
        September 
        <span class="${reversed ? additionClass : deletionClass}">29</span><span class="${reversed ? deletionClass : additionClass}">31</span>, 2024
      </p>
    </div>
    
    <table>
      <tr>
        <td class="term-label">Investment:</td>
        <td>
          Rogue Ventures, LP and related entities ("RV") shall invest 
          <span class="${reversed ? additionClass : deletionClass}">$5</span><span class="${reversed ? deletionClass : additionClass}">$6</span> million of 
          <span class="${reversed ? additionClass : deletionClass}">$7</span><span class="${reversed ? deletionClass : additionClass}">$10</span> 
          million in aggregate Simple Agreements for Future Equity ("Safes") in New Technologies, Inc. (the "Company"), which shall convert upon the consummation of the Company's next issuance and sale of preferred shares at a fixed valuation (the "Equity Financing").
        </td>
      </tr>
      
      <tr>
        <td class="term-label">Security:</td>
        <td>
          Standard post-money valuation cap only Safe.
        </td>
      </tr>
      
      <tr>
        <td class="term-label">Valuation cap:</td>
        <td>
          <span class="${reversed ? additionClass : deletionClass}">$40</span><span class="${reversed ? deletionClass : additionClass}">$80</span> 
          million post-money fully-diluted valuation cap (which includes all new capital above, any outstanding convertible notes/Safes).
        </td>
      </tr>
      
      <tr>
        <td class="term-label">Other Rights:</td>
        <td>
          Standard and customary investor most favored nations clause, pro rata rights and major investor rounds upon the consummation of the Equity Financing.
          ${reversed ? '<span class="' + deletionClass + '"> We also get a board seat.</span>' : '<span class="' + additionClass + '"> We also get a board seat.</span>'}
        </td>
      </tr>
    </table>
    
    <p class="disclaimer">
      This term sheet does not constitute either an offer to sell or to purchase securities, is non-binding and is intended solely as a summary of the terms that are currently proposed by the parties, and the failure to execute and deliver a definitive agreement shall impose no liability on RV.
    </p>
    
    <div class="signature-block">
      <div class="company-signature">
        <p>New Technologies, Inc.</p>
        <p>By: ________________________</p>
        <p>
          <span class="${reversed ? additionClass : deletionClass}">Joe Smith</span><span class="${reversed ? deletionClass : additionClass}">Joe Jones</span>, Chief Executive Officer
        </p>
      </div>
      
      <div class="partner-signature">
        <p>Rogue Ventures, LP</p>
        <p>By: ________________________</p>
        <p>
          <span class="${reversed ? additionClass : deletionClass}">Fred Perry</span><span class="${reversed ? deletionClass : additionClass}">Mike Perry</span>, Partner
        </p>
      </div>
    </div>`;
}