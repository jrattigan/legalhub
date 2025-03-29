/**
 * Utility functions for handling files
 */

/**
 * Converts a File object to a base64 string with data URL prefix
 * Used for document upload and version control
 */
export async function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Keep the full data URL (e.g., "data:application/pdf;base64,BASE64DATA")
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
}

/**
 * Gets the file size in a human-readable format
 */
export function getFormattedFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Gets the file extension from a file name
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * Checks if a file type is allowed
 */
export function isAllowedFileType(file: File, allowedTypes: string[]): boolean {
  const fileExtension = getFileExtension(file.name).toLowerCase();
  return allowedTypes.includes(fileExtension);
}

/**
 * Checks if a file size is within the allowed limit
 */
export function isFileSizeAllowed(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

/**
 * Validates a file based on type and size
 */
export function validateFile(
  file: File, 
  allowedTypes: string[] = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx'], 
  maxSizeInMB: number = 10
): { valid: boolean; error?: string } {
  if (!isAllowedFileType(file, allowedTypes)) {
    return { 
      valid: false, 
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` 
    };
  }
  
  if (!isFileSizeAllowed(file, maxSizeInMB)) {
    return { 
      valid: false, 
      error: `File size exceeds the ${maxSizeInMB}MB limit` 
    };
  }
  
  return { valid: true };
}
