import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

async function viewDocx(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.convertToHtml({ buffer });
    
    console.log("File:", path.basename(filePath));
    console.log("Length:", result.value.length);
    console.log("Content (first 500 chars):", result.value.substring(0, 500));
    
    // List all messages/warnings
    if (result.messages.length > 0) {
      console.log("\nMessages:");
      result.messages.forEach(msg => console.log(`- ${msg.type}: ${msg.message}`));
    }
  } catch (err) {
    console.error("Error processing file:", err);
  }
}

// View both test files
(async () => {
  await viewDocx('attached_assets/test1.docx');
  console.log("\n--------------------------------\n");
  await viewDocx('attached_assets/test2.docx');
})();
