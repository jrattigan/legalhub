import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define missing attorneys and sample professional headshots from reliable sources
const attorneys = [
  { 
    name: "Curtis Mo", 
    photoUrl: "https://media.licdn.com/dms/image/C5603AQFlUmrPKoLMmw/profile-displayphoto-shrink_800_800/0/1516240890945?e=2147483647&v=beta&t=ZKN2T4J0ODuYUoNr5SmrqQvJBj5OKUwJQOPq5K5_JZ8" 
  },
  { 
    name: "Louis Lehot", 
    photoUrl: "https://media.licdn.com/dms/image/C5603AQEt_rS19luJJw/profile-displayphoto-shrink_800_800/0/1586544369007?e=2147483647&v=beta&t=vRv-mFPcGGAEKXZ26Fy8shF7nL7wHFwK4LVpwDQsWi4" 
  },
  { 
    name: "David Segre", 
    photoUrl: "https://media.licdn.com/dms/image/C5603AQEOgKaoL9mVcg/profile-displayphoto-shrink_800_800/0/1607466870656?e=2147483647&v=beta&t=wsjS6pKJg8zXrJn_mQvw80GgDbcoEaRd3m-4AZl6uaY" 
  },
  { 
    name: "Mark Baudler", 
    photoUrl: "https://media.licdn.com/dms/image/C5603AQGF-SWyfc_mKA/profile-displayphoto-shrink_800_800/0/1517355730348?e=1717027200&v=beta&t=_YbQxRYg9_3kF20PfOJV73E9hfzCcUMSAocS_r2n8VE" 
  }
];

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
 * Download an image using curl
 * @param {string} url - The URL of the image
 * @param {string} outputPath - The file path to save the image
 */
function downloadWithCurl(url, outputPath) {
  try {
    console.log(`Downloading with curl: ${url}`);
    const curlCmd = `curl -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" "${url}" -o "${outputPath}" --silent`;
    execSync(curlCmd);
    
    // Check if the file was successfully downloaded and has content
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      console.log(`✓ Successfully downloaded image for ${path.basename(outputPath)}`);
      return true;
    } else {
      console.log(`✗ Download resulted in empty file for ${path.basename(outputPath)}`);
      return false;
    }
  } catch (error) {
    console.error(`Failed to download with curl: ${error.message}`);
    return false;
  }
}

/**
 * Download all attorney photos
 */
async function downloadRemainingPhotos() {
  console.log(`Starting download of ${attorneys.length} remaining attorney photos...`);
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const attorney of attorneys) {
    const formattedName = formatNameForFilename(attorney.name);
    const outputPath = path.join(outputDir, `${formattedName}.jpg`);
    
    console.log(`Processing ${attorney.name}...`);
    
    if (await downloadWithCurl(attorney.photoUrl, outputPath)) {
      successCount++;
    } else {
      failureCount++;
    }
  }
  
  console.log(`\nDownload summary:`);
  console.log(`- Total attorneys: ${attorneys.length}`);
  console.log(`- Successfully downloaded: ${successCount}`);
  console.log(`- Failed to download: ${failureCount}`);
}

// Run the function
downloadRemainingPhotos().catch(console.error);