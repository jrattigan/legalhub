// This script uses Playwright in a special way for Replit environments
// where browser dependencies might be limited

import { chromium } from 'playwright-chromium';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const attorneyData = [
  {
    name: 'Michael Platt',
    url: 'https://www.cooley.com/people/michael-platt',
    outputPath: './public/attorney-photos/michael-platt.jpg'
  },
  {
    name: 'Rachel Proffitt',
    url: 'https://www.cooley.com/people/rachel-proffitt',
    outputPath: './public/attorney-photos/rachel-proffitt.jpg'
  },
  {
    name: 'Jodie Bourdet',
    url: 'https://www.cooley.com/people/jodie-bourdet',
    outputPath: './public/attorney-photos/jodie-bourdet.jpg'
  },
  {
    name: 'David Segre',
    url: 'https://www.wsgr.com/en/people/david-j-segre.html',
    outputPath: './public/attorney-photos/david-segre.jpg'
  },
  {
    name: 'Mark Baudler',
    url: 'https://www.wsgr.com/en/people/mark-b-baudler.html',
    outputPath: './public/attorney-photos/mark-baudler.jpg'
  }
];

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading image from ${url} to ${filepath}`);
    
    // Determine if http or https based on url
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        console.log(`Redirect to: ${redirectUrl}`);
        return downloadImage(redirectUrl, filepath)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download image: Status code ${response.statusCode}`));
      }

      // Check content type
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.startsWith('image/')) {
        return reject(new Error(`Invalid content type: ${contentType}`));
      }

      const fileStream = fs.createWriteStream(filepath);
      
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Download completed: ${filepath}`);
        resolve(filepath);
      });
      
      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete the file on error
        reject(err);
      });
    }).on('error', (err) => {
      console.error(`Error with request: ${err.message}`);
      reject(err);
    });
  });
}

async function scrapeAttorneyImage(attorney) {
  console.log(`Scraping photo for ${attorney.name} from ${attorney.url}`);
  
  try {
    // Use playwright without browser download
    const browser = await chromium.launch({
      chromiumSandbox: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set a custom user agent to avoid bot detection
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    
    await page.goto(attorney.url, { waitUntil: 'networkidle' });
    
    // Wait for images to load
    await page.waitForTimeout(2000);
    
    // Look for avatar or profile images based on common patterns
    const imageSelectors = [
      'img.attorney-profile-image',
      'img.attorney-photo',
      'img.profile-image',
      'img.headshot',
      '.attorney-photo img',
      '.profile-photo img',
      '.attorney-image img',
      '.bio-image img',
      '.attorney-headshot img'
    ];
    
    let imageUrl = null;
    
    for (const selector of imageSelectors) {
      const image = await page.$(selector);
      if (image) {
        imageUrl = await image.getAttribute('src');
        console.log(`Found image with selector ${selector}: ${imageUrl}`);
        break;
      }
    }
    
    // If specific selectors don't work, try to find any large image that might be a profile photo
    if (!imageUrl) {
      console.log('Using fallback method to find profile image');
      
      // Get all images
      const images = await page.$$eval('img', (imgs) => {
        return imgs.map(img => {
          const rect = img.getBoundingClientRect();
          return {
            src: img.src,
            width: rect.width,
            height: rect.height,
            alt: img.alt || '',
            isVisible: rect.width > 0 && rect.height > 0
          };
        });
      });
      
      // Filter for likely profile images - reasonably sized, visible, with relevant alt text
      const potentialProfileImages = images.filter(img => 
        img.isVisible && 
        img.width >= 100 && img.height >= 100 && 
        (
          img.alt.toLowerCase().includes(attorney.name.toLowerCase()) || 
          img.alt.toLowerCase().includes('profile') || 
          img.alt.toLowerCase().includes('attorney') || 
          img.alt.toLowerCase().includes('headshot') || 
          img.alt.toLowerCase().includes('portrait')
        )
      );
      
      if (potentialProfileImages.length > 0) {
        // Sort by size, assuming largest relevant image is the profile photo
        potentialProfileImages.sort((a, b) => (b.width * b.height) - (a.width * a.height));
        imageUrl = potentialProfileImages[0].src;
        console.log(`Found image using fallback method: ${imageUrl}`);
      }
    }
    
    await browser.close();
    
    if (imageUrl) {
      // Ensure the URL is absolute
      if (imageUrl.startsWith('/')) {
        const pageUrl = new URL(attorney.url);
        imageUrl = `${pageUrl.origin}${imageUrl}`;
        console.log(`Converted relative URL to absolute: ${imageUrl}`);
      }
      
      // Download the image
      await downloadImage(imageUrl, attorney.outputPath);
      return { name: attorney.name, success: true, path: attorney.outputPath };
    } else {
      console.log(`Could not find image for ${attorney.name}`);
      return { name: attorney.name, success: false };
    }
    
  } catch (error) {
    console.error(`Error scraping image for ${attorney.name}:`, error);
    return { name: attorney.name, success: false, error: error.message };
  }
}

async function main() {
  console.log('Starting attorney image scraping process...');
  
  // Create directory if it doesn't exist
  const dir = './public/attorney-photos';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const results = [];
  
  // Process attorneys sequentially to avoid overwhelming the target sites
  for (const attorney of attorneyData) {
    const result = await scrapeAttorneyImage(attorney);
    results.push(result);
    
    // Add a delay between requests to be respectful to the servers
    if (attorney !== attorneyData[attorneyData.length - 1]) {
      console.log('Waiting before next request...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('\nScraping completed!');
  console.log('Summary:');
  results.forEach(result => {
    console.log(`${result.name}: ${result.success ? 'Success' : 'Failed'}`);
  });
}

main().catch(error => {
  console.error('Unhandled error in main process:', error);
});