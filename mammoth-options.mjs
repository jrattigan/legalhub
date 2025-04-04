import mammoth from 'mammoth';
import fs from 'fs';

// Check what's available in mammoth
console.log("Available mammoth properties:");
Object.keys(mammoth).forEach(key => {
  console.log(`- ${key}: ${typeof mammoth[key]}`);
  if (typeof mammoth[key] === 'object' && mammoth[key] !== null) {
    console.log(`  Subproperties of ${key}:`);
    Object.keys(mammoth[key]).forEach(subkey => {
      console.log(`  - ${subkey}: ${typeof mammoth[key][subkey]}`);
    });
  }
});

// Try with a more comprehensive style map
async function tryDetailedStyleMap(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    
    // Advanced style map that preserves more formatting
    const options = {
      styleMap: [
        "p[style-name='Normal'] => p:fresh",
        "p[style-name='Body Text'] => p.body-text:fresh",
        "p[style-name='Table Paragraph'] => p.table-paragraph:fresh",
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "table => table.doc-table",
        "tr => tr",
        "td => td",
        "b => strong",
        "i => em",
        "u => span.underline",
        "p[style-name='Title'] => h1.title:fresh",
        "p[style-name='Subtitle'] => h2.subtitle:fresh",
      ],
      ignoreEmptyParagraphs: false,
      idPrefix: "doc-",
      includeDefaultStyleMap: true
    };
    
    const result = await mammoth.convertToHtml({ buffer }, options);
    console.log("\nFile:", filePath);
    console.log("Style map result (sample):", result.value.substring(0, 300));
    
    if (result.messages.length > 0) {
      console.log("\nMessages:");
      result.messages.forEach(msg => console.log(`- ${msg.type}: ${msg.message}`));
    }
    
  } catch (err) {
    console.error("Error:", err);
  }
}

// Test with sample file
(async () => {
  await tryDetailedStyleMap('attached_assets/test1.docx');
})();
