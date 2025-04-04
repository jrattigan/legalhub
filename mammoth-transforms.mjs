import mammoth from 'mammoth';
import fs from 'fs';

async function extractWithTransforms(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    
    // Create a transform to capture style information
    let capturedStyles = [];
    
    const styleCapture = mammoth.transforms.paragraph((paragraph) => {
      if (paragraph.styleId || paragraph.styleName) {
        capturedStyles.push({
          type: 'paragraph',
          styleId: paragraph.styleId,
          styleName: paragraph.styleName,
          alignment: paragraph.alignment,
          indent: paragraph.indent
        });
      }
      return paragraph;
    });
    
    const runCapture = mammoth.transforms.run((run) => {
      if (run.styleId || run.styleName) {
        capturedStyles.push({
          type: 'run',
          styleId: run.styleId,
          styleName: run.styleName,
          isBold: run.isBold,
          isItalic: run.isItalic,
          isUnderline: run.isUnderline
        });
      }
      return run;
    });
    
    // Convert with transforms
    const result = await mammoth.convertToHtml(
      { buffer },
      { 
        transformDocument: mammoth.transforms.compose([
          styleCapture,
          runCapture
        ])
      }
    );
    
    console.log("File:", filePath);
    console.log("Conversion result (sample):", result.value.substring(0, 200));
    
    // Display captured styles
    console.log("\nCaptured style information:");
    const uniqueStyles = {};
    capturedStyles.forEach(style => {
      const key = `${style.type}-${style.styleId || style.styleName}`;
      if (!uniqueStyles[key]) {
        uniqueStyles[key] = style;
      }
    });
    
    Object.values(uniqueStyles).forEach(style => {
      console.log(style);
    });
    
  } catch (err) {
    console.error("Error:", err);
  }
}

// Test with sample file
(async () => {
  await extractWithTransforms('attached_assets/test1.docx');
})();
