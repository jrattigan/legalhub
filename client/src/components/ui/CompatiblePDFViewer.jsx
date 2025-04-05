import React, { useEffect, useRef, useState } from 'react';
// Explicitly import version 3.4.120 which matches the worker version
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

const CompatiblePDFViewer = ({ documentUrl }) => {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagesRendered, setPagesRendered] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    // Clear error and set loading when documentUrl changes
    setIsLoading(true);
    setError(null);
    setPagesRendered(0);
    setTotalPages(0);
    
    if (!documentUrl) {
      setError('No document URL provided');
      setIsLoading(false);
      return;
    }
    
    console.log('PDF Viewer: Attempting to load PDF from URL:', documentUrl);
    
    // Show loading indicator
    if (containerRef.current) {
      containerRef.current.innerHTML = `
        <div class="flex justify-center items-center h-full">
          <div class="text-center">
            <svg class="animate-spin h-8 w-8 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Loading PDF document...</p>
            <p class="text-xs text-gray-500 mt-2">URL: ${documentUrl.substring(0, 50)}${documentUrl.length > 50 ? '...' : ''}</p>
          </div>
        </div>
      `;
    }
    
    // Function to render the PDF
    const renderPDF = async () => {
      try {
        // For server-side URLs, ensure they have the full origin
        const fullUrl = documentUrl.startsWith('/') 
          ? window.location.origin + documentUrl 
          : documentUrl;
        
        console.log("PDF Viewer: Using full URL:", fullUrl);
        
        const response = await fetch(fullUrl);
        if (!response.ok) {
          console.error("PDF Viewer: Failed to fetch PDF, status:", response.status);
          throw new Error(`Failed to fetch PDF document (status: ${response.status})`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        console.log("PDF Viewer: Successfully loaded PDF data, size:", arrayBuffer.byteLength);
        
        if (containerRef.current) {
          // Clear loading indicator
          containerRef.current.innerHTML = '';
          
          // Render PDF using PDF.js
          console.log("PDF Viewer: Creating PDF.js document instance");
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          
          const pdfDocument = await loadingTask.promise;
          console.log("PDF Viewer: PDF document loaded, pages:", pdfDocument.numPages);
          setTotalPages(pdfDocument.numPages);
          
          // Create viewer container
          const viewerContainer = document.createElement('div');
          viewerContainer.className = 'pdfViewer';
          viewerContainer.style.padding = '20px';
          containerRef.current.appendChild(viewerContainer);
          
          // Add PDF controls
          const controlsContainer = document.createElement('div');
          controlsContainer.className = 'pdf-controls';
          controlsContainer.style.padding = '10px';
          controlsContainer.style.borderBottom = '1px solid #ddd';
          controlsContainer.style.display = 'flex';
          controlsContainer.style.justifyContent = 'center';
          controlsContainer.style.background = '#f9fafb';
          
          const zoomOutBtn = document.createElement('button');
          zoomOutBtn.innerText = '−';
          zoomOutBtn.title = 'Zoom Out';
          zoomOutBtn.className = 'pdf-control-button';
          zoomOutBtn.style.margin = '0 5px';
          zoomOutBtn.style.width = '30px';
          zoomOutBtn.style.height = '30px';
          zoomOutBtn.style.borderRadius = '4px';
          zoomOutBtn.style.border = '1px solid #ddd';
          
          const zoomInBtn = document.createElement('button');
          zoomInBtn.innerText = '+';
          zoomInBtn.title = 'Zoom In';
          zoomInBtn.className = 'pdf-control-button';
          zoomInBtn.style.margin = '0 5px';
          zoomInBtn.style.width = '30px';
          zoomInBtn.style.height = '30px';
          zoomInBtn.style.borderRadius = '4px';
          zoomInBtn.style.border = '1px solid #ddd';
          
          const pageInfo = document.createElement('div');
          pageInfo.className = 'page-info';
          pageInfo.style.margin = '0 15px';
          pageInfo.style.display = 'flex';
          pageInfo.style.alignItems = 'center';
          pageInfo.innerHTML = `<span>Version: ${pdfjsLib.version}</span>`;
          
          controlsContainer.appendChild(zoomOutBtn);
          controlsContainer.appendChild(zoomInBtn);
          controlsContainer.appendChild(pageInfo);
          
          containerRef.current.insertBefore(controlsContainer, viewerContainer);
          
          let currentScale = 1.2;
          
          const renderPages = async (scale) => {
            // Clear existing pages
            viewerContainer.innerHTML = '';
            setPagesRendered(0);
            
            // Render each page
            for (let i = 1; i <= pdfDocument.numPages; i++) {
              const page = await pdfDocument.getPage(i);
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
              setPagesRendered(prevPages => prevPages + 1);
            }
          };
          
          // Initial render
          await renderPages(currentScale);
          
          // Zoom event handlers
          zoomInBtn.addEventListener('click', async () => {
            currentScale += 0.2;
            await renderPages(currentScale);
          });
          
          zoomOutBtn.addEventListener('click', async () => {
            if (currentScale > 0.5) {
              currentScale -= 0.2;
              await renderPages(currentScale);
            }
          });
          
          setIsLoading(false);
        }
      } catch (err) {
        console.error('PDF Viewer Error:', err);
        setError(err.message);
        setIsLoading(false);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="p-4 flex flex-col items-center justify-center h-full">
              <div class="bg-red-50 border border-red-200 rounded-md p-4 max-w-md text-center">
                <h3 class="text-red-700 font-medium mb-2">Error loading document</h3>
                <p class="text-red-600 mb-2">${err.message}</p>
                <div class="text-xs text-gray-500 mt-4 p-2 bg-gray-50 rounded overflow-auto max-h-32">
                  <div><strong>URL:</strong> ${documentUrl}</div>
                  <div><strong>Type:</strong> pdf</div>
                </div>
                <button class="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                  onclick="window.location.reload()">Try Again</button>
              </div>
            </div>
          `;
        }
      }
    };
    
    // Add a small delay to ensure blob URLs are fully available
    const timer = setTimeout(() => {
      renderPDF();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [documentUrl]);
  
  // Show loading progress if applicable
  const progressPercentage = totalPages > 0 
    ? Math.round((pagesRendered / totalPages) * 100) 
    : 0;
  
  return (
    <div 
      ref={containerRef} 
      className="compatible-pdf-viewer" 
      style={{ 
        width: '100%', 
        height: '700px', 
        overflow: 'auto', 
        background: 'white',
        position: 'relative'
      }}
    >
      {isLoading && totalPages > 0 && pagesRendered < totalPages && (
        <div 
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            right: '10px',
            background: 'rgba(255,255,255,0.9)',
            padding: '8px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            zIndex: 10
          }}
        >
          <div style={{ fontSize: '14px', marginBottom: '4px' }}>
            Rendering pages: {pagesRendered} of {totalPages}
          </div>
          <div style={{ 
            height: '4px', 
            background: '#eee', 
            borderRadius: '2px', 
            overflow: 'hidden' 
          }}>
            <div style={{ 
              height: '100%', 
              width: `${progressPercentage}%`, 
              background: '#3b82f6',
              transition: 'width 0.3s ease-in-out'
            }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CompatiblePDFViewer;