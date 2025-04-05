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
    // Use 'as DocumentVersion' to handle any possible type mismatch
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
    const diffHtml = await generateDocumentComparison(
      olderVersion, 
      newerVersion,
      originalProcessed.htmlContent,
      newProcessed.htmlContent
    );
    
    // For consistency, keep returning the original text content
    const originalTextContent = originalProcessed.htmlContent || originalProcessed.content;
    const newTextContent = newProcessed.htmlContent || newProcessed.content;
    
    // Return the comparison result
    return res.status(200).json({
      success: true,
      diff: diffHtml,
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