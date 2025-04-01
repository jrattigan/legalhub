// This script uses Puppeteer to navigate to attorney profile pages
// and extract their images, saving them to a local directory
import puppeteer from 'puppeteer';
import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current filename and directory when using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define attorney data with known profile URLs
const attorneys = [
  {
    name: 'Michael Platt',
    url: 'https://www.cooley.com/people/michael-platt',
    outputFilename: 'michael-platt.jpg',
    selectors: [
      'img.attorney-photo',
      'img.attorney-headshot',
      'img.profile-pic',
      '.profile-photo img',
      '.attorney-card__photo img'
    ]
  },
  {
    name: 'Rachel Proffitt',
    url: 'https://www.cooley.com/people/rachel-proffitt',
    outputFilename: 'rachel-proffitt.jpg',
    selectors: [
      'img.attorney-photo',
      'img.attorney-headshot',
      'img.profile-pic',
      '.profile-photo img',
      '.attorney-card__photo img'
    ]
  },
  {
    name: 'Jodie Bourdet',
    url: 'https://www.cooley.com/people/jodie-bourdet',
    outputFilename: 'jodie-bourdet.jpg',
    selectors: [
      'img.attorney-photo',
      'img.attorney-headshot',
      'img.profile-pic',
      '.profile-photo img',
      '.attorney-card__photo img'
    ]
  },
  {
    name: 'David Segre',
    url: 'https://www.wsgr.com/en/people/david-j-segre.html',
    outputFilename: 'david-segre.jpg',
    selectors: [
      '.profile-photo img',
      '.bio-image img',
      '.attorney-photo img',
      '.photo-frame img',
      'img.profile-img'
    ]
  },
  {
    name: 'Mark Baudler',
    url: 'https://www.wsgr.com/en/people/mark-b-baudler.html',
    outputFilename: 'mark-baudler.jpg',
    selectors: [
      '.profile-photo img',
      '.bio-image img',
      '.attorney-photo img',
      '.photo-frame img',
      'img.profile-img'
    ]
  }
];

// Function to download an image
async function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading image from ${url} to ${outputPath}`);
    
    // Determine if http or https based on url
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
        console.log(`Download completed: ${outputPath}`);
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
    
    request.end();
  });
}

// Function to extract image using a list of potential selectors
async function findImageWithSelector(page, selectors) {
  let imageUrl = null;
  
  for (const selector of selectors) {
    try {
      console.log(`Trying selector: ${selector}`);
      const image = await page.$(selector);
      if (image) {
        imageUrl = await page.evaluate(img => img.src, image);
        console.log(`Found image with selector ${selector}: ${imageUrl}`);
        break;
      }
    } catch (error) {
      console.log(`Error with selector ${selector}: ${error.message}`);
    }
  }
  
  return imageUrl;
}

// Function to find images based on properties (fallback)
async function findImageByProperties(page) {
  console.log('Trying to find image by properties...');
  
  try {
    return await page.evaluate(() => {
      // Find all images
      const images = Array.from(document.querySelectorAll('img'));
      
      // Filter for likely profile images - reasonably sized and visible
      const potentialProfileImages = images.filter(img => {
        const rect = img.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight;
        const hasGoodSize = rect.width >= 100 && rect.height >= 100;
        const ratio = rect.width / rect.height;
        const isSquarish = ratio > 0.7 && ratio < 1.3; // Close to square (typical for headshots)
        
        // Check for keywords in alt text, src, or class names
        const imageData = (img.alt + ' ' + img.src + ' ' + img.className).toLowerCase();
        const hasProfileIndicators = /(profile|attorney|headshot|portrait|photo|pic)/i.test(imageData);
        
        return isVisible && hasGoodSize && isSquarish && hasProfileIndicators;
      });
      
      // Sort by size (larger is likely the profile image)
      if (potentialProfileImages.length > 0) {
        potentialProfileImages.sort((a, b) => {
          const aRect = a.getBoundingClientRect();
          const bRect = b.getBoundingClientRect();
          return (bRect.width * bRect.height) - (aRect.width * aRect.height);
        });
        
        return potentialProfileImages[0].src;
      }
      
      return null;
    });
  } catch (error) {
    console.log(`Error finding image by properties: ${error.message}`);
    return null;
  }
}

// Main function
async function main() {
  console.log('Starting attorney image scraping...');
  
  // Create directory if it doesn't exist
  const outputDir = './public/attorney-photos';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Launch browser with minimal settings for Replit
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
    headless: 'new'
  });
  
  // Process each attorney
  for (const attorney of attorneys) {
    console.log(`\nProcessing ${attorney.name}...`);
    
    try {
      const page = await browser.newPage();
      
      // Set a custom user agent to avoid bot detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to the attorney's profile page
      console.log(`Navigating to ${attorney.url}`);
      await page.goto(attorney.url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Wait for any dynamic content to load
      await page.waitForTimeout(2000);
      
      // Take a screenshot for debugging
      await page.screenshot({ path: `${outputDir}/debug-${attorney.name.toLowerCase().replace(/\s+/g, '-')}.png` });
      
      // Try to find the image with our selectors
      let imageUrl = await findImageWithSelector(page, attorney.selectors);
      
      // If no image found with selectors, try fallback method
      if (!imageUrl) {
        console.log('No image found with selectors, trying fallback method...');
        imageUrl = await findImageByProperties(page);
      }
      
      // If we found an image, download it
      if (imageUrl) {
        console.log(`Found image URL: ${imageUrl}`);
        
        // Ensure the URL is absolute
        if (imageUrl.startsWith('/')) {
          const pageUrl = new URL(attorney.url);
          imageUrl = `${pageUrl.origin}${imageUrl}`;
          console.log(`Converted to absolute URL: ${imageUrl}`);
        }
        
        // Download the image
        const outputPath = path.join(outputDir, attorney.outputFilename);
        await downloadImage(imageUrl, outputPath);
        console.log(`Successfully processed ${attorney.name}`);
      } else {
        console.log(`Could not find image for ${attorney.name}`);
      }
      
      await page.close();
    } catch (error) {
      console.error(`Error processing ${attorney.name}:`, error);
    }
    
    // Add a delay between requests to be polite
    console.log('Waiting before next request...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  await browser.close();
  console.log('\nScraping completed!');
}

main().catch(error => {
  console.error('Unhandled error in main process:', error);
});