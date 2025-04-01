// This script uses Playwright to fetch attorney profile images from law firm websites
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Create the attorney-photos directory if it doesn't exist
const photoDir = path.join(process.cwd(), 'public', 'attorney-photos');
if (!fs.existsSync(photoDir)) {
  fs.mkdirSync(photoDir, { recursive: true });
}

// List of attorneys and their profile page URLs
const attorneys = [
  {
    name: 'Michael Platt',
    url: 'https://www.cooley.com/people/michael-platt',
    photoSelector: '.bio-profile > .profile-img img',
    lawFirmId: 1
  },
  {
    name: 'Rachel Proffitt',
    url: 'https://www.cooley.com/people/rachel-proffitt',
    photoSelector: '.bio-profile > .profile-img img',
    lawFirmId: 1
  },
  {
    name: 'Jodie Bourdet',
    url: 'https://www.cooley.com/people/jodie-bourdet',
    photoSelector: '.bio-profile > .profile-img img',
    lawFirmId: 1
  },
  {
    name: 'David Segre',
    url: 'https://www.wsgr.com/en/people/david-j-segre.html',
    photoSelector: '.person-image img',
    lawFirmId: 2
  },
  {
    name: 'Mark Baudler',
    url: 'https://www.wsgr.com/en/people/mark-l-baudler.html',
    photoSelector: '.person-image img',
    lawFirmId: 2
  },
  {
    name: 'Ivan Gaviria',
    url: 'https://www.gunder.com/attorneys/ivan-gaviria/',
    photoSelector: '.attorney-header__image img',
    lawFirmId: 3
  },
  {
    name: 'Heidi Walas',
    url: 'https://www.gunder.com/attorneys/heidi-walas/',
    photoSelector: '.attorney-header__image img',
    lawFirmId: 3
  },
  {
    name: 'Samuel Angus',
    url: 'https://www.fenwick.com/people/samuel-angus',
    photoSelector: '.c-bio-main__profile-image img',
    lawFirmId: 4
  },
  {
    name: 'Cindy Hess',
    url: 'https://www.fenwick.com/people/cindy-hess',
    photoSelector: '.c-bio-main__profile-image img',
    lawFirmId: 4
  },
  {
    name: 'Benjamin Potter',
    url: 'https://www.lw.com/people/benjamin-potter',
    photoSelector: '.bio-page__image-wrapper img',
    lawFirmId: 5
  },
  {
    name: 'Curtis Mo',
    url: 'https://www.dlapiper.com/en-us/people/m/mo-curtis',
    photoSelector: '.bio-image img',
    lawFirmId: 10
  },
  {
    name: 'Louis Lehot',
    url: 'https://www.dlapiper.com/en-us/people/l/lehot-louis',
    photoSelector: '.bio-image img',
    lawFirmId: 10
  }
];

// Function to download image given URL
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
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
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function fetchImages() {
  const browser = await chromium.launch({ headless: true });
  
  for (const attorney of attorneys) {
    try {
      console.log(`Fetching image for ${attorney.name} from ${attorney.url}`);
      
      const page = await browser.newPage();
      
      // Add some headers to look like a real browser
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/'
      });
      
      await page.goto(attorney.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      // Wait a bit for any JavaScript to execute
      await page.waitForTimeout(3000);
      
      // Try to get the image
      const imgElement = await page.$(attorney.photoSelector);
      
      if (imgElement) {
        const srcAttribute = await imgElement.getAttribute('src');
        
        if (srcAttribute) {
          // Get the absolute URL
          const imageUrl = new URL(srcAttribute, attorney.url).href;
          const filePath = path.join(photoDir, `${attorney.name.toLowerCase().replace(/ /g, '-')}.jpg`);
          
          await downloadImage(imageUrl, filePath);
          console.log(`Successfully saved image for ${attorney.name}`);
        } else {
          console.log(`No src attribute found for ${attorney.name}'s image`);
        }
      } else {
        console.log(`Selector ${attorney.photoSelector} not found for ${attorney.name}`);
      }
      
      await page.close();
    } catch (error) {
      console.error(`Error fetching image for ${attorney.name}:`, error);
    }
  }
  
  await browser.close();
  console.log('Completed fetching all attorney images');
}

// Run the script
fetchImages().catch(console.error);