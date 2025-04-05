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
  
  // Render Office documents directly in the browser
  const renderOffice365Viewer = async (url, ext) => {
    if (!containerRef.current) return;
    
    // Clear any existing content
    containerRef.current.innerHTML = '';
    
    try {
      // For blob URLs, we need to fetch the document data directly
      console.log('Fetching document data from URL:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
      }
      
      // Get document data as array buffer
      const arrayBuffer = await response.arrayBuffer();
      console.log('Document data loaded, size:', arrayBuffer.byteLength, 'bytes');
      
      if (ext === 'docx' || ext === 'doc') {
        // Use a local DOCX viewer - creating a simplified version
        
        // Create viewer container
        const viewerContainer = document.createElement('div');
        viewerContainer.className = 'docx-viewer';
        viewerContainer.style.padding = '20px';
        viewerContainer.style.backgroundColor = 'white';
        viewerContainer.style.overflow = 'auto';
        viewerContainer.style.height = '100%';
        
        // Add loading indicator
        viewerContainer.innerHTML = `
          <div class="flex justify-center items-center h-full">
            <div class="text-center">
              <svg class="animate-spin h-8 w-8 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p>Processing document...</p>
            </div>
          </div>
        `;
        
        containerRef.current.appendChild(viewerContainer);
        
        // Create download option
        const downloadContainer = document.createElement('div');
        downloadContainer.className = 'download-container';
        downloadContainer.style.padding = '10px';
        downloadContainer.style.textAlign = 'center';
        downloadContainer.style.borderBottom = '1px solid #ddd';
        downloadContainer.style.backgroundColor = '#f9fafb';
        
        downloadContainer.innerHTML = `
          <button class="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Document
          </button>
        `;
        
        const downloadBtn = downloadContainer.querySelector('button');
        downloadBtn.addEventListener('click', () => {
          const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = 'document.docx';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(downloadUrl);
        });
        
        containerRef.current.insertBefore(downloadContainer, viewerContainer);
        
        // Create an iframe with document preview
        // Since we can't use Office 365 viewer with blob URLs, display a basic preview
        const docContainer = document.createElement('div');
        docContainer.className = 'document-content';
        docContainer.style.padding = '20px';
        docContainer.style.backgroundColor = 'white';
        docContainer.style.border = '1px solid #ddd';
        docContainer.style.margin = '20px';
        docContainer.style.borderRadius = '4px';
        docContainer.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
        docContainer.style.overflow = 'auto';
        docContainer.style.maxHeight = 'calc(100% - 120px)';
        
        docContainer.innerHTML = `
          <div class="document-preview p-8 bg-white">
            <h2 class="mb-8 text-2xl font-bold text-center">Document Preview</h2>
            <p class="mb-5 text-center text-gray-600">
              This is a DOCX document. For best viewing experience, please download the document.
            </p>
            <div class="flex justify-center">
              <div class="rounded-lg shadow-lg p-8 bg-gray-50 max-w-md text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4 text-blue-600">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <p class="text-xl font-medium mb-2">Word Document</p>
                <p class="text-gray-500 mb-4">Size: ${Math.round(arrayBuffer.byteLength / 1024)} KB</p>
                <button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors w-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download Document
                </button>
              </div>
            </div>
          </div>
        `;
        
        // Make the download button functional
        const docDownloadBtn = docContainer.querySelector('button');
        docDownloadBtn.addEventListener('click', () => {
          downloadBtn.click(); // Trigger the same download function
        });
        
        viewerContainer.innerHTML = '';
        viewerContainer.appendChild(docContainer);
        
        // Ready
        setIsLoading(false);
        
      } else if (ext === 'xlsx' || ext === 'pptx') {
        // For other Office formats, offer download
        containerRef.current.innerHTML = `
          <div class="p-8 flex flex-col items-center justify-center h-full">
            <div class="bg-white border border-gray-200 rounded-lg shadow-lg p-8 max-w-md text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4 text-blue-600">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <h3 class="text-xl font-bold mb-2">Office Document</h3>
              <p class="text-gray-600 mb-6">
                This document type (${ext.toUpperCase()}) requires downloading for full viewing.
              </p>
              <button id="document-download-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download Document
              </button>
            </div>
          </div>
        `;
        
        // Make download button functional
        const downloadBtn = document.getElementById('document-download-btn');
        if (downloadBtn) {
          downloadBtn.addEventListener('click', () => {
            let mimeType = 'application/octet-stream';
            if (ext === 'xlsx') {
              mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            } else if (ext === 'pptx') {
              mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
            }
            
            const blob = new Blob([arrayBuffer], { type: mimeType });
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `document.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
          });
        }
        
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error rendering document:', error);
      
      // Show error message
      containerRef.current.innerHTML = `
        <div class="p-4 flex flex-col items-center justify-center h-full">
          <div class="bg-red-50 border border-red-200 rounded-md p-4 max-w-md text-center">
            <h3 class="text-red-700 font-medium mb-2">Error loading document</h3>
            <p class="text-red-600 mb-2">${error.message}</p>
            <div class="text-xs text-gray-500 mt-4 p-2 bg-gray-50 rounded overflow-auto max-h-32">
              <div><strong>URL:</strong> ${url}</div>
              <div><strong>Type:</strong> ${ext || 'unknown'}</div>
            </div>
            <button class="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
              onclick="location.reload()">Try Again</button>
          </div>
        </div>
      `;
      
      setError(error.message);
      setIsLoading(false);
    }
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