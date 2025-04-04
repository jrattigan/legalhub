import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { renderAsync } from 'docx-preview';

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

const NativeDocViewer = ({ documentUrl, documentType }) => {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileExtension, setFileExtension] = useState(null);

  useEffect(() => {
    if (!documentUrl) return;
    
    // Extract file extension from URL or documentType prop
    const ext = documentType || documentUrl.split('.').pop().toLowerCase();
    setFileExtension(ext);
    
    setIsLoading(true);
    setError(null);
    
    // Clear previous content
    if (containerRef.current) {
      containerRef.current.innerHTML = `
        <div class="flex justify-center items-center h-full">
          <div class="text-center">
            <svg class="animate-spin h-8 w-8 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Loading document...</p>
          </div>
        </div>
      `;
    }
    
    const renderDocument = async () => {
      try {
        const response = await fetch(documentUrl);
        if (!response.ok) throw new Error('Failed to fetch document');
        
        const arrayBuffer = await response.arrayBuffer();
        
        if (containerRef.current) {
          // Clear loading indicator
          containerRef.current.innerHTML = '';
          
          if (ext === 'pdf') {
            // Render PDF using PDF.js
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDocument = await loadingTask.promise;
            
            // Create viewer container
            const viewerContainer = document.createElement('div');
            viewerContainer.className = 'pdfViewer';
            viewerContainer.style.padding = '20px';
            containerRef.current.appendChild(viewerContainer);
            
            // Render each page
            for (let i = 1; i <= pdfDocument.numPages; i++) {
              const page = await pdfDocument.getPage(i);
              const scale = 1.2;
              const viewport = page.getViewport({ scale });
              
              const canvas = document.createElement('canvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              canvas.style.display = 'block';
              canvas.style.margin = '0 auto 10px auto';
              canvas.style.border = '1px solid #ddd';
              viewerContainer.appendChild(canvas);
              
              const context = canvas.getContext('2d');
              const renderContext = {
                canvasContext: context,
                viewport: viewport
              };
              
              await page.render(renderContext).promise;
            }
          } else if (ext === 'docx') {
            // Render DOCX using docx-preview
            await renderAsync(arrayBuffer, containerRef.current, undefined, {
              className: 'docx-viewer',
              inWrapper: true,
              ignoreLastRenderedPageBreak: true,
              useBase64URL: true,
              renderHeaders: true,
              renderFooters: true,
              renderFootnotes: true,
              renderEndnotes: true
            });
          } else {
            throw new Error(`Unsupported file type: ${ext}`);
          }
          
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error rendering document:', err);
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div class="p-4 text-red-600">Error loading document: ${err.message}</div>`;
        }
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    renderDocument();
  }, [documentUrl, documentType]);

  return (
    <div 
      ref={containerRef} 
      className="native-doc-viewer" 
      style={{ width: '100%', height: '700px', overflow: 'auto', background: 'white' }}
    />
  );
};

export default NativeDocViewer;