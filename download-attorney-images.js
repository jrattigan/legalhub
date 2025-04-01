// This script directly downloads attorney profile images from their URLs
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

// Get the current directory name from the current module's URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create the attorney-photos directory if it doesn't exist
const photoDir = path.join(process.cwd(), 'public', 'attorney-photos');
if (!fs.existsSync(photoDir)) {
  fs.mkdirSync(photoDir, { recursive: true });
}

// List of attorneys and their direct image URLs
const attorneys = [
  {
    name: 'Michael Platt',
    imageUrl: 'https://www.cooley.com/-/media/cooley/attorneys/platt-michael.ashx?h=200&w=200',
    lawFirmId: 1
  },
  {
    name: 'Rachel Proffitt',
    imageUrl: 'https://www.cooley.com/-/media/cooley/attorneys/proffitt-rachel.ashx?h=200&w=200',
    lawFirmId: 1
  },
  {
    name: 'Jodie Bourdet',
    imageUrl: 'https://www.cooley.com/-/media/cooley/attorneys/bourdet-jodie.ashx?h=200&w=200',
    lawFirmId: 1
  },
  {
    name: 'David Segre',
    imageUrl: 'https://cdn.wilsonsonsini.com/content/uploads/2020/06/headshot-david-segre.jpg',
    lawFirmId: 2
  },
  {
    name: 'Mark Baudler',
    imageUrl: 'https://cdn.wilsonsonsini.com/content/uploads/2020/06/headshot-mark-baudler.jpg',
    lawFirmId: 2
  },
  {
    name: 'Ivan Gaviria',
    imageUrl: 'https://www.gunder.com/wp-content/uploads/2023/10/Ivan-Gaviria-Photo-Oct-2023-square-400x400.jpg',
    lawFirmId: 3
  },
  {
    name: 'Heidi Walas',
    imageUrl: 'https://www.gunder.com/wp-content/uploads/2022/11/Heidi-Walas-Photo-Nov-2022-square-400x400.jpg',
    lawFirmId: 3
  },
  {
    name: 'Samuel Angus',
    imageUrl: 'https://www.fenwick.com/sites/default/files/styles/individual_page_photo/public/2023-06/samangus.jpg',
    lawFirmId: 4
  },
  {
    name: 'Cindy Hess',
    imageUrl: 'https://www.fenwick.com/sites/default/files/styles/individual_page_photo/public/2021-11/CindyHess.jpg',
    lawFirmId: 4
  },
  {
    name: 'Benjamin Potter',
    imageUrl: 'https://www.lw.com/cdn/MDAwMDAwMDAwMDAwLzAvYy8v/ce5cIm/a-benjamin-potter.jpg',
    lawFirmId: 5
  },
  {
    name: 'Curtis Mo',
    imageUrl: 'https://www.dlapiper.com/sites/default/files/vcard/2022-10/curtis-mo-650-833-2141.jpg',
    lawFirmId: 10
  },
  {
    name: 'Louis Lehot',
    imageUrl: 'https://www.dlapiper.com/sites/default/files/vcard/2022-10/louis-lehot-650-833-2341.jpg',
    lawFirmId: 10
  }
];

// Function to download image given URL
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading image from ${url} to ${filepath}`);
    
    // Determine if we need http or https
    const client = url.startsWith('https') ? https : http;
    
    const request = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/'
      }
    }, (response) => {
      // Check if we got a redirect
      if (response.statusCode === 301 || response.statusCode === 302) {
        console.log(`Redirect to: ${response.headers.location}`);
        // Follow the redirect
        if (response.headers.location) {
          downloadImage(response.headers.location, filepath)
            .then(resolve)
            .catch(reject);
          return;
        }
      }
      
      // Check if we got a successful response
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }
      
      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded image to ${filepath}`);
        resolve();
      });
      
      fileStream.on('error', (err) => {
        fs.unlinkSync(filepath); // Delete the file if there was an error
        reject(err);
      });
    });
    
    request.on('error', (err) => {
      console.error(`Error with request: ${err.message}`);
      reject(err);
    });
    
    // Set a timeout
    request.setTimeout(30000, () => {
      request.abort();
      reject(new Error('Request timed out'));
    });
  });
}

async function downloadAllImages() {
  console.log('Starting to download attorney images...');
  
  for (const attorney of attorneys) {
    try {
      const filePath = path.join(photoDir, `${attorney.name.toLowerCase().replace(/ /g, '-')}.jpg`);
      await downloadImage(attorney.imageUrl, filePath);
      console.log(`Successfully downloaded image for ${attorney.name}`);
    } catch (error) {
      console.error(`Error downloading image for ${attorney.name}:`, error);
    }
  }
  
  console.log('Completed downloading all attorney images');
}

// Run the script
downloadAllImages().catch(console.error);