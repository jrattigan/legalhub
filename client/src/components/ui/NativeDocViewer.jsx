import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

const NativeDocViewer = ({ documentUrl, documentType }) => {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileExtension, setFileExtension] = useState(null);
  const [documentFileName, setDocumentFileName] = useState('');

  useEffect(() => {
    // Clear error and set loading when documentUrl changes
    setIsLoading(true);
    setError(null);
    
    if (!documentUrl) {
      console.error('NativeDocViewer: No document URL provided');
      setError('No document URL provided');
      setIsLoading(false);
      if (containerRef.current) {
        containerRef.current.innerHTML = `<div class="p-4 text-red-600">Error: No document URL provided</div>`;
      }
      return;
    }
    
    console.log('NativeDocViewer: Attempting to load document from URL:', documentUrl);
    
    // Extract file extension from URL or documentType prop
    const ext = documentType || documentUrl.split('.').pop().toLowerCase();
    setFileExtension(ext);
    console.log('NativeDocViewer: File extension detected:', ext);
    
    // Extract filename from URL if possible
    try {
      const fileName = documentUrl.split('/').pop();
      setDocumentFileName(fileName);
      console.log('NativeDocViewer: Filename extracted:', fileName);
    } catch (err) {
      console.warn('NativeDocViewer: Could not extract filename from URL', err);
    }
    
    // Show loading indicator
    if (containerRef.current) {
      containerRef.current.innerHTML = `
        <div class="flex justify-center items-center h-full">
          <div class="text-center">
            <svg class="animate-spin h-8 w-8 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Loading document...</p>
            <p class="text-xs text-gray-500 mt-2">URL: ${documentUrl.substring(0, 50)}${documentUrl.length > 50 ? '...' : ''}</p>
          </div>
        </div>
      `;
    }
    
    // Handle document rendering
    const renderDocument = async () => {
      try {
        if (ext === 'pdf') {
          console.log('NativeDocViewer: Attempting to render PDF document');
          await renderPdf(documentUrl);
        } else if (ext === 'docx' || ext === 'doc' || ext === 'xlsx' || ext === 'pptx') {
          console.log(`NativeDocViewer: Attempting to render Office document (${ext})`);
          renderOffice365Viewer(documentUrl, ext);
        } else {
          throw new Error(`Unsupported file type: ${ext}`);
        }
      } catch (err) {
        console.error('NativeDocViewer: Error rendering document:', err);
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="p-4 flex flex-col items-center justify-center h-full">
              <div class="bg-red-50 border border-red-200 rounded-md p-4 max-w-md text-center">
                <h3 class="text-red-700 font-medium mb-2">Error loading document</h3>
                <p class="text-red-600 mb-2">${err.message}</p>
                <div class="text-xs text-gray-500 mt-4 p-2 bg-gray-50 rounded overflow-auto max-h-32">
                  <div><strong>URL:</strong> ${documentUrl}</div>
                  <div><strong>Type:</strong> ${ext || 'unknown'}</div>
                </div>
                <button class="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                  onclick="window.location.reload()">Try Again</button>
              </div>
            </div>
          `;
        }
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    // Add a small delay to ensure blob URLs are fully available
    const timer = setTimeout(() => {
      renderDocument();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [documentUrl, documentType]);
  
  // Render PDF using PDF.js
  const renderPdf = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch PDF document');
      
      const arrayBuffer = await response.arrayBuffer();
      
      if (containerRef.current) {
        // Clear loading indicator
        containerRef.current.innerHTML = '';
        
        // Render PDF using PDF.js
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDocument = await loadingTask.promise;
        
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
        
        controlsContainer.appendChild(zoomOutBtn);
        controlsContainer.appendChild(zoomInBtn);
        
        containerRef.current.insertBefore(controlsContainer, viewerContainer);
        
        let currentScale = 1.2;
        
        const renderPages = async (scale) => {
          // Clear existing pages
          viewerContainer.innerHTML = '';
          
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
      throw err;
    }
  };
  
  // Render Office documents using Microsoft Office 365 Viewer
  const renderOffice365Viewer = (url, ext) => {
    if (!containerRef.current) return;
    
    // Clear any existing content
    containerRef.current.innerHTML = '';
    
    // Get the full URL to the document
    const fullUrl = new URL(url, window.location.origin).href;
    
    // Create the Office 365 Viewer iframe
    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';
    
    // Set the iframe source to Microsoft Office 365 Viewer
    // For Word documents, we use the Word Online viewer
    let viewerUrl;
    if (ext === 'docx' || ext === 'doc') {
      viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`;
    } else if (ext === 'xlsx') {
      viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`;
    } else if (ext === 'pptx') {
      viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`;
    }
    
    iframe.src = viewerUrl;
    iframe.style.border = 'none';
    
    // Add the iframe to the container
    containerRef.current.appendChild(iframe);
    
    // Handle iframe load events
    iframe.onload = () => {
      setIsLoading(false);
    };
    
    iframe.onerror = (err) => {
      setError('Failed to load the document viewer');
      setIsLoading(false);
      console.error('Office viewer iframe error:', err);
      
      // Fallback message
      containerRef.current.innerHTML = `
        <div class="p-4 text-center">
          <div class="text-red-600 mb-4">Error loading Office document viewer.</div>
          <div>
            <a href="${url}" target="_blank" class="text-blue-600 underline">
              Download document to view
            </a>
          </div>
        </div>
      `;
    };
  };

  return (
    <div 
      ref={containerRef} 
      className="native-doc-viewer" 
      style={{ width: '100%', height: '700px', overflow: 'auto', background: 'white' }}
    />
  );
};

export default NativeDocViewer;