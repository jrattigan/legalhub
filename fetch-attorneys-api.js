// This script uses direct API calls to fetch attorney information
// from law firm websites that expose attorney data via JSON APIs

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

// Sample attorney data with API endpoints that might expose attorney information
const attorneyApiEndpoints = [
  {
    name: 'Cooley LLP',
    baseUrl: 'https://www.cooley.com',
    attorneyEndpoint: '/services/json/attorney?attorney=/people/michael-platt',
    attorneys: [
      { name: 'Michael Platt', endpoint: '/services/json/attorney?attorney=/people/michael-platt', photoField: 'photoUrl' },
      { name: 'Rachel Proffitt', endpoint: '/services/json/attorney?attorney=/people/rachel-proffitt', photoField: 'photoUrl' },
      { name: 'Jodie Bourdet', endpoint: '/services/json/attorney?attorney=/people/jodie-bourdet', photoField: 'photoUrl' }
    ]
  },
  {
    name: 'Wilson Sonsini Goodrich & Rosati',
    baseUrl: 'https://www.wsgr.com',
    attorneyEndpoint: '/api/people/david-j-segre',
    attorneys: [
      { name: 'David Segre', endpoint: '/api/people/david-j-segre', photoField: 'photoUrl' },
      { name: 'Mark Baudler', endpoint: '/api/people/mark-b-baudler', photoField: 'photoUrl' }
    ]
  },
  {
    name: 'Gunderson Dettmer',
    baseUrl: 'https://www.gunder.com',
    attorneyEndpoint: '/wp-json/wp/v2/people?slug=ivan-gaviria',
    attorneys: [
      { name: 'Ivan Gaviria', endpoint: '/wp-json/wp/v2/people?slug=ivan-gaviria', photoField: 'featured_media_url' },
      { name: 'Heidi Walas', endpoint: '/wp-json/wp/v2/people?slug=heidi-walas', photoField: 'featured_media_url' }
    ]
  },
  {
    name: 'Fenwick & West LLP',
    baseUrl: 'https://www.fenwick.com',
    attorneyEndpoint: '/services/api/attorneys/samuel-angus',
    attorneys: [
      { name: 'Samuel Angus', endpoint: '/services/api/attorneys/samuel-angus', photoField: 'photoUrl' },
      { name: 'Cindy Hess', endpoint: '/services/api/attorneys/cindy-hess', photoField: 'photoUrl' }
    ]
  }
];

// Function to make an HTTP/HTTPS request and get JSON response
function fetchJsonFromApi(baseUrl, endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}${endpoint}`;
    console.log(`Fetching data from: ${url}`);
    
    const client = url.startsWith('https') ? https : http;
    
    const request = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json'
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        console.log(`Redirected to: ${redirectUrl}`);
        return fetchJsonFromApi(baseUrl, redirectUrl)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        return reject(new Error(`API request failed with status code: ${response.statusCode}`));
      }
      
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.end();
  });
}

// Download image function (same as before)
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading image from ${url} to ${filepath}`);
    
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

// Main function to fetch attorney data and download photos
async function main() {
  console.log('Starting to fetch attorney data via APIs...');
  
  // Create directory if it doesn't exist
  const dir = './public/attorney-photos';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  for (const lawFirm of attorneyApiEndpoints) {
    console.log(`\nProcessing attorneys from ${lawFirm.name}...`);
    
    for (const attorney of lawFirm.attorneys) {
      try {
        console.log(`\nFetching data for ${attorney.name}...`);
        
        // Fetch attorney data from API
        const data = await fetchJsonFromApi(lawFirm.baseUrl, attorney.endpoint);
        
        // Extract photo URL from response using the specified photo field
        let photoUrl = null;
        
        if (attorney.photoField && data[attorney.photoField]) {
          photoUrl = data[attorney.photoField];
        } else if (data.data && data.data[attorney.photoField]) {
          photoUrl = data.data[attorney.photoField];
        } else if (Array.isArray(data) && data.length > 0 && data[0][attorney.photoField]) {
          photoUrl = data[0][attorney.photoField];
        } else {
          // Try to find any field that might contain a photo URL
          const potentialPhotoFields = ['photo', 'picture', 'image', 'headshot', 'profilePicture', 'avatar'];
          
          for (const field of potentialPhotoFields) {
            if (data[field]) {
              photoUrl = data[field];
              break;
            }
          }
        }
        
        if (!photoUrl) {
          console.log(`Could not find photo URL for ${attorney.name} in the API response`);
          continue;
        }
        
        // Ensure the photo URL is absolute
        if (photoUrl.startsWith('/')) {
          photoUrl = `${lawFirm.baseUrl}${photoUrl}`;
        }
        
        // Download the photo
        const outputPath = `./public/attorney-photos/${attorney.name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
        await downloadImage(photoUrl, outputPath);
        
        console.log(`Successfully downloaded photo for ${attorney.name}`);
      } catch (error) {
        console.error(`Error processing ${attorney.name}:`, error.message);
      }
      
      // Add a delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\nComplete! All attorney data processing finished.');
}

main().catch(error => {
  console.error('Unhandled error in main process:', error);
});