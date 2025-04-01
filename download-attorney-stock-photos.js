import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define a list of attorneys with implied gender and ethnicity for appropriate stock photo selection
const attorneys = [
  { name: 'Michael Platt', gender: 'male', ethnicity: 'caucasian' },
  { name: 'Rachel Proffitt', gender: 'female', ethnicity: 'caucasian' },
  { name: 'Jodie Bourdet', gender: 'female', ethnicity: 'caucasian' },
  { name: 'David Segre', gender: 'male', ethnicity: 'caucasian' },
  { name: 'Mark Baudler', gender: 'male', ethnicity: 'caucasian' },
  { name: 'Ivan Gaviria', gender: 'male', ethnicity: 'hispanic' },
  { name: 'Heidi Walas', gender: 'female', ethnicity: 'caucasian' },
  { name: 'Samuel Angus', gender: 'male', ethnicity: 'caucasian' },
  { name: 'Cindy Hess', gender: 'female', ethnicity: 'caucasian' },
  { name: 'Benjamin Potter', gender: 'male', ethnicity: 'caucasian' },
  { name: 'John Bautista', gender: 'male', ethnicity: 'hispanic' },
  { name: 'Harold Yu', gender: 'male', ethnicity: 'asian' },
  { name: 'Anthony McCusker', gender: 'male', ethnicity: 'caucasian' },
  { name: 'Fiona Brophy', gender: 'female', ethnicity: 'caucasian' },
  { name: 'Timothy Harris', gender: 'male', ethnicity: 'caucasian' },
  { name: 'Curtis Mo', gender: 'male', ethnicity: 'asian' },
  { name: 'Louis Lehot', gender: 'male', ethnicity: 'caucasian' },
  { name: 'Emily Chen', gender: 'female', ethnicity: 'asian' },
  { name: 'David Lee', gender: 'male', ethnicity: 'asian' },
  { name: 'James Johnson', gender: 'male', ethnicity: 'caucasian' },
  { name: 'John Smith', gender: 'male', ethnicity: 'caucasian' },
  { name: 'Robert Miller', gender: 'male', ethnicity: 'caucasian' },
  { name: 'Sarah Wilson', gender: 'female', ethnicity: 'caucasian' }
];

// Stock photo URLs based on gender and ethnicity combinations
// These are royalty-free professional headshot stock photos
const stockPhotos = {
  'male_caucasian': [
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400',
    'https://images.unsplash.com/photo-1600486913747-55e5470d6f40?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400'
  ],
  'female_caucasian': [
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400'
  ],
  'male_asian': [
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400',
    'https://images.unsplash.com/photo-1618835962148-cf177563c6c0?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400'
  ],
  'female_asian': [
    'https://images.unsplash.com/photo-1596075780750-81249df16d19?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400',
    'https://images.unsplash.com/photo-1619945202267-7a610214d3e0?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400'
  ],
  'male_hispanic': [
    'https://images.unsplash.com/photo-1531384441138-2736e62e0919?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400',
    'https://images.unsplash.com/photo-1623605931891-d5b95ee98459?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400',
    'https://images.unsplash.com/photo-1584043720379-b56cd9199c94?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400'
  ],
  'female_hispanic': [
    'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=400'
  ]
};

/**
 * Format attorney name for filename (converts to lowercase, replaces spaces with hyphens)
 * @param {string} name - The attorney name
 * @returns {string} Formatted name for filename
 */
function formatNameForFilename(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Get a random photo URL based on gender and ethnicity
 * @param {string} gender - 'male' or 'female'
 * @param {string} ethnicity - 'caucasian', 'asian', 'hispanic', etc.
 * @returns {string} A stock photo URL
 */
function getStockPhotoUrl(gender, ethnicity) {
  const key = `${gender}_${ethnicity}`;
  const photos = stockPhotos[key] || stockPhotos['male_caucasian']; // Fallback
  return photos[Math.floor(Math.random() * photos.length)];
}

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

/**
 * Main function to download all attorney photos
 */
async function downloadAllAttorneyPhotos() {
  // Create directory if it doesn't exist
  const photosDir = path.join(process.cwd(), 'public', 'attorney-photos');
  if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true });
  }
  
  console.log(`Starting download of ${attorneys.length} attorney photos...`);
  
  // Process each attorney
  const results = { success: 0, failure: 0 };
  
  for (const attorney of attorneys) {
    try {
      const photoUrl = getStockPhotoUrl(attorney.gender, attorney.ethnicity);
      const filename = formatNameForFilename(attorney.name) + '.jpg';
      const outputPath = path.join(photosDir, filename);
      
      // Download the image
      await downloadImage(photoUrl, outputPath);
      results.success++;
      
      // Add a small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`Error downloading photo for ${attorney.name}:`, error.message);
      results.failure++;
    }
  }
  
  console.log('\nDownload summary:');
  console.log(`✅ Successfully downloaded: ${results.success} photos`);
  console.log(`❌ Failed downloads: ${results.failure} photos`);
  
  console.log('\nProcess complete!');
}

// Run the function
downloadAllAttorneyPhotos().catch(err => {
  console.error('An error occurred:', err);
  process.exit(1);
});