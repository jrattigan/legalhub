import { Request, Response } from 'express';
import * as diff from 'diff';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as mammoth from 'mammoth';

export interface FileData {
  name: string;
  content: string;
  type: string;
}

/**
 * Extract text content from a Word document (.doc, .docx)
 * @param content The binary content of the document
 * @returns A promise that resolves to the extracted text
 */
async function extractWordContent(content: string): Promise<string> {
  try {
    // Create a temporary file
    const tmpdir = os.tmpdir();
    const tempFilePath = path.join(tmpdir, `temp_${Date.now()}.docx`);
    
    // Decode the base64 content
    const buffer = Buffer.from(content, 'base64');
    
    // Write to temp file
    fs.writeFileSync(tempFilePath, buffer);
    
    // Extract text from the Word document
    const result = await mammoth.extractRawText({ path: tempFilePath });
    
    // Clean up
    fs.unlinkSync(tempFilePath);
    
    return result.value;
  } catch (error) {
    console.error('Error extracting Word content:', error);
    throw new Error('Failed to extract content from Word document');
  }
}

/**
 * Extract text content from a file based on its type
 * @param fileData Object containing file details and content
 * @returns The extracted text content
 */
async function extractFileContent(fileData: FileData): Promise<string> {
  const { content, type } = fileData;
  
  if (type.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') || 
      type.includes('application/msword')) {
    return await extractWordContent(content);
  } else if (type.includes('text/plain') || type.includes('text/html') || type.includes('application/rtf')) {
    // For plain text, HTML, or RTF, we can use the content directly (decoded from base64)
    return Buffer.from(content, 'base64').toString('utf-8');
  } else {
    // For unsupported file types, return a message
    throw new Error(`Unsupported file type: ${type}`);
  }
}

/**
 * Generate HTML with highlighted differences between two texts
 * @param oldText Original text
 * @param newText Updated text
 * @returns HTML string with differences highlighted
 */
function generateDiffHtml(oldText: string, newText: string): string {
  // Generate diff
  const differences = diff.diffWords(oldText, newText);
  
  // Convert to HTML with styling
  let html = '';
  differences.forEach((part) => {
    const color = part.added 
      ? '<span class="bg-green-100">' 
      : part.removed 
        ? '<span class="bg-red-100">' 
        : '<span>';
    
    html += color + part.value + '</span>';
  });
  
  return html;
}

/**
 * Handle document comparison requests
 */
export async function compareDocuments(req: Request, res: Response) {
  try {
    const { originalFile, newFile } = req.body;
    
    if (!originalFile || !newFile) {
      return res.status(400).json({ error: 'Both original and new files are required' });
    }
    
    // Extract content from both files
    const originalContent = await extractFileContent(originalFile);
    const newContent = await extractFileContent(newFile);
    
    // Generate diff HTML
    const diffHtml = generateDiffHtml(originalContent, newContent);
    
    // Return the comparison result
    return res.status(200).json({
      success: true,
      diff: diffHtml,
      contentV1: originalContent,
      contentV2: newContent
    });
  } catch (error) {
    console.error('Error comparing documents:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
}