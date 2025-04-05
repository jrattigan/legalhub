import React, { useEffect, useState } from 'react';

const TextFileViewer = ({ documentUrl }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!documentUrl) {
      setError('No document URL provided');
      setIsLoading(false);
      return;
    }

    const fetchTextFile = async () => {
      try {
        setIsLoading(true);
        
        // For server-side URLs, ensure they have the full origin
        const fullUrl = documentUrl.startsWith('/') 
          ? window.location.origin + documentUrl 
          : documentUrl;
        
        console.log("Text Viewer: Fetching from URL:", fullUrl);
        
        // Use ArrayBuffer to get raw bytes to properly handle line endings
        const response = await fetch(fullUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch text file (status: ${response.status})`);
        }
        
        // Get file content as array buffer to properly handle newlines
        const arrayBuffer = await response.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        let text = decoder.decode(arrayBuffer);
        
        // Handle different types of line endings and normalize them
        // \r\n (Windows) -> \n
        // \r (old Mac) -> \n
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        console.log("Text file loaded, length:", text.length, "Has newlines:", text.includes('\n'));
        console.log("First 100 chars:", text.substring(0, 100).replace(/\n/g, '\\n'));
        
        setContent(text);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading text file:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    fetchTextFile();
  }, [documentUrl]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full bg-white p-4">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p>Loading text file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full bg-white">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 max-w-md text-center">
          <h3 className="text-red-700 font-medium mb-2">Error loading text file</h3>
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
    <div className="text-file-viewer bg-white p-4" style={{ height: '700px', overflow: 'auto' }}>
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-lg font-medium">Text Document Viewer</h3>
        <div className="text-sm text-gray-500">
          {documentUrl.split('/').pop()}
        </div>
      </div>
      {/* 
        Enhanced detection for HTML content: 
        Check for common HTML tags, style tags, or document metadata
      */}
      {content.includes('<html') || 
       content.includes('<body') || 
       content.includes('<div') || 
       content.includes('<p>') || 
       content.includes('<span') || 
       content.includes('<table') || 
       content.includes('<style') || 
       content.includes('<h1') || 
       content.includes('<h2') || 
       content.includes('<h3') || 
       content.includes('class="doc-') || 
       content.includes('class="document-content') ? (
        <div 
          className="p-4 border rounded bg-white h-[600px] overflow-y-auto"
          style={{
            fontFamily: "'Calibri', sans-serif",
            lineHeight: "1.4",
            color: "#000"
          }}
          dangerouslySetInnerHTML={{ 
            __html: `
                <style>
                  /* Default document styles for HTML content */
                  body, p, div, span, table, td, th, ul, ol, li {
                    font-family: 'Calibri', sans-serif;
                    line-height: 1.4;
                  }
                  p, div.paragraph {
                    margin-bottom: 0.8em;
                  }
                  h1, h2, h3, h4, h5, h6 {
                    font-family: 'Calibri', sans-serif;
                    font-weight: bold;
                    margin-top: 1em;
                    margin-bottom: 0.5em;
                  }
                  h1 { font-size: 16pt; }
                  h2 { font-size: 14pt; }
                  h3 { font-size: 12pt; }
                  table {
                    border-collapse: collapse;
                    margin-bottom: 1em;
                    width: 100%;
                  }
                  td, th {
                    border: 1px solid #ddd;
                    padding: 6px;
                  }
                  td.term-label {
                    font-weight: bold;
                    vertical-align: top;
                    padding: 5px 10px 5px 0;
                    width: 110px;
                  }
                  th {
                    background-color: #f5f5f5;
                    font-weight: bold;
                  }
                  pre {
                    white-space: pre-wrap;
                    font-family: monospace;
                    background-color: #f5f5f5;
                    padding: 0.5em;
                    border-radius: 3px;
                  }
                  /* Document comparison specific styling */
                  .addition-text {
                    color: #166534; 
                    text-decoration: underline; 
                    text-decoration-color: #166534; 
                    background-color: #dcfce7; 
                    padding: 0 1px;
                  }
                  .deletion-text {
                    color: #991b1b; 
                    text-decoration: line-through; 
                    text-decoration-color: #991b1b; 
                    background-color: #fee2e2; 
                    padding: 0 1px;
                  }
                  /* Document formatting for redline comparison */
                  .document-header {
                    text-align: center;
                    font-weight: bold;
                    margin-bottom: 20px;
                  }
                  .document-header h1 {
                    font-size: 14pt;
                    line-height: 1.4;
                    margin-bottom: 5px;
                    text-transform: uppercase;
                  }
                  .document-header h2 {
                    font-size: 14pt;
                    line-height: 1.4;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                  }
                  .document-header p {
                    font-size: 12pt;
                    line-height: 1.4;
                    margin-bottom: 20px;
                  }
                  .disclaimer {
                    font-family: 'Calibri', sans-serif;
                    font-size: 11pt;
                    line-height: 1.4;
                    margin: 30px 0;
                    font-style: italic;
                  }
                  .signature-block {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 40px;
                  }
                  .company-signature, .partner-signature {
                    width: 45%;
                  }
                  .signature-block p {
                    font-family: 'Calibri', sans-serif;
                    font-size: 11pt;
                    margin-bottom: 5px;
                  }
                </style>
                ${content}
              `
          }}
        />
      ) : (
        <pre 
          className="text-sm p-4 border rounded bg-gray-50 font-mono h-[600px] overflow-y-auto"
          style={{ 
            whiteSpace: 'pre-wrap', 
            wordWrap: 'break-word',
            overflowX: 'auto',
            wordBreak: 'keep-all',
            lineHeight: '1.5',
            fontFamily: "'Courier New', monospace",
            padding: '16px'
          }}
        >
          {content}
        </pre>
      )}
    </div>
  );
};

export default TextFileViewer;