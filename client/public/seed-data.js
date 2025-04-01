// This script adds sample data to the application

// Add task data
const sampleTasks = [
  // Deal 1 Internal Tasks
  {
    name: "Create stock purchase agreement",
    description: "Draft the initial SPA document for review",
    dealId: 1,
    taskType: "internal",
    status: "completed",
    dueDate: "2025-02-20T00:00:00.000Z",
    assigneeId: 1
  },
  {
    name: "Review term sheet with finance team",
    description: "Discuss valuation and investment terms",
    dealId: 1,
    taskType: "internal",
    status: "completed",
    dueDate: "2025-02-15T00:00:00.000Z",
    assigneeId: 2
  },
  {
    name: "Prepare investor presentation",
    description: "Create slides for upcoming investor meeting",
    dealId: 1,
    taskType: "internal",
    status: "in-progress",
    dueDate: "2025-04-10T00:00:00.000Z",
    assigneeId: 3
  },
  {
    name: "Update cap table",
    description: "Reflect new investment in the capitalization table",
    dealId: 1,
    taskType: "internal",
    status: "open",
    dueDate: "2025-04-15T00:00:00.000Z",
    assigneeId: 1
  },
  // Deal 1 External Tasks
  {
    name: "Due diligence review",
    description: "Comprehensive legal review of company documents",
    dealId: 1,
    taskType: "external",
    status: "in-progress",
    dueDate: "2025-04-05T00:00:00.000Z",
    lawFirmId: 1
  },
  {
    name: "Draft investor rights agreement",
    description: "Prepare investor rights and governance terms",
    dealId: 1,
    taskType: "external",
    status: "open",
    dueDate: "2025-04-12T00:00:00.000Z",
    lawFirmId: 1,
    attorneyId: 2
  },
  {
    name: "IP ownership verification",
    description: "Verify all intellectual property assignments and registrations",
    dealId: 1,
    taskType: "external",
    status: "open",
    dueDate: "2025-04-20T00:00:00.000Z",
    lawFirmId: 2
  },
  // Deal 2 Tasks
  {
    name: "Review acquisition terms",
    description: "Initial review of deal terms and structures",
    dealId: 2,
    taskType: "internal",
    status: "completed",
    dueDate: "2025-03-10T00:00:00.000Z",
    assigneeId: 1
  },
  {
    name: "Finalize acquisition price",
    description: "Work with finance to determine final offer",
    dealId: 2,
    taskType: "internal",
    status: "in-progress",
    dueDate: "2025-04-08T00:00:00.000Z",
    assigneeId: 2
  },
  {
    name: "Antitrust analysis",
    description: "Evaluate regulatory concerns",
    dealId: 2,
    taskType: "external",
    status: "open",
    dueDate: "2025-04-15T00:00:00.000Z",
    lawFirmId: 1,
    attorneyId: 1
  },
  // Deal 3 Tasks
  {
    name: "Draft convertible note",
    description: "Create convertible note documentation",
    dealId: 3,
    taskType: "internal",
    status: "in-progress",
    dueDate: "2025-04-05T00:00:00.000Z",
    assigneeId: 3
  },
  {
    name: "Review financing terms",
    description: "Legal review of note terms and conditions",
    dealId: 3,
    taskType: "external",
    status: "open",
    dueDate: "2025-04-10T00:00:00.000Z",
    lawFirmId: 2
  }
];

// Add closing checklist items
const sampleChecklistItems = [
  // Deal 1 Checklist Items
  {
    dealId: 1,
    title: "Corporate Authorizations",
    isCompleted: true,
    parentId: null,
    position: 1
  },
  {
    dealId: 1,
    title: "Board Approval",
    isCompleted: true,
    parentId: 1,
    position: 1
  },
  {
    dealId: 1,
    title: "Stockholder Approval",
    isCompleted: false,
    parentId: 1,
    position: 2
  },
  {
    dealId: 1,
    title: "Officer's Certificate",
    isCompleted: false,
    parentId: 1,
    position: 3
  },
  {
    dealId: 1,
    title: "Transactional Documents",
    isCompleted: false,
    parentId: null,
    position: 2
  },
  {
    dealId: 1,
    title: "Stock Purchase Agreement",
    isCompleted: true,
    parentId: 5,
    position: 1
  },
  {
    dealId: 1,
    title: "Investor Rights Agreement",
    isCompleted: false,
    parentId: 5,
    position: 2
  },
  {
    dealId: 1,
    title: "Right of First Refusal Agreement",
    isCompleted: false,
    parentId: 5,
    position: 3
  },
  {
    dealId: 1,
    title: "Voting Agreement",
    isCompleted: false,
    parentId: 5,
    position: 4
  },
  {
    dealId: 1,
    title: "Compliance & Diligence",
    isCompleted: false,
    parentId: null,
    position: 3
  },
  {
    dealId: 1,
    title: "Good Standing Certificate",
    isCompleted: true,
    parentId: 10,
    position: 1
  },
  {
    dealId: 1,
    title: "IP Assignments",
    isCompleted: false,
    parentId: 10,
    position: 2
  },
  {
    dealId: 1,
    title: "Due Diligence Checklist",
    isCompleted: false,
    parentId: 10,
    position: 3
  },
  // Deal 2 Checklist Items
  {
    dealId: 2,
    title: "Corporate Approvals",
    isCompleted: true,
    parentId: null,
    position: 1
  },
  {
    dealId: 2,
    title: "Board Resolution",
    isCompleted: true,
    parentId: 14,
    position: 1
  },
  {
    dealId: 2,
    title: "Merger Agreement",
    isCompleted: false,
    parentId: null,
    position: 2
  },
  {
    dealId: 2,
    title: "Disclosure Schedules",
    isCompleted: false,
    parentId: 16,
    position: 1
  },
  // Deal 3 Checklist Items
  {
    dealId: 3,
    title: "Convertible Note Documents",
    isCompleted: false,
    parentId: null,
    position: 1
  },
  {
    dealId: 3,
    title: "Note Purchase Agreement",
    isCompleted: false,
    parentId: 18,
    position: 1
  },
  {
    dealId: 3,
    title: "Promissory Note",
    isCompleted: true,
    parentId: 18,
    position: 2
  }
];

// Create a function to seed the database
async function seedSampleData() {
  try {
    console.log('Starting to seed data...');
    const response = await fetch('/api/seed-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: sampleTasks,
        closingChecklistItems: sampleChecklistItems
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Seeding response:', data);
    console.log('Sample data added successfully!');
    return data;
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
}

// Run the seeding function and handle errors
seedSampleData()
  .then(() => {
    console.log('Seeding process completed');
  })
  .catch((error) => {
    console.error('Seeding process failed:', error);
  });