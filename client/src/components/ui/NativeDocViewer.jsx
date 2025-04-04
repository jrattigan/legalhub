import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

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
          </div>
        </div>
      `;
    }
    
    // Handle document rendering
    const renderDocument = async () => {
      try {
        if (ext === 'pdf') {
          await renderPdf(documentUrl);
        } else if (ext === 'docx') {
          await renderDocx(documentUrl);
        } else {
          throw new Error(`Unsupported file type: ${ext}`);
        }
      } catch (err) {
        console.error('Error rendering document:', err);
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="p-4 text-center">
              <div class="text-red-600 mb-4">Error loading document: ${err.message}</div>
              <div>
                <a href="${documentUrl}" download class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download to view
                </a>
              </div>
            </div>
          `;
        }
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    renderDocument();
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
        
        // Create viewer container
        const viewerContainer = document.createElement('div');
        viewerContainer.className = 'pdfViewer';
        viewerContainer.style.padding = '20px';
        
        // Add PDF controls
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'pdf-controls';
        controlsContainer.style.padding = '10px';
        controlsContainer.style.borderBottom = '1px solid #ddd';
        controlsContainer.style.display = 'flex';
        controlsContainer.style.justifyContent = 'center';
        controlsContainer.style.background = '#f9fafb';
        controlsContainer.style.position = 'sticky';
        controlsContainer.style.top = '0';
        controlsContainer.style.zIndex = '10';
        
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
        
        containerRef.current.appendChild(controlsContainer);
        containerRef.current.appendChild(viewerContainer);
        
        // Render PDF using PDF.js
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDocument = await loadingTask.promise;
        
        let currentScale = 1.2;
        
        const renderPages = async (scale) => {
          // Clear existing pages
          viewerContainer.innerHTML = '';
          
          // Render each page
          for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const viewport = page.getViewport({ scale });
            
            const pageContainer = document.createElement('div');
            pageContainer.className = 'pdf-page-container';
            pageContainer.style.marginBottom = '20px';
            pageContainer.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.display = 'block';
            canvas.style.margin = '0 auto';
            
            pageContainer.appendChild(canvas);
            viewerContainer.appendChild(pageContainer);
            
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
  
  // Render DOCX - since we can't use external libraries, offer direct download or use iframe embedder
  const renderDocx = async (url) => {
    try {
      if (containerRef.current) {
        // Clear any existing content
        containerRef.current.innerHTML = '';
        
        // Create a message explaining the limitations
        const messageContainer = document.createElement('div');
        messageContainer.className = 'docx-message';
        messageContainer.style.padding = '40px 20px';
        messageContainer.style.textAlign = 'center';
        messageContainer.style.background = 'white';
        messageContainer.style.display = 'flex';
        messageContainer.style.flexDirection = 'column';
        messageContainer.style.alignItems = 'center';
        messageContainer.style.justifyContent = 'center';
        messageContainer.style.height = '100%';
        
        // Word document icon
        const docIcon = document.createElement('div');
        docIcon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
            <path d="M8 13h8"/>
            <path d="M8 17h8"/>
            <path d="M8 9h2"/>
          </svg>
        `;
        docIcon.style.marginBottom = '20px';
        
        // Create message text
        const messageText = document.createElement('p');
        messageText.textContent = 'Word document preview is not available directly in the browser.';
        messageText.style.marginBottom = '20px';
        messageText.style.fontSize = '16px';
        messageText.style.color = '#4b5563';
        
        // Create download button
        const downloadButton = document.createElement('a');
        downloadButton.href = url;
        downloadButton.download = url.split('/').pop() || 'document.docx';
        downloadButton.className = 'docx-download-btn';
        downloadButton.style.display = 'inline-flex';
        downloadButton.style.alignItems = 'center';
        downloadButton.style.gap = '8px';
        downloadButton.style.padding = '10px 20px';
        downloadButton.style.backgroundColor = '#2563eb';
        downloadButton.style.color = 'white';
        downloadButton.style.borderRadius = '4px';
        downloadButton.style.fontWeight = '500';
        downloadButton.style.textDecoration = 'none';
        downloadButton.style.marginBottom = '10px';
        downloadButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download Document
        `;
        
        // Try to use the Office 365 viewer if possible
        const tryOfficeViewerButton = document.createElement('button');
        tryOfficeViewerButton.className = 'try-office-viewer-btn';
        tryOfficeViewerButton.style.display = 'inline-flex';
        tryOfficeViewerButton.style.alignItems = 'center';
        tryOfficeViewerButton.style.gap = '8px';
        tryOfficeViewerButton.style.padding = '10px 20px';
        tryOfficeViewerButton.style.backgroundColor = 'transparent';
        tryOfficeViewerButton.style.color = '#2563eb';
        tryOfficeViewerButton.style.border = '1px solid #2563eb';
        tryOfficeViewerButton.style.borderRadius = '4px';
        tryOfficeViewerButton.style.fontWeight = '500';
        tryOfficeViewerButton.style.cursor = 'pointer';
        tryOfficeViewerButton.style.marginTop = '10px';
        tryOfficeViewerButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          Try Office 365 Viewer
        `;
        
        // Event listener for Office 365 Viewer button
        tryOfficeViewerButton.addEventListener('click', () => {
          try {
            // Clear the container
            containerRef.current.innerHTML = '';
            
            // Get the full URL to the document
            const fullUrl = new URL(url, window.location.origin).href;
            
            // Create iframe for Office 365 Viewer
            const iframe = document.createElement('iframe');
            iframe.width = '100%';
            iframe.height = '100%';
            iframe.style.border = 'none';
            iframe.style.display = 'block';
            
            // Set source to Office 365 Viewer
            iframe.src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`;
            
            // Add a loading message
            const loadingMsg = document.createElement('div');
            loadingMsg.className = 'loading-message';
            loadingMsg.style.position = 'absolute';
            loadingMsg.style.top = '50%';
            loadingMsg.style.left = '50%';
            loadingMsg.style.transform = 'translate(-50%, -50%)';
            loadingMsg.style.padding = '20px';
            loadingMsg.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            loadingMsg.style.borderRadius = '8px';
            loadingMsg.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            loadingMsg.style.textAlign = 'center';
            loadingMsg.innerHTML = `
              <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="2" x2="12" y2="6"></line>
                  <line x1="12" y1="18" x2="12" y2="22"></line>
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                  <line x1="2" y1="12" x2="6" y2="12"></line>
                  <line x1="18" y1="12" x2="22" y2="12"></line>
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
                <span>Loading Office 365 Viewer...</span>
                <span style="font-size: 12px; color: #666;">Note: This requires the document to be publicly accessible</span>
              </div>
            `;
            
            // Append iframe and loading message
            containerRef.current.appendChild(iframe);
            containerRef.current.appendChild(loadingMsg);
            
            // Add a back button
            const backButton = document.createElement('button');
            backButton.textContent = 'Back to download options';
            backButton.style.position = 'absolute';
            backButton.style.top = '10px';
            backButton.style.left = '10px';
            backButton.style.padding = '5px 10px';
            backButton.style.backgroundColor = '#f3f4f6';
            backButton.style.border = '1px solid #d1d5db';
            backButton.style.borderRadius = '4px';
            backButton.style.fontSize = '12px';
            backButton.style.cursor = 'pointer';
            backButton.style.zIndex = '10';
            
            backButton.addEventListener('click', () => {
              // Re-render the download options
              renderDocx(url);
            });
            
            containerRef.current.appendChild(backButton);
            
            // Remove loading message when iframe is loaded
            iframe.onload = () => {
              // Check if the loading message is still in the DOM
              if (loadingMsg.parentNode) {
                loadingMsg.parentNode.removeChild(loadingMsg);
              }
            };
            
            // Handle iframe errors
            iframe.onerror = () => {
              // Re-render the download options if the iframe fails to load
              renderDocx(url);
            };
          } catch (err) {
            console.error('Error using Office 365 Viewer:', err);
            // If there's an error, revert to the download view
            renderDocx(url);
          }
        });
        
        // Assemble the message container
        messageContainer.appendChild(docIcon);
        messageContainer.appendChild(messageText);
        messageContainer.appendChild(downloadButton);
        messageContainer.appendChild(tryOfficeViewerButton);
        
        // Add to the main container
        containerRef.current.appendChild(messageContainer);
        
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error handling DOCX document:', err);
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div class="p-4 text-center">
            <div class="text-red-600 mb-4">Error handling document: ${err.message}</div>
            <div>
              <a href="${url}" download class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download to view
              </a>
            </div>
          </div>
        `;
      }
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="native-doc-viewer" 
      style={{ width: '100%', height: '100%', minHeight: '500px', overflow: 'auto', background: 'white' }}
    />
  );
};

export default NativeDocViewer;