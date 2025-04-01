import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define attorneys who need photos
const attorneys = [
  "Curtis Mo",
  "Louis Lehot",
  "David Segre",
  "Mark Baudler"
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
    console.log(`Successfully downloaded to ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`Failed to download with curl: ${error.message}`);
    return false;
  }
}

/**
 * Search for and download attorney images
 */
async function findAndDownloadAttorneyImages() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  console.log(`Starting to find and download images for ${attorneys.length} attorneys...`);
  
  try {
    for (const attorneyName of attorneys) {
      const page = await browser.newPage();
      
      // Set a realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      // Search for the attorney's professional headshot
      const searchQuery = `${attorneyName} lawyer headshot professional`;
      console.log(`Searching for: ${searchQuery}`);
      
      try {
        // Go to Google Images
        await page.goto('https://www.google.com/imghp?hl=en&ogbl', { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Type in search query
        await page.type('input[name="q"]', searchQuery);
        await page.keyboard.press('Enter');
        
        // Wait for search results to load
        await page.waitForSelector('img[data-src]', { timeout: 60000 });
        
        // Wait an additional moment for images to load
        await page.waitForTimeout(2000);
        
        // Get all image elements
        const imageElements = await page.$$('img[data-src]');
        
        if (imageElements.length > 0) {
          // Get the first few image URLs
          const imageUrls = [];
          const maxImagesToCheck = Math.min(5, imageElements.length);
          
          for (let i = 0; i < maxImagesToCheck; i++) {
            const imgElement = imageElements[i];
            const imgUrl = await page.evaluate(el => el.getAttribute('src') || el.getAttribute('data-src'), imgElement);
            if (imgUrl) {
              imageUrls.push(imgUrl);
            }
          }
          
          if (imageUrls.length > 0) {
            // Use the first image that looks like a valid headshot
            const formattedName = formatNameForFilename(attorneyName);
            const outputPath = path.join(outputDir, `${formattedName}.jpg`);
            
            // Try to download one of the images
            let downloadSuccess = false;
            for (const imgUrl of imageUrls) {
              if (await downloadWithCurl(imgUrl, outputPath)) {
                downloadSuccess = true;
                console.log(`✓ Successfully downloaded image for ${attorneyName}`);
                break;
              }
            }
            
            if (!downloadSuccess) {
              console.log(`✗ Failed to download any images for ${attorneyName}`);
            }
          } else {
            console.log(`No image URLs found for ${attorneyName}`);
          }
        } else {
          console.log(`No image elements found for ${attorneyName}`);
        }
      } catch (error) {
        console.error(`Error processing ${attorneyName}: ${error.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  
  console.log('Image search and download process completed');
}

// Run the function
findAndDownloadAttorneyImages().catch(console.error);