import React, { useEffect, useRef, useState } from 'react';
import Viewer, { DocxViewer, PdfViewer } from 'react-office-viewer';

const NativeDocViewer = ({ documentUrl, documentType }) => {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileData, setFileData] = useState(null);

  useEffect(() => {
    async function loadDocument() {
      if (!documentUrl) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch the document
        const response = await fetch(documentUrl);
        if (!response.ok) throw new Error('Failed to fetch document');
        
        const blob = await response.blob();
        setFileData(blob);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading document:', err);
        setError(err.message);
        setIsLoading(false);
      }
    }
    
    loadDocument();
  }, [documentUrl]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full" style={{ height: '700px' }}>
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
      <div className="p-4 text-red-600">
        Error loading document: {error}
      </div>
    );
  }

  // Using the appropriate viewer based on document type
  return (
    <div 
      className="native-doc-viewer" 
      style={{ width: '100%', height: '700px', border: '1px solid #ddd', overflow: 'auto' }}
    >
      {fileData && (
        <Viewer 
          file={fileData} 
          fileName={documentUrl.split('/').pop()} // Extract filename from URL
          width="100%"
          height="700px"
        />
      )}
    </div>
  );
};

export default NativeDocViewer;