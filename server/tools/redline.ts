import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateDocumentComparison } from '../document-compare';
import { DocumentVersion } from '@shared/schema';
import { convertDocumentWithStyles } from '../mammoth-style-map';

export interface FileData {
  name: string;
  content: string;
  type: string;
}

/**
 * Extract content from a file and prepare for document comparison
 * @param fileData Object containing file details and content
 * @returns Extracted content ready for comparison
 */
async function prepareFileForComparison(fileData: FileData): Promise<{
  content: string;
  htmlContent?: string;
}> {
  const { content, type, name } = fileData;
  
  // Decode base64 content
  const buffer = Buffer.from(content, 'base64');
  
  // For RTF files, handle them as text with rich formatting
  if (type.includes('application/rtf') || name.toLowerCase().endsWith('.rtf')) {
    try {
      // Convert RTF to a readable text format
      const textContent = buffer.toString('utf-8');
      
      // Create a simple container for RTF content
      const htmlContent = `<div class="rtf-content" style="font-family: 'Calibri', sans-serif; padding: 1rem; white-space: pre-wrap; word-wrap: break-word;">
        <p style="color: #888; text-align: center; margin-bottom: 1rem; font-style: italic;">
          RTF content preview (Original formatting preserved in document viewer)
        </p>
        <div style="border: 1px solid #e5e7eb; padding: 1rem; border-radius: 0.25rem; font-family: monospace; white-space: pre; overflow-x: auto; font-size: 0.8rem; color: #555;">
          ${textContent.substring(0, 500).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
          ${textContent.length > 500 ? '...' : ''}
        </div>
      </div>`;
      
      console.log("RTF content preview created, length:", textContent.length);
      
      return {
        content: content, // Keep original base64 content
        htmlContent: htmlContent
      };
    } catch (error) {
      console.error('Error processing RTF file:', error);
      throw new Error('Failed to process RTF file');
    }
  }
  
  // For Word documents, extract with styling
  if (type.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') || 
      type.includes('application/msword') ||
      name.toLowerCase().endsWith('.docx') ||
      name.toLowerCase().endsWith('.doc')) {
    
    try {
      // Use the same document styling function from mammoth-style-map.ts
      const htmlContent = await convertDocumentWithStyles(buffer);
      return {
        content: content, // Keep original base64 content
        htmlContent: htmlContent
      };
    } catch (error) {
      console.error('Error extracting styled Word content:', error);
      throw new Error('Failed to extract content from Word document');
    }
  }
  
  // For text files, decode and format as HTML
  if (type.includes('text/plain') || 
      name.toLowerCase().endsWith('.txt') || 
      name.toLowerCase().endsWith('.text') || 
      name.toLowerCase().endsWith('.log') ||
      name.toLowerCase().endsWith('.md')) {
    
    try {
      // Decode the text content from base64
      const textContent = buffer.toString('utf-8');
      
      // Format as simple HTML with proper line breaks and spacing preservation
      const htmlContent = `<pre class="text-content" style="font-family: 'Courier New', monospace; white-space: pre-wrap; word-wrap: break-word; margin: 0; font-size: 0.875rem; line-height: 1.5; padding: 1rem; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.25rem; overflow-x: auto; word-break: keep-all;">${
        textContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          // Explicitly preserve line breaks for better rendering
          .replace(/\n/g, '\n')
      }</pre>`;
      
      return {
        content: content, // Keep original base64 content
        htmlContent: htmlContent
      };
    } catch (error) {
      console.error('Error processing text file:', error);
      throw new Error('Failed to process text file');
    }
  }
  
  // For other file types, just return the original content
  return { content: content };
}

/**
 * Clean up any CSS-like content from HTML to prevent it showing as text
 * This specifically targets the CSS patterns seen in the screenshots
 * @param content The HTML content to clean
 * @returns Clean HTML without CSS code showing as text
 */
function cleanupCssContent(content: string): string {
  if (!content) return content;
  
  // Remove any CSS style tags with all content
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove CSS-like content that might be displayed as text
  content = content.replace(/\[style\*=[^\]]*\][^{]*\{[^}]*\}/g, '');
  content = content.replace(/\.[\w\-\.]+\s*\{[^}]*\}/g, '');
  
  // Remove specific style patterns seen in screenshots
  content = content.replace(/\[style\*="text-align:center"\]\s*\{\s*text-align:\s*center\s*!important;\s*\}/g, '');
  content = content.replace(/\[style\*="text-align:right"\]\s*\{\s*text-align:\s*right\s*!important;\s*\}/g, '');
  content = content.replace(/\[style\*="text-align:justify"\]\s*\{\s*text-align:\s*justify\s*!important;\s*\}/g, '');
  content = content.replace(/\[style\*="text-indent"\]\s*\{\s*text-indent:\s*1.5em\s*!important;\s*\}/g, '');
  content = content.replace(/\[style\*="margin-left"\]\s*\{\s*margin-left:\s*1.5em\s*!important;\s*\}/g, '');
  
  // Remove CSS comments that might be displayed as text
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Replace CSS property declarations that might show as text
  content = content.replace(/font-size:\s*\d+pt;/g, '');
  content = content.replace(/margin-bottom:\s*\d+pt;/g, '');
  content = content.replace(/line-height:\s*[\d\.]+;/g, '');
  content = content.replace(/font-family:\s*[^;]+;/g, '');
  
  // Remove CSS class definitions for document elements
  content = content.replace(/\.doc-paragraph,[\s\S]*?\.doc-table-paragraph\s*\{[\s\S]*?\}/g, '');
  
  return content;
}

/**
 * Handle document comparison requests using the same comparison engine
 * as the deal detail page
 */
export async function compareDocuments(req: Request, res: Response) {
  try {
    const { originalFile, newFile } = req.body;
    
    if (!originalFile || !newFile) {
      return res.status(400).json({ error: 'Both original and new files are required' });
    }
    
    console.log(`Comparing documents: ${originalFile.name} and ${newFile.name}`);
    
    // Prepare files for comparison
    const originalProcessed = await prepareFileForComparison(originalFile);
    const newProcessed = await prepareFileForComparison(newFile);
    
    // Create temporary DocumentVersion objects to use with generateDocumentComparison
    const olderVersion = {
      id: 1,
      documentId: 1,
      version: 1,
      fileName: originalFile.name,
      fileContent: originalProcessed.content,
      fileType: originalFile.type,
      uploadedById: 1,
      fileSize: originalProcessed.content.length,
      comment: null,
      createdAt: new Date()
    } as DocumentVersion;
    
    const newerVersion = {
      id: 2,
      documentId: 1,
      version: 2,
      fileName: newFile.name,
      fileContent: newProcessed.content,
      fileType: newFile.type,
      uploadedById: 1,
      fileSize: newProcessed.content.length,
      comment: null,
      createdAt: new Date()
    } as DocumentVersion;
    
    // Use the same document comparison function as the deal detail page
    let diffHtml = await generateDocumentComparison(
      olderVersion, 
      newerVersion,
      originalProcessed.htmlContent,
      newProcessed.htmlContent
    );
    
    // Clean up any CSS-like content from diffHtml before returning
    diffHtml = cleanupCssContent(diffHtml);
    
    // Also clean up the original content if it's HTML
    let originalTextContent = originalProcessed.htmlContent || originalProcessed.content;
    let newTextContent = newProcessed.htmlContent || newProcessed.content;
    
    if (typeof originalTextContent === 'string') {
      originalTextContent = cleanupCssContent(originalTextContent);
    }
    
    if (typeof newTextContent === 'string') {
      newTextContent = cleanupCssContent(newTextContent);
    }
    
    // For the redline tool, simplify the output to a basic HTML structure with
    // only the content differences wrapped in appropriate styling
    const simplifiedDiffHtml = `
      <div style="font-family: 'Calibri', sans-serif; padding: 20px;">
        ${diffHtml}
      </div>
    `;
    
    // Return the comparison result
    return res.status(200).json({
      success: true,
      diff: simplifiedDiffHtml,
      contentV1: originalTextContent,
      contentV2: newTextContent
    });
  } catch (error) {
    console.error('Error comparing documents:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
}