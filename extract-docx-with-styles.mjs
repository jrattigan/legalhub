import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

async function extractWithStyleMap(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    
    // First, get the document with default conversion
    const defaultResult = await mammoth.convertToHtml({ buffer });
    
    // Now try with a custom style map that preserves as much styling as possible
    const options = {
      styleMap: [
        "p[style-name='Body Text'] => p.body-text:fresh",
        "p[style-name='Table Paragraph'] => p.table-paragraph:fresh",
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1.title:fresh",
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em",
        "table => table.document-table",
        "tr => tr",
        "td => td"
      ]
    };
    
    const styledResult = await mammoth.convertToHtml({ buffer }, options);
    
    console.log("File:", path.basename(filePath));
    console.log("\nDefault Conversion (first 300 chars):");
    console.log(defaultResult.value.substring(0, 300));
    
    console.log("\nStyled Conversion (first 300 chars):");
    console.log(styledResult.value.substring(0, 300));
    
    // Extract the raw data to check for styles
    const rawOutput = await mammoth.extractRawText({ buffer });
    console.log("\nRaw text length:", rawOutput.value.length);
    console.log("Raw text sample:", rawOutput.value.substring(0, 100));
    
  } catch (err) {
    console.error("Error processing file:", err);
  }
}

// View both test files
(async () => {
  await extractWithStyleMap('attached_assets/test1.docx');
  console.log("\n================================\n");
  await extractWithStyleMap('attached_assets/test2.docx');
})();
