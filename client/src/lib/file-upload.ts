/**
 * File upload utilities for interacting with the server-side file storage
 */

/**
 * Upload a file to the temporary storage
 * @param files An array of files to upload
 * @returns Response with file URLs
 */
export async function uploadFilesToServer(files: File[]): Promise<{
  files: Array<{
    originalname: string;
    filename: string;
    path: string;
    url: string;
    size: number;
    mimetype: string;
  }>;
}> {
  if (!files.length) {
    throw new Error('No files provided for upload');
  }
  
  const formData = new FormData();
  files.forEach(file => {
    formData.append('documents', file);
  });
  
  try {
    const response = await fetch('/api/temp-upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload files: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error uploading files:', error);
    throw error;
  }
}