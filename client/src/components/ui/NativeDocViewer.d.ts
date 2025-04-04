import React from 'react';

interface NativeDocViewerProps {
  /**
   * URL of the document to be displayed
   */
  documentUrl: string;
  
  /**
   * Optional document type override (e.g., 'pdf', 'docx')
   * If not provided, will be inferred from the documentUrl extension
   */
  documentType?: string;
}

/**
 * A native document viewer component that renders documents in their original format
 * Currently supports PDF using PDF.js and DOCX with a download option or Office 365 Viewer
 */
declare const NativeDocViewer: React.FC<NativeDocViewerProps>;

export default NativeDocViewer;