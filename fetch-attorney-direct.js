// Simple script to directly fetch attorney photos from known URLs

import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current filename and directory when using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define direct image URLs for attorneys
// These are common URL patterns for attorney profile photos
const attorneys = [
  {
    name: 'Michael Platt',
    imageUrls: [
      'https://www.cooley.com/-/media/cooley/attorneys/p/platt-michael/platt-michael.jpg',
      'https://www.cooley.com/~/media/cooley/attorneys/p/platt-michael.ashx',
      'https://www.cooley.com/people/-/media/images/people/p/michael-platt.jpg'
    ],
    outputFilename: 'michael-platt.jpg'
  },
  {
    name: 'Rachel Proffitt',
    imageUrls: [
      'https://www.cooley.com/-/media/cooley/attorneys/p/proffitt-rachel/proffitt-rachel.jpg',
      'https://www.cooley.com/~/media/cooley/attorneys/p/proffitt-rachel.ashx',
      'https://www.cooley.com/people/-/media/images/people/p/rachel-proffitt.jpg'
    ],
    outputFilename: 'rachel-proffitt.jpg'
  },
  {
    name: 'Jodie Bourdet',
    imageUrls: [
      'https://www.cooley.com/-/media/cooley/attorneys/b/bourdet-jodie/bourdet-jodie.jpg',
      'https://www.cooley.com/~/media/cooley/attorneys/b/bourdet-jodie.ashx',
      'https://www.cooley.com/people/-/media/images/people/b/jodie-bourdet.jpg'
    ],
    outputFilename: 'jodie-bourdet.jpg'
  },
  {
    name: 'David Segre',
    imageUrls: [
      'https://www.wsgr.com/-/media/wilson-sonsini-2023/images/professionals/s/david-j-segre/segre_david.jpg',
      'https://www.wsgr.com/-/media/assets/attorneys/segre-david.jpg',
      'https://www.wsgr.com/content/dam/wsgr/attorneys/segre-david.jpg'
    ],
    outputFilename: 'david-segre.jpg'
  },
  {
    name: 'Mark Baudler',
    imageUrls: [
      'https://www.wsgr.com/-/media/wilson-sonsini-2023/images/professionals/b/mark-b-baudler/baudler_mark.jpg',
      'https://www.wsgr.com/-/media/assets/attorneys/baudler-mark.jpg',
      'https://www.wsgr.com/content/dam/wsgr/attorneys/baudler-mark.jpg'
    ],
    outputFilename: 'mark-baudler.jpg'
  },
  {
    name: 'Ivan Gaviria',
    imageUrls: [
      'https://www.gunder.com/wp-content/uploads/2023/10/Ivan-Gaviria-Photo-Oct-2023-square-400x400.jpg',
      'https://www.gunder.com/wp-content/uploads/attorneys/ivan-gaviria.jpg',
      'https://www.gunder.com/attorneys/ivan-gaviria/profile.jpg'
    ],
    outputFilename: 'ivan-gaviria.jpg'
  },
  {
    name: 'Heidi Walas',
    imageUrls: [
      'https://www.gunder.com/wp-content/uploads/2022/11/Heidi-Walas-Photo-Nov-2022-square-400x400.jpg',
      'https://www.gunder.com/wp-content/uploads/attorneys/heidi-walas.jpg',
      'https://www.gunder.com/attorneys/heidi-walas/profile.jpg'
    ],
    outputFilename: 'heidi-walas.jpg'
  },
  {
    name: 'Samuel Angus',
    imageUrls: [
      'https://www.fenwick.com/sites/default/files/styles/individual_page_photo/public/2023-06/samangus.jpg',
      'https://www.fenwick.com/SiteAssets/Service%20Professionals/angus_samuel.jpg',
      'https://www.fenwick.com/attorneys/samuel-angus/profile.jpg'
    ],
    outputFilename: 'samuel-angus.jpg'
  },
  {
    name: 'Cindy Hess',
    imageUrls: [
      'https://www.fenwick.com/sites/default/files/styles/individual_page_photo/public/2021-11/CindyHess.jpg',
      'https://www.fenwick.com/SiteAssets/Service%20Professionals/hess_cindy.jpg',
      'https://www.fenwick.com/attorneys/cindy-hess/profile.jpg'
    ],
    outputFilename: 'cindy-hess.jpg'
  }
];

// Function to download an image
function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to download from ${url} to ${outputPath}`);
    
    const client = url.startsWith('https') ? https : http;
    
    const request = client.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        
        // Handle relative redirects
        let absoluteRedirectUrl = redirectUrl;
        if (redirectUrl.startsWith('/')) {
          const parsedUrl = new URL(url);
          absoluteRedirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
        }
        
        console.log(`Redirected to: ${absoluteRedirectUrl}`);
        return downloadImage(absoluteRedirectUrl, outputPath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download image: Status code ${response.statusCode}`));
      }
      
      // Check content type to ensure it's an image
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.startsWith('image/')) {
        return reject(new Error(`Invalid content type: ${contentType}`));
      }
      
      const fileStream = fs.createWriteStream(outputPath);
      
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`SUCCESS - Downloaded to: ${outputPath}`);
        resolve(outputPath);
      });
      
      fileStream.on('error', (err) => {
        fs.unlink(outputPath, () => {}); // Delete the file async on error
        reject(err);
      });
    });
    
    request.on('error', (err) => {
      console.error(`Error with request: ${err.message}`);
      reject(err);
    });
    
    // Set a timeout to prevent hanging
    request.setTimeout(10000, () => {
      request.abort();
      reject(new Error('Request timed out'));
    });
    
    request.end();
  });
}

// Main function to try all image URLs for each attorney
async function main() {
  console.log('Starting attorney image download...');
  
  // Create directory if it doesn't exist
  const outputDir = './public/attorney-photos';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Process each attorney
  for (const attorney of attorneys) {
    console.log(`\nProcessing ${attorney.name}...`);
    
    let success = false;
    
    // Try each URL until one works
    for (const imageUrl of attorney.imageUrls) {
      try {
        const outputPath = path.join(outputDir, attorney.outputFilename);
        await downloadImage(imageUrl, outputPath);
        console.log(`Successfully downloaded photo for ${attorney.name}`);
        success = true;
        break; // Break after successful download
      } catch (error) {
        console.log(`Failed with URL ${imageUrl}: ${error.message}`);
        // Continue trying next URL
      }
    }
    
    if (!success) {
      console.log(`Could not download any image for ${attorney.name}`);
    }
    
    // Add a pause between attorneys to be nice to servers
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\nDownload process completed!');
}

main().catch(error => {
  console.error('Unhandled error in main process:', error);
});