// Helper function to create a new document using XMLHttpRequest
// This approach ensures consistent POST request behavior across browsers
export const uploadDocumentWithXhr = async (
  dealId: number, 
  fileData: any, 
  onSuccess: (newDocId?: number) => void,
  onError: (error: any) => void
) => {
  try {
    console.log("Starting document upload with XMLHttpRequest");
    
    // Step 1: Create the document record first
    const createDocumentXhr = new XMLHttpRequest();
    createDocumentXhr.open('POST', '/api/documents', true);
    createDocumentXhr.setRequestHeader('Content-Type', 'application/json');
    
    // We wrap in a Promise to make this function work with async/await
    const documentResponse = await new Promise<any>((resolve, reject) => {
      createDocumentXhr.onload = function() {
        if (createDocumentXhr.status >= 200 && createDocumentXhr.status < 300) {
          try {
            console.log("Document created successfully, response:", createDocumentXhr.responseText);
            const result = JSON.parse(createDocumentXhr.responseText);
            resolve(result);
          } catch (e) {
            console.error("Error parsing document creation response:", e);
            reject(new Error('Invalid response format from server'));
          }
        } else {
          console.error("Failed to create document:", createDocumentXhr.status, createDocumentXhr.responseText);
          reject(new Error(`Failed to create document: ${createDocumentXhr.status}`));
        }
      };
      
      createDocumentXhr.onerror = function() {
        console.error("Network error during document creation");
        reject(new Error('Network error during document creation'));
      };
      
      // Create the document with metadata
      const documentData = {
        title: fileData.fileName,
        dealId: dealId,
        description: "Uploaded document",
        category: "Primary",
        status: "Draft",
        fileType: fileData.fileType,
        assigneeId: null
      };
      
      console.log("Sending document creation request:", documentData);
      createDocumentXhr.send(JSON.stringify(documentData));
    });
    
    // Step 2: Once document is created, create the version with file content
    if (documentResponse && documentResponse.id) {
      const newDocId = documentResponse.id;
      console.log(`Document created with ID: ${newDocId}, now creating version`);
      
      const createVersionXhr = new XMLHttpRequest();
      createVersionXhr.open('POST', `/api/documents/${newDocId}/versions`, true);
      createVersionXhr.setRequestHeader('Content-Type', 'application/json');
      
      // Version creation promise
      await new Promise<void>((resolve, reject) => {
        createVersionXhr.onload = function() {
          if (createVersionXhr.status >= 200 && createVersionXhr.status < 300) {
            console.log("Document version created successfully");
            resolve();
          } else {
            console.error("Failed to create document version:", createVersionXhr.status, createVersionXhr.responseText);
            reject(new Error(`Failed to create document version: ${createVersionXhr.status}`));
          }
        };
        
        createVersionXhr.onerror = function() {
          console.error("Network error during version creation");
          reject(new Error('Network error during version creation'));
        };
        
        // Add user ID to the file data
        const versionData = {
          ...fileData,
          uploadedById: 1 // For demo purposes, use first user
        };
        
        console.log("Sending version creation request");
        createVersionXhr.send(JSON.stringify(versionData));
      });
      
      // Both steps completed successfully
      onSuccess(newDocId);
    } else {
      throw new Error("Document created but no ID returned");
    }
  } catch (error) {
    console.error("Error in document upload process:", error);
    onError(error);
  }
};