import * as diff from 'diff';

/**
 * Interface for file data coming from the client
 */
interface FileData {
  name: string;
  content: string;
  type: string;
}

/**
 * Process document text content based on file type
 * @param fileData File data from client
 * @returns Processed content
 */
function processDocumentContent(fileData: FileData): string {
  const { name, content, type } = fileData;
  
  // Detect file type based on extension
  const fileExtension = name.substring(name.lastIndexOf('.')).toLowerCase();
  
  // Process different file types
  if (fileExtension === '.docx' || fileExtension === '.doc') {
    // For now, basic handling - in the future we can extract text from binary docs
    if (content.startsWith('UEsDB') || content.includes('PK\u0003\u0004')) {
      return "Binary Word document - limited text extraction";
    }
    return content;
  } else if (fileExtension === '.pdf') {
    // Basic PDF handling - just plain text for now
    return content;
  } else if (fileExtension === '.rtf') {
    // Basic RTF handling - strip RTF markup (simplified)
    return content.replace(/\{\\rtf1.*?\\viewkind4/, '')
      .replace(/\\\w+\s?/g, ' ')
      .replace(/\{|\}/g, '')
      .trim();
  } else {
    // Default text handling
    return content;
  }
}

/**
 * Generate HTML diff between two documents
 * @param originalFile Original file data
 * @param newFile New file data
 * @returns HTML diff content and processed source files
 */
export async function generateDocumentDiff(
  originalFile: FileData,
  newFile: FileData
): Promise<{
  diff: string;
  contentV1: string;
  contentV2: string;
}> {
  try {
    // Process file contents
    const processedOriginal = processDocumentContent(originalFile);
    const processedNew = processDocumentContent(newFile);
    
    // Create diff
    const changes = diff.diffWords(processedOriginal, processedNew);
    
    // Check if there are differences
    const hasDifferences = changes.some(part => part.added || part.removed);
    
    let diffHtml = '';
    
    if (hasDifferences) {
      // Process content with Word-like styling
      let processedContent = '';
      for (const part of changes) {
        if (part.added) {
          // Added text - green with Word-like styling (underline with background)
          processedContent += `<span style="color: #166534; text-decoration: underline; text-decoration-color: #166534; background-color: #dcfce7; display: inline;">${part.value}</span>`;
        } else if (part.removed) {
          // Removed text - red with Word-like styling (strikethrough with background)
          processedContent += `<span style="color: #991b1b; text-decoration: line-through; text-decoration-color: #991b1b; background-color: #fee2e2; display: inline;">${part.value}</span>`;
        } else {
          processedContent += part.value;
        }
      }
      
      // Format into paragraphs
      let formattedContent = '';
      if (processedContent.includes('\n')) {
        const paragraphs = processedContent.split(/\n\n+/);
        for (const paragraph of paragraphs) {
          formattedContent += `<p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 10pt;">${paragraph.replace(/\n/g, '<br>')}</p>`;
        }
      } else {
        // If no paragraphs, wrap in a single p tag
        formattedContent = `<p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 10pt;">${processedContent}</p>`;
      }
      
      // Create document with title and content - using Word-like styling
      diffHtml = `
      <div class="document-compare" style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #333; margin: 0;">
        <div class="full-document-with-changes">
          <div class="document-content" style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #333; margin: 0; padding: 0;">
            <h1 style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 16pt; font-weight: bold; color: #000; text-align: center; margin-bottom: 24pt;">${newFile.name}</h1>
            ${formattedContent}
          </div>
        </div>
      </div>`;
    } else {
      // No differences found
      diffHtml = `
      <div class="document-compare" style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #333;">
        <div class="no-differences" style="text-align: center; padding: 20px; color: #666;">
          <p>No differences found between the two versions.</p>
          <p class="text-sm">The documents appear to be identical.</p>
        </div>
      </div>`;
    }
    
    console.log("Diff generated successfully");
    
    return {
      diff: diffHtml,
      contentV1: processedOriginal,
      contentV2: processedNew
    };
  } catch (error) {
    console.error("Error generating document diff:", error);
    // Format error message
    const errorHtml = `
    <div class="document-compare" style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #333;">
      <div class="error" style="color: #b91c1c; padding: 20px; border: 1px solid #fecaca; border-radius: 4px; margin: 10px 0;">
        <h3 style="margin-top: 0;">Error generating document comparison</h3>
        <p>${(error as Error).message || 'An unknown error occurred while comparing documents'}</p>
      </div>
    </div>`;
    
    return {
      diff: errorHtml,
      contentV1: "Error processing original document",
      contentV2: "Error processing new document"
    };
  }
}