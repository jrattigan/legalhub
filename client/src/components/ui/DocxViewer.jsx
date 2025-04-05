import React, { useEffect, useState } from 'react';
import mammoth from 'mammoth';

/**
 * DocxViewer - A component to render DOCX files with preserved formatting
 * @param {Object} props - Component props
 * @param {string} props.documentUrl - URL to the DOCX document
 */
const DocxViewer = ({ documentUrl }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!documentUrl) {
      setError('No document URL provided');
      setIsLoading(false);
      return;
    }

    const fetchAndRenderDocx = async () => {
      try {
        setIsLoading(true);
        
        // For server-side URLs, ensure they have the full origin
        const fullUrl = documentUrl.startsWith('/') 
          ? window.location.origin + documentUrl 
          : documentUrl;
        
        console.log("DocxViewer: Fetching from URL:", fullUrl);
        
        // Fetch the document as ArrayBuffer
        const response = await fetch(fullUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch document (status: ${response.status})`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Convert the document to HTML with enhanced options
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            includeDefaultStyleMap: true,
            ignoreEmptyParagraphs: false,
            styleMap: [
              "p[style-name='Heading 1'] => h1:fresh",
              "p[style-name='Heading 2'] => h2:fresh",
              "p[style-name='Heading 3'] => h3:fresh",
              "p[style-name='Title'] => h1.doc-title:fresh",
              "p[style-name='Subtitle'] => h2.doc-subtitle:fresh",
              "p[style-name='Normal'] => p:fresh",
              "p => p:fresh",
              "table => table.doc-table",
              "tr => tr.doc-tr",
              "td => td.doc-td",
              "strong => strong",
              "em => em",
            ]
          }
        );
        
        if (result.messages.length > 0) {
          console.log("DocxViewer: Conversion messages:", result.messages);
        }
        
        // Wrap the HTML with custom styles for better rendering
        const wrappedHtml = wrapWithStyles(result.value);
        setContent(wrappedHtml);
        setIsLoading(false);
      } catch (err) {
        console.error('DocxViewer: Error loading or rendering document:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    fetchAndRenderDocx();
  }, [documentUrl]);

  // Function to wrap HTML with custom styles
  const wrapWithStyles = (html) => {
    return `
      <div class="document-container">
        <style>
          .document-container {
            font-family: 'Calibri', sans-serif;
            line-height: 1.4;
            color: #333;
            max-width: 100%;
            margin: 0;
            padding: 0;
          }
          
          /* Paragraph styles */
          p {
            font-family: 'Calibri', sans-serif;
            font-size: 11pt;
            margin-bottom: 10pt;
            line-height: 1.4;
          }
          
          /* Heading styles */
          h1 {
            font-family: 'Calibri', sans-serif;
            font-size: 16pt;
            font-weight: bold;
            margin-top: 12pt;
            margin-bottom: 6pt;
            page-break-after: avoid;
          }
          
          h2 {
            font-family: 'Calibri', sans-serif;
            font-size: 14pt;
            font-weight: bold;
            margin-top: 10pt;
            margin-bottom: 6pt;
            page-break-after: avoid;
          }
          
          h3 {
            font-family: 'Calibri', sans-serif;
            font-size: 12pt;
            font-weight: bold;
            margin-top: 10pt;
            margin-bottom: 6pt;
            page-break-after: avoid;
          }
          
          .doc-title {
            text-align: center;
            margin-top: 0;
          }
          
          .doc-subtitle {
            text-align: center;
            color: #444;
          }
          
          /* Tables */
          .doc-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10pt;
          }
          
          .doc-td, .doc-tr td {
            padding: 5pt;
            border: 1px solid #ddd;
            vertical-align: top;
          }
          
          /* Preserve list formatting */
          ul, ol {
            margin-top: 0;
            margin-bottom: 10pt;
            padding-left: 20pt;
          }
          
          li {
            margin-bottom: 3pt;
          }
          
          /* Images */
          img {
            max-width: 100%;
            height: auto;
          }
        </style>
        ${html}
      </div>
    `;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full bg-white p-4">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p>Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full bg-white">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 max-w-md text-center">
          <h3 className="text-red-700 font-medium mb-2">Error loading document</h3>
          <p className="text-red-600 mb-2">{error}</p>
          <div className="text-xs text-gray-500 mt-4 p-2 bg-gray-50 rounded overflow-auto max-h-32">
            <div><strong>URL:</strong> {documentUrl}</div>
          </div>
          <button 
            className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
            onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="docx-viewer bg-white" style={{ height: '700px', overflow: 'auto', padding: '20px' }}>
      <div className="docx-content" dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
};

export default DocxViewer;