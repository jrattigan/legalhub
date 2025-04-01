import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// List of attorneys with their photo URLs
const attorneys = [
  { name: "Michael Platt", photoUrl: "https://www.cooley.com/-/media/cooley/attorneys/platt-michael.jpg" },
  { name: "Rachel Proffitt", photoUrl: "https://www.cooley.com/-/media/cooley/attorneys/proffitt-rachel.jpg" },
  { name: "Jodie Bourdet", photoUrl: "https://www.cooley.com/-/media/cooley/attorneys/bourdet-jodie.jpg" },
  { name: "David Segre", photoUrl: "https://cdn.wilsonsonsini.com/content/uploads/2020/06/headshot-david-segre.jpg" },
  { name: "Mark Baudler", photoUrl: "https://cdn.wilsonsonsini.com/content/uploads/2020/06/headshot-mark-baudler.jpg" },
  { name: "Ivan Gaviria", photoUrl: "https://www.gunder.com/wp-content/uploads/2023/10/Ivan-Gaviria-Photo-Oct-2023-square-400x400.jpg" },
  { name: "Heidi Walas", photoUrl: "https://www.gunder.com/wp-content/uploads/2022/11/Heidi-Walas-Photo-Nov-2022-square-400x400.jpg" },
  { name: "Samuel Angus", photoUrl: "https://www.fenwick.com/sites/default/files/styles/individual_page_photo/public/2023-06/samangus.jpg" },
  { name: "Cindy Hess", photoUrl: "https://www.fenwick.com/sites/default/files/styles/individual_page_photo/public/2021-11/CindyHess.jpg" },
  { name: "Benjamin Potter", photoUrl: "https://www.lw.com/cdn/MDAwMDAwMDAwMDAwLzAvYy8v/ce5cIm/a-benjamin-potter.jpg" },
  { name: "John Bautista", photoUrl: "https://www.orrick.com/-/media/images/people/b/john-bautista.jpg" },
  { name: "Harold Yu", photoUrl: "https://www.orrick.com/-/media/images/people/y/harold-yu.jpg" },
  { name: "Anthony McCusker", photoUrl: "https://www.goodwinlaw.com/-/media/images/people/m/mccusker-anthony.jpg" },
  { name: "Fiona Brophy", photoUrl: "https://www.perkinscoie.com/images/content/7/2/v2/72178/Brophy-Fiona-hs-2023.jpg" },
  { name: "Timothy Harris", photoUrl: "https://media.mofo.com/images/content/7/4/74909.jpg" },
  { name: "Curtis Mo", photoUrl: "https://www.dlapiper.com/sites/default/files/vcard/2022-10/curtis-mo-650-833-2141.jpg" },
  { name: "Louis Lehot", photoUrl: "https://www.dlapiper.com/sites/default/files/vcard/2022-10/louis-lehot-650-833-2341.jpg" }
];

// Directory to save the photos
const outputDir = path.join(process.cwd(), 'public', 'attorney-photos');

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Created directory: ${outputDir}`);
}

/**
 * Format attorney name for filename (converts to lowercase, replaces spaces with hyphens)
 * @param {string} name - The attorney name
 * @returns {string} Formatted name for filename
 */
function formatNameForFilename(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Download an image from a URL to a file
 * @param {string} url - The URL of the image
 * @param {string} outputPath - The output file path
 * @returns {Promise<void>} A promise that resolves when the download is complete
 */
function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading image from ${url} to ${outputPath}`);
    
    // Choose http or https based on the URL
    const client = url.startsWith('https') ? https : http;
    
    const request = client.get(url, (response) => {
      // Check if we got a redirect
      if (response.statusCode === 301 || response.statusCode === 302) {
        console.log(`Following redirect to: ${response.headers.location}`);
        return downloadImage(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
      }
      
      // Check if the request was successful
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download image: ${response.statusCode}`));
      }
      
      // Save the image to a file
      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded: ${outputPath}`);
        resolve();
      });
      
      fileStream.on('error', (err) => {
        fs.unlinkSync(outputPath); // Clean up the file
        reject(err);
      });
    });
    
    request.on('error', (err) => {
      reject(err);
    });
    
    // Set a timeout
    request.setTimeout(30000, () => {
      request.abort();
      reject(new Error(`Request timeout for ${url}`));
    });
  });
}

/**
 * Download all attorney photos
 */
async function downloadAllPhotos() {
  console.log(`Starting download of ${attorneys.length} attorney photos...`);
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const attorney of attorneys) {
    const formattedName = formatNameForFilename(attorney.name);
    const outputPath = path.join(outputDir, `${formattedName}.jpg`);
    
    try {
      await downloadImage(attorney.photoUrl, outputPath);
      successCount++;
    } catch (error) {
      console.error(`Error downloading photo for ${attorney.name}:`, error.message);
      failureCount++;
      
      // Try an alternative approach - use curl with a different User-Agent
      try {
        console.log(`Trying alternative download method for ${attorney.name}...`);
        const curlCmd = `curl -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" "${attorney.photoUrl}" -o "${outputPath}" --silent`;
        execSync(curlCmd);
        console.log(`Alternative download successful for ${attorney.name}`);
        successCount++;
        failureCount--; // Adjust the failure count since we recovered
      } catch (curlError) {
        console.error(`Alternative download failed for ${attorney.name}:`, curlError.message);
      }
    }
  }
  
  console.log(`\nDownload summary:`);
  console.log(`- Total attorneys: ${attorneys.length}`);
  console.log(`- Successfully downloaded: ${successCount}`);
  console.log(`- Failed to download: ${failureCount}`);
}

// Run the download function
downloadAllPhotos().catch(console.error);