import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add global styles for document comparison
const style = document.createElement('style');
style.innerHTML = `
  /* Style for document comparison to match Microsoft Word track changes */
  .wordlike-deleted {
    color: #991b1b !important;
    text-decoration: line-through !important;
    text-decoration-color: #991b1b !important;
  }
  
  .wordlike-added {
    color: #166534 !important;
    text-decoration: underline !important;
    text-decoration-color: #166534 !important;
  }
  
  /* Special styles for signature block */
  .signature-name-deleted {
    color: #991b1b !important;
    text-decoration: line-through !important;
    text-decoration-color: #991b1b !important;
    display: inline-block !important;
  }
  
  .signature-name-added {
    color: #166534 !important;
    text-decoration: underline !important;
    text-decoration-color: #166534 !important;
    display: inline-block !important;
    margin-left: 5px !important;
  }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(<App />);
