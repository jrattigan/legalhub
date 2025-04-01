import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Download image from URL to a file path
 * @param {string} url - The URL of the image to download
 * @param {string} filePath - The path where the image will be saved
 * @returns {Promise<void>} A promise that resolves when the download is complete
 */
function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading image from ${url} to ${filePath}`);
    
    const file = fs.createWriteStream(filePath);
    
    https.get(url, response => {
      // Check if response is successful
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: Status code ${response.statusCode}`));
        return;
      }
      
      // Pipe the response data to the file
      response.pipe(file);
      
      // Handle file completion
      file.on('finish', () => {
        file.close(() => {
          // Check file size to ensure it's valid
          const stats = fs.statSync(filePath);
          if (stats.size === 0) {
            fs.unlinkSync(filePath); // Delete zero-byte file
            reject(new Error(`Downloaded file is empty: ${filePath}`));
          } else {
            console.log(`Successfully downloaded image to ${filePath} (${stats.size} bytes)`);
            resolve();
          }
        });
      });
      
      // Handle errors
      file.on('error', err => {
        fs.unlinkSync(filePath); // Delete file on error
        reject(err);
      });
    }).on('error', err => {
      fs.unlink(filePath, () => {}); // Try to delete file on error
      reject(err);
    });
  });
}

async function fixMissingPhoto() {
  // Fix Emily Chen's photo
  const photoUrl = 'https://images.unsplash.com/photo-1596075780750-81249df16d19?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400';
  const outputPath = path.join(process.cwd(), 'public', 'attorney-photos', 'emily-chen.jpg');
  
  try {
    await downloadImage(photoUrl, outputPath);
    console.log('Fixed Emily Chen photo successfully!');
  } catch (error) {
    console.error('Error fixing missing photo:', error);
  }
}

// Run the function
fixMissingPhoto();