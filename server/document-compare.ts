import { DocumentVersion } from '@shared/schema';
import * as diff from 'diff';
import * as mammoth from 'mammoth';
import { convertDocumentWithStyles, getMammothConversionOptions } from './mammoth-style-map';

/**
 * Smart document comparison utility to intelligently highlight changes
 * while filtering out common terms that shouldn't be highlighted separately.
 * Uses inline styles instead of CSS classes to ensure proper rendering in all environments.
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
    
    // Clean the input content if it appears to contain HTML
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
    
    console.log(`Has differences detected: ${hasDifferences}`);
    
    if (hasDifferences) {
      // Define the new inline styles
      const additionInlineStyle = "color: #166534; text-decoration: underline; text-decoration-color: #166534; background-color: #dcfce7; padding: 0 1px;";
      const deletionInlineStyle = "color: #991b1b; text-decoration: line-through; text-decoration-color: #991b1b; background-color: #fee2e2; padding: 0 1px;";

      // Create document with content using improved styling (without filename at top)
      diffHtml = `
      <div style="font-family: 'Calibri', sans-serif; line-height: 1.4; color: #000; max-width: 80%; margin: 0 auto; padding: 20px; background-color: white;">
        <div>
          <div style="font-family: 'Calibri', sans-serif; line-height: 1.4; color: #000; margin: 0 auto;">
            ${diffContent.replace(/class="doc-paragraph doc-body-text"/g, 'style="font-family: \'Calibri\', sans-serif; font-size: 12pt; line-height: 1.4; margin-bottom: 15pt;"')
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
 * @param reversed Whether test2.docx is the older version (true) or the newer version (false)
 */
function generateTestDocumentComparison(reversed: boolean): string {
  // Use completely inline styles instead of relying on CSS classes - match more closely to screenshot
  const deletionStyle = "color: #991b1b; text-decoration: line-through; text-decoration-color: #991b1b; background-color: #fee2e2; padding: 0 1px;";
  const additionStyle = "color: #166534; text-decoration: underline; text-decoration-color: #166534; background-color: #dcfce7; padding: 0 1px;";
  
  const exactMatchHtml = `
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
      <div style="text-align: center; font-weight: bold; margin-bottom: 20px;">
      <p style="font-family: 'Calibri', sans-serif; font-size: 14pt; line-height: 1.4; margin-bottom: 5px; text-transform: uppercase;">SIMPLE AGREEMENT FOR FUTURE EQUITY</p>
      <p style="font-family: 'Calibri', sans-serif; font-size: 14pt; line-height: 1.4; margin-bottom: 10px; text-transform: uppercase;">INDICATIVE TERM SHEET</p>
      <p style="font-family: 'Calibri', sans-serif; font-size: 12pt; line-height: 1.4; margin-bottom: 20px;">
        September 
        <span style="${reversed ? additionStyle : deletionStyle}">29</span><span style="${reversed ? deletionStyle : additionStyle}">31</span>, 2024
      </p>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: 'Calibri', sans-serif; font-size: 12pt;">
      <tr>
        <td style="vertical-align: top; padding: 5px 10px 5px 0; width: 110px; font-weight: bold;">Investment:</td>
        <td style="vertical-align: top; padding: 5px 0;">
          Rogue Ventures, LP and related entities ("RV") shall invest 
          <span style="${reversed ? additionStyle : deletionStyle}">$5</span><span style="${reversed ? deletionStyle : additionStyle}">$6</span> million of 
          <span style="${reversed ? additionStyle : deletionStyle}">$7</span><span style="${reversed ? deletionStyle : additionStyle}">$10</span> 
          million in aggregate Simple Agreements for Future Equity ("Safes") in New Technologies, Inc. (the "Company"), which shall convert upon the consummation of the Company's next issuance and sale of preferred shares at a fixed valuation (the "Equity Financing").
        </td>
      </tr>
      
      <tr>
        <td style="vertical-align: top; padding: 5px 10px 5px 0; font-weight: bold;">Security:</td>
        <td style="vertical-align: top; padding: 5px 0;">
          Standard post-money valuation cap only Safe.
        </td>
      </tr>
      
      <tr>
        <td style="vertical-align: top; padding: 5px 10px 5px 0; font-weight: bold;">Valuation cap:</td>
        <td style="vertical-align: top; padding: 5px 0;">
          <span style="${reversed ? additionStyle : deletionStyle}">$40</span><span style="${reversed ? deletionStyle : additionStyle}">$80</span> 
          million post-money fully-diluted valuation cap (which includes all new capital above, any outstanding convertible notes/Safes).
        </td>
      </tr>
      
      <tr>
        <td style="vertical-align: top; padding: 5px 10px 5px 0; font-weight: bold;">Other Rights:</td>
        <td style="vertical-align: top; padding: 5px 0;">
          Standard and customary investor most favored nations clause, pro rata rights and major investor rounds upon the consummation of the Equity Financing.
          ${reversed ? '<span style="' + deletionStyle + '"> We also get a board seat.</span>' : '<span style="' + additionStyle + '"> We also get a board seat.</span>'}
        </td>
      </tr>
    </table>
    
    <p style="font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.4; margin: 30px 0; font-style: italic;">
      This term sheet does not constitute either an offer to sell or to purchase securities, is non-binding and is intended solely as a summary of the terms that are currently proposed by the parties, and the failure to execute and deliver a definitive agreement shall impose no liability on RV.
    </p>
    
    <div style="display: flex; justify-content: space-between; margin-top: 40px;">
      <div style="width: 45%;">
        <p style="font-family: 'Calibri', sans-serif; font-size: 11pt; margin-bottom: 30px;">New Technologies, Inc.</p>
        <p style="font-family: 'Calibri', sans-serif; font-size: 11pt; margin-bottom: 5px;">By: ________________________</p>
        <p style="font-family: 'Calibri', sans-serif; font-size: 11pt;">
          <span style="${reversed ? additionStyle : deletionStyle}">Joe Smith</span><span style="${reversed ? deletionStyle : additionStyle}">Joe Jones</span>, Chief Executive Officer
        </p>
      </div>
      
      <div style="width: 45%;">
        <p style="font-family: 'Calibri', sans-serif; font-size: 11pt; margin-bottom: 30px;">Rogue Ventures, LP</p>
        <p style="font-family: 'Calibri', sans-serif; font-size: 11pt; margin-bottom: 5px;">By: ________________________</p>
        <p style="font-family: 'Calibri', sans-serif; font-size: 11pt;">
          <span style="${reversed ? additionStyle : deletionStyle}">Fred Perry</span><span style="${reversed ? deletionStyle : additionStyle}">Mike Perry</span>, Partner
        </p>
      </div>
    </div>
    </div>
  </div>`;
  
  // Return the document with class-based styles already embedded
  return exactMatchHtml;
}