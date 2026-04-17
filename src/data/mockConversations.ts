import type { Conversation, Message } from '@/types';

// Generate mock conversations with varied titles and timestamps
const generateMockConversations = (): Conversation[] => {
  const conversations: Conversation[] = [];
  const now = new Date();

  const conversationTitles = [
    'Understanding React Hooks React Hooks ',
    'Next.js Best Practices',
    'TypeScript Advanced Types TypeScript Advanced Types',
    'CSS Grid Layout Guide CSS Grid Layout Guide',
    'JavaScript Async/Await JavaScript Async/Await',
    'Node.js Performance Tips',
    'Database Design Patterns Database Design Patterns',
    'API Security Best Practices API Security Best Practices',
    'Frontend Architecture Frontend Architecture',
    'State Management Solutions State Management Solutions',
    'Testing Strategies Testing Strategies',
    'Code Review Guidelines Code Review Guidelines',
    'Git Workflow Tips Git Workflow Tips',
    'Docker Container Basics Docker Container Basics',
    'Microservices Architecture Microservices Architecture',
    'GraphQL vs REST API GraphQL vs REST API',
    'Web Performance Optimization Web Performance Optimization',
    'Accessibility Guidelines Accessibility Guidelines',
    'Mobile App Development Mobile App Development',
    'Cloud Deployment Strategies Cloud Deployment Strategies',
    'Machine Learning Basics Machine Learning Basics',
    'Data Structures Explained Data Structures Explained',
    'Algorithm Complexity Algorithm Complexity',
    'System Design Principles System Design Principles',
    'DevOps Pipeline Setup DevOps Pipeline Setup',
    'CI/CD Best Practices',
    'Error Handling Patterns',
    'Logging and Monitoring',
    'Authentication Methods',
    'Authorization Strategies',
    'Payment Integration Guide',
    'Email Service Setup',
    'File Upload Implementation',
    'Real-time Features',
    'WebSocket Communication',
    'Progressive Web Apps',
    'Service Workers Guide',
    'Offline Functionality',
    'Push Notifications',
    'Analytics Integration',
    'A/B Testing Setup',
    'User Onboarding Flow',
    'Dashboard Design',
    'Data Visualization',
    'Chart Libraries Comparison',
    'Form Validation',
    'Input Sanitization',
    'XSS Prevention',
    'CSRF Protection',
    'Rate Limiting',
    'Caching Strategies'
  ];

  // Add Batch2Response showcase conversation
  const batch2CreatedAt = new Date(now);
  batch2CreatedAt.setMinutes(now.getMinutes() - 30);

  const batch2Messages: Message[] = [
    {
      id: 'batch2-msg-1',
      role: 'user',
      content: 'Show me all available response UI components',
      timestamp: new Date(batch2CreatedAt),
    },
    {
      id: 'batch2-msg-2',
      role: 'assistant',
      content: `# Dashboard Overview

Here's a comprehensive showcase of all available UI response components:

<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "kpi-card",
      "title": "Total Budget",
      "value": "SAR 450M",
      "subtitle": "Q3 2024 Allocation"
    },
    {
      "type": "kpi-card",
      "title": "Actual Spend",
      "value": "SAR 312M",
      "subtitle": "-5.1% variance",
      "trend": {
        "value": "-5.1%",
        "direction": "down",
        "color": "green"
      }
    },
    {
      "type": "kpi-card",
      "title": "Total Headcount",
      "value": "679",
      "subtitle": "+12.3% vs Q2",
      "trend": {
        "value": "12.3%",
        "direction": "up",
        "color": "green"
      }
    },
    {
      "type": "kpi-card",
      "title": "Project Completion",
      "value": "60%",
      "subtitle": "-3.2% behind schedule",
      "trend": {
        "value": "-3.2%",
        "direction": "down",
        "color": "red"
      }
    },
    {
      "type": "kpi-card",
      "title": "Risk Score",
      "value": "Medium",
      "subtitle": "No change from last month"
    }
  ]
}
</div>

## Month-over-Month Budget Analysis

<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "comparison",
      "title": "Month-over-Month Budget Analysis",
      "subtitle": "Comparing September vs October 2024 spending across Entertainment District categories:",
      "items": [
        {
          "label": "Personnel",
          "currentValue": "SAR 145M",
          "change": {
            "value": "SAR 12M",
            "percentage": "8.9%",
            "direction": "up"
          }
        },
        {
          "label": "Operations",
          "currentValue": "SAR 67M",
          "change": {
            "value": "SAR 4M",
            "percentage": "5.6%",
            "direction": "down"
          }
        },
        {
          "label": "Construction",
          "currentValue": "SAR 89M",
          "change": {
            "value": "SAR 15M",
            "percentage": "20.2%",
            "direction": "up"
          }
        },
        {
          "label": "Equipment",
          "currentValue": "SAR 11M",
          "change": {
            "value": "SAR 2M",
            "percentage": "15.4%",
            "direction": "down"
          }
        }
      ]
    }
  ]
}
</div>

## Year-over-Year Comparison

<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "year-over-year",
      "title": "Year-over-Year Comparison",
      "currentYear": "2025",
      "currentValue": "SAR 312M",
      "previousYear": "2024",
      "previousValue": "SAR 187M",
      "change": {
        "value": "SAR 125M",
        "percentage": "66.8% increase",
        "direction": "up"
      },
      "description": "Compared to Q3 2024, the Entertainment District shows remarkable progress:"
    }
  ]
}
</div>

## Critical Risk Assessment

Potential delays in the *Six Flags* development timeline due to supply chain constraints affecting roller coaster components. The project manager has flagged <span data-type="highlight" data-highlight="yellow">RISK-ENT-2024-067</span> in the risk register with a <span data-type="highlight" data-highlight="yellow">HIGH priority status</span>.

<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "paragraph-divider",
      "paragraphs": [
        "The procurement team must secure alternative suppliers for <span data-type='highlight' data-highlight='yellow'>steel structural components</span> by December 15, 2025 to avoid cascading delays. Current lead time estimates show <span data-type='highlight' data-color='#EF4444'>16-week delivery</span> from European manufacturers versus <span data-type='highlight' data-color='#EF4444'>8-week delivery</span> from approved Saudi suppliers.",
        "The Gaming & E-sports arena has successfully completed network infrastructure installation. <span data-type='highlight' data-color='#EF4444'>10Gbps fiber connectivity</span> is now operational, positioning the venue to host international tournaments as planned for **Q2 2026**."
      ]
    }
  ]
}
</div>

## Charts Showcase

### Area Chart

<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "chart",
      "chartType": "area",
      "title": "Box Office - Sales",
      "subtitle": "Showing Online vs. On-Site sales",
      "data": [
        { "name": "Apr 10", "On-Site": 150, "Online": 100 },
        { "name": "Apr 20", "On-Site": 180, "Online": 120 },
        { "name": "Apr 30", "On-Site": 200, "Online": 150 },
        { "name": "May 10", "On-Site": 220, "Online": 180 },
        { "name": "May 20", "On-Site": 250, "Online": 200 },
        { "name": "May 30", "On-Site": 280, "Online": 220 },
        { "name": "Jun 10", "On-Site": 300, "Online": 250 },
        { "name": "Jun 20", "On-Site": 320, "Online": 280 },
        { "name": "Jun 30", "On-Site": 350, "Online": 300 }
      ],
      "height": 300
    }
  ]
}
</div>

### Bar Chart

<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "chart",
      "chartType": "bar",
      "title": "Sales by Category",
      "data": [
        { "name": "Entertainment", "Sales": 450 },
        { "name": "Food & Beverage", "Sales": 320 },
        { "name": "Merchandise", "Sales": 180 },
        { "name": "Parking", "Sales": 120 }
      ],
      "height": 300
    }
  ]
}
</div>

### Pie Chart

<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "chart",
      "chartType": "pie",
      "title": "Revenue Distribution",
      "data": [
        { "name": "Tickets", "value": 45 },
        { "name": "Food", "value": 25 },
        { "name": "Merchandise", "value": 20 },
        { "name": "Other", "value": 10 }
      ],
      "height": 300
    }
  ]
}
</div>

### Line Chart

<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "chart",
      "chartType": "line",
      "title": "Monthly Revenue Trend",
      "data": [
        { "name": "Jan", "Revenue": 120 },
        { "name": "Feb", "Revenue": 150 },
        { "name": "Mar", "Revenue": 180 },
        { "name": "Apr", "Revenue": 200 },
        { "name": "May", "Revenue": 240 },
        { "name": "Jun", "Revenue": 280 }
      ],
      "height": 300
    }
  ]
}
</div>

### Donut Chart

<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "chart",
      "chartType": "donut",
      "title": "Budget Allocation by Department",
      "subtitle": "Q3 2024 Entertainment District Budget Distribution",
      "data": [
        { "name": "Personnel", "value": 145 },
        { "name": "Operations", "value": 98 },
        { "name": "Construction", "value": 89 },
        { "name": "Marketing", "value": 45 },
        { "name": "Equipment", "value": 24 },
        { "name": "Other", "value": 11 }
      ],
      "height": 300
    }
  ]
}
</div>

### Radar Chart

<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "chart",
      "chartType": "radar",
      "title": "Performance Metrics Overview",
      "subtitle": "Multi-dimensional performance analysis across key areas",
      "data": [
        { "name": "Budget Efficiency", "value": 85 },
        { "name": "Timeline Adherence", "value": 72 },
        { "name": "Quality Standards", "value": 90 },
        { "name": "Resource Utilization", "value": 78 },
        { "name": "Risk Management", "value": 65 },
        { "name": "Stakeholder Satisfaction", "value": 88 }
      ],
      "height": 300
    }
  ]
}
</div>

### Radial Chart

<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "chart",
      "chartType": "radial",
      "title": "Project Completion Progress",
      "subtitle": "Individual project completion rates",
      "data": [
        { "name": "Six Flags", "value": 75 },
        { "name": "Gaming Arena", "value": 90 },
        { "name": "Aqua Park", "value": 65 },
        { "name": "Speed Park", "value": 82 },
        { "name": "Entertainment Hub", "value": 58 }
      ],
      "height": 300
    }
  ]
}
</div>

### Bar Chart with Multiple Datasets

<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "chart",
      "chartType": "bar",
      "title": "Revenue Comparison: Q2 vs Q3 2024",
      "subtitle": "Comparing revenue across different categories for two quarters",
      "data": [
        { "name": "Entertainment", "Q2 2024": 380, "Q3 2024": 450 },
        { "name": "Food & Beverage", "Q2 2024": 280, "Q3 2024": 320 },
        { "name": "Merchandise", "Q2 2024": 150, "Q3 2024": 180 },
        { "name": "Parking", "Q2 2024": 95, "Q3 2024": 120 },
        { "name": "Events", "Q2 2024": 210, "Q3 2024": 275 }
      ],
      "height": 300
    }
  ]
}
</div>

## Headings with Nested Content

<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "heading",
      "level": 1,
      "content": "Main Section",
      "children": [
        {
          "type": "list",
          "ordered": false,
          "items": [
            "First bullet point",
            "Second bullet point",
            {
              "text": "Nested parent item",
              "children": [
                "Nested child 1",
                "Nested child 2"
              ]
            }
          ]
        }
      ]
    }
  ]
}
</div>

## Table Example

<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "table",
      "headers": ["Venue", "Current Headcount", "Last Updated", "Last Count", "Status"],
      "rows": [
        ["Six Flags", "342", "Nov 20, 2025", "335", "Positive Label"],
        ["Aqua Park", "156", "Nov 19, 2025", "151", "Positive Label"],
        ["Speed Park", "93", "Nov 20, 2025", "90", "Negative Label"],
        ["Gaming & E-sports", "87", "Nov 18, 2025", "81", "Warning Label"],
        ["Venue 5", "54", "Nov 18, 2025", "51", "Positive Label"],
        ["Venue 6", "42", "Nov 18, 2025", "39", "Negative Label"],
        ["Venue 7", "38", "Nov 18, 2025", "32", "Positive Label"],
        ["Venue 8", "13", "Nov 18, 2025", "10", "Warning Label"],
        ["Venue 9", "128", "Nov 17, 2025", "125", "Positive Label"],
        ["Venue 10", "95", "Nov 17, 2025", "92", "Positive Label"],
        ["Venue 11", "67", "Nov 17, 2025", "64", "Negative Label"],
        ["Venue 12", "45", "Nov 16, 2025", "42", "Warning Label"],
        ["Venue 13", "89", "Nov 16, 2025", "86", "Positive Label"],
        ["Venue 14", "72", "Nov 16, 2025", "69", "Positive Label"],
        ["Venue 15", "56", "Nov 15, 2025", "53", "Negative Label"],
        ["Venue 16", "34", "Nov 15, 2025", "31", "Warning Label"],
        ["Venue 17", "112", "Nov 15, 2025", "109", "Positive Label"],
        ["Venue 18", "78", "Nov 14, 2025", "75", "Positive Label"],
        ["Venue 19", "61", "Nov 14, 2025", "58", "Negative Label"],
        ["Venue 20", "29", "Nov 14, 2025", "26", "Warning Label"]
      ]
    }
  ]
}
</div>

This showcases all available response UI components including KPI cards, comparisons, charts, tables, headings, lists, and text highlighting.`,
      timestamp: new Date(batch2CreatedAt.getTime() + 2000),
    },
  ];

  //TODO: for now Need to remove this conversation
  conversations.push({
    id: 'conv-2',
    title: 'Chart Response Showcase',
    messages: batch2Messages,
    createdAt: batch2CreatedAt,
    updatedAt: new Date(now),
    starred: false,
  });

    // Gen AI Team JSON Test - Top 5 Event Types (competitive risk chart)
  const genAiTestCreatedAt = new Date(now);
  genAiTestCreatedAt.setMinutes(now.getMinutes() - 15);

  const genAiTestBatch2Payload = {
    type: 'batch2',
    blocks: [
      {
        type: 'paragraph-divider',
        paragraphs: [
          'The following chart displays the top 5 event types posing the highest competitive risk, ranked by their total expected attendance. These event types attract the largest audiences, indicating significant competition.',
        ],
      },
      {
        type: 'chart',
        chartType: 'bar',
        title: 'Top 5 Event Types by Total Expected Attendance',
        subtitle: 'This chart illustrates the total expected attendance for the five event types with the highest competitive risk.',
        data: [
          { Event_Type: 'Concert', Total_Expected_Attendance: 4507878 },
          { Event_Type: 'Promotion', Total_Expected_Attendance: 4348672 },
          { Event_Type: 'Festival', Total_Expected_Attendance: 4298716 },
          { Event_Type: 'Holiday', Total_Expected_Attendance: 4291837 },
          { Event_Type: 'Sports', Total_Expected_Attendance: 3838706 },
        ],
        height: 300,
      },
    ],
  };

  // Comparison block - Financial Spend (Gen AI JSON 2)
  const genAiComparisonPayload = {
    type: 'batch2',
    blocks: [
      {
        type: 'comparison',
        title: 'Financial Spend Comparison',
        subtitle: 'Comparing total financial spend between 2024 and 2025',
        items: [
          {
            label: 'Total Financial Spend (2025)',
            currentValue: '255.49M SAR',
            change: {
              direction: 'down',
              percentage: '-4.95%',
              value: '-13.32M SAR',
            },
          },
        ],
      },
    ],
  };

  // Table block - Quarterly Spend (Gen AI JSON 3)
  const genAiTablePayload = {
    type: 'batch2',
    blocks: [
      {
        type: 'table',
        headers: ['Quarter', 'Total Spend (SAR)'],
        rows: [
          ['Q1 2025', '59.75M'],
          ['Q2 2025', '77.31M'],
          ['Q3 2025', '66.21M'],
          ['Q4 2025', '52.22M'],
        ],
      },
    ],
  };

  // Pie chart - Travel expenses by department (Gen AI JSON 5)
  const genAiPieChartPayload = {
    type: 'batch2',
    blocks: [
      {
        type: 'chart',
        chartType: 'pie',
        title: 'Travel Expenses by Department',
        subtitle: 'Distribution of total travel expenses across different departments.',
        data: [
          { name: 'HR', 'Total Travel Expense (SAR)': 16566400 },
          { name: 'Projects', 'Total Travel Expense (SAR)': 16107900 },
          { name: 'IT', 'Total Travel Expense (SAR)': 17574100 },
          { name: 'Finance', 'Total Travel Expense (SAR)': 10707200 },
          { name: 'Operations', 'Total Travel Expense (SAR)': 16228900 },
        ],
        height: 300,
      },
    ],
  };

  // Chart only - Ticket Sales by Location (Gen AI JSON 6)
  const genAiTicketSalesChartOnlyPayload = {
    type: 'batch2',
    blocks: [
      {
        type: 'chart',
        chartType: 'bar',
        title: 'Ticket Sales by Location',
        subtitle: 'Panorama 10 leads with the highest sales',
        height: 300,
        data: [
          { name: 'PANORAMA 10', 'Ticket Sales': 259463 },
          { name: 'AJDAN WALK 9', 'Ticket Sales': 228695 },
          { name: 'STARS AVENUE 9', 'Ticket Sales': 220514 },
          { name: 'RIYADH GALLERY 9', 'Ticket Sales': 210520 },
          { name: 'TABUK BLV 7', 'Ticket Sales': 47263 },
          { name: 'GARDEN 5', 'Ticket Sales': 26217 },
          { name: 'Other', 'Ticket Sales': 14459 },
        ],
      },
    ],
  };

  // Paragraph-divider + Chart - Ticket Sales overview (Gen AI JSON 7)
  const genAiTicketSalesWithParagraphPayload = {
    type: 'batch2',
    blocks: [
      {
        type: 'paragraph-divider',
        paragraphs: [
          'Here is an overview of ticket sales by location, highlighting the top performers.',
        ],
      },
      {
        type: 'chart',
        chartType: 'bar',
        title: 'Ticket Sales by Location',
        subtitle: 'Overview of sales across different sites',
        height: 300,
        data: [
          { name: 'PANORAMA 10', 'Ticket Sales': 259463 },
          { name: 'AJDAN WALK 9', 'Ticket Sales': 228695 },
          { name: 'STARS AVENUE 9', 'Ticket Sales': 220514 },
          { name: 'RIYADH GALLERY 9', 'Ticket Sales': 210520 },
          { name: 'TABUK BLV 7', 'Ticket Sales': 47263 },
        ],
      },
    ],
  };

  // JSON 8: paragraph-divider + table (with title) + line chart - Employee Salaries
  const genAiEmployeeSalariesPayload = {
    type: 'batch2',
    blocks: [
      {
        type: 'paragraph-divider',
        paragraphs: [
          'Here is a list of employees and their current salaries, along with the trend of average salaries over the years.',
        ],
      },
      {
        type: 'table',
        title: 'Employee Salaries',
        headers: ['Employee ID', 'Current Salary'],
        rows: [
          ['E001', '$20,000'],
          ['E002', '$22,000'],
          ['E003', '$15,000'],
          ['E004', '$15,000'],
          ['E005', '$14,000'],
          ['E006', '$17,000'],
          ['E007', '$12,000'],
          ['E008', '$14,500'],
        ],
      },
      {
        type: 'chart',
        chartType: 'line',
        title: 'Average Salary Trend by Year',
        height: 300,
        data: [
          { name: '2021', 'Average Salary': 16500 },
          { name: '2022', 'Average Salary': 16500 },
          { name: '2023', 'Average Salary': 13500 },
          { name: '2024', 'Average Salary': 18000 },
          { name: '2025', 'Average Salary': 15000 },
        ],
      },
    ],
  };

  // JSON 9: paragraph + table + comparison (different format) + multi-series line chart
  const genAiTopSalariedPayload = {
    type: 'batch2',
    blocks: [
      {
        type: 'paragraph-divider',
        paragraphs: [
          "Here's a breakdown of the top salaried employees, their historical salary trends, and a comparison of average salaries.",
        ],
      },
      {
        type: 'table',
        headers: ['Employee ID', 'Current Salary'],
        rows: [
          ['E002', '$22,000'],
          ['E001', '$20,000'],
          ['E006', '$17,000'],
          ['E004', '$15,000'],
          ['E003', '$15,000'],
          ['E008', '$14,500'],
          ['E005', '$14,000'],
          ['E007', '$12,000'],
        ],
      },
      {
        type: 'comparison',
        title: 'Average Salary Comparison',
        items: [
          { label: 'Top Employees Average', currentValue: '$16,187.50', change: { value: '0%', percentage: '0%', direction: 'up' } },
          { label: 'Overall Average', currentValue: '$16,187.50', change: { value: '0%', percentage: '0%', direction: 'up' } },
        ],
      },
      {
        type: 'chart',
        chartType: 'line',
        title: 'Salary Trend for Top Salaried Employees',
        subtitle: 'Changes in salary over time for key employees (E001, E002, E004, E006)',
        height: 300,
        data: [
          { name: '2021-01-10', 'E001 Salary': 18000 },
          { name: '2022-03-15', 'E001 Salary': 18000, 'E002 Salary': 18000 },
          { name: '2022-11-11', 'E001 Salary': 18000, 'E002 Salary': 18000, 'E006 Salary': 17000 },
          { name: '2023-02-05', 'E001 Salary': 18000, 'E002 Salary': 18000, 'E006 Salary': 17000, 'E004 Salary': 13000 },
          { name: '2024-01-01', 'E001 Salary': 20000, 'E002 Salary': 18000, 'E006 Salary': 17000, 'E004 Salary': 13000 },
          { name: '2024-07-01', 'E001 Salary': 20000, 'E002 Salary': 22000, 'E006 Salary': 17000, 'E004 Salary': 13000 },
          { name: '2025-01-01', 'E001 Salary': 20000, 'E002 Salary': 22000, 'E006 Salary': 17000, 'E004 Salary': 15000 },
        ],
      },
    ],
  };

  // Paragraph-divider only - IT travel spending explanation (Gen AI JSON 4)
  const genAiParagraphPayload = {
    type: 'batch2',
    blocks: [
      {
        type: 'paragraph-divider',
        paragraphs: [
          "The IT department's high spending on business travel could be attributed to several factors. Often, IT professionals are required to travel for specialized training, certifications, or to attend industry conferences to stay updated with rapidly evolving technologies. They might also travel to implement new systems or provide on-site support for critical infrastructure across different company locations or for external client projects. Furthermore, vendor meetings for new software or hardware procurement, or collaboration with international teams, can also necessitate business travel for IT personnel.",
        ],
      },
    ],
  };

  const genAiTestMessages: Message[] = [
    {
      id: 'genai-test-msg-1',
      role: 'user',
      content: 'Show me top 5 event types by competitive risk and expected attendance',
      timestamp: new Date(genAiTestCreatedAt),
    },
    {
      id: 'genai-test-msg-2',
      role: 'assistant',
      content: `<div data-type="batch2-response">${JSON.stringify(genAiTestBatch2Payload)}</div>`,
      timestamp: new Date(genAiTestCreatedAt.getTime() + 2000),
    },
    {
      id: 'genai-test-msg-3',
      role: 'user',
      content: 'Show me financial spend comparison between 2024 and 2025',
      timestamp: new Date(genAiTestCreatedAt.getTime() + 5000),
    },
    {
      id: 'genai-test-msg-4',
      role: 'assistant',
      content: `<div data-type="batch2-response">${JSON.stringify(genAiComparisonPayload)}</div>`,
      timestamp: new Date(genAiTestCreatedAt.getTime() + 7000),
    },
    {
      id: 'genai-test-msg-5',
      role: 'user',
      content: 'Show me quarterly spend breakdown for 2025',
      timestamp: new Date(genAiTestCreatedAt.getTime() + 10000),
    },
    {
      id: 'genai-test-msg-6',
      role: 'assistant',
      content: `<div data-type="batch2-response">${JSON.stringify(genAiTablePayload)}</div>`,
      timestamp: new Date(genAiTestCreatedAt.getTime() + 12000),
    },
    {
      id: 'genai-test-msg-7',
      role: 'user',
      content: 'Why does IT have high business travel spending?',
      timestamp: new Date(genAiTestCreatedAt.getTime() + 15000),
    },
    {
      id: 'genai-test-msg-8',
      role: 'assistant',
      content: `<div data-type="batch2-response">${JSON.stringify(genAiParagraphPayload)}</div>`,
      timestamp: new Date(genAiTestCreatedAt.getTime() + 17000),
    },
    {
      id: 'genai-test-msg-9',
      role: 'user',
      content: 'Show me travel expenses by department',
      timestamp: new Date(genAiTestCreatedAt.getTime() + 20000),
    },
    {
      id: 'genai-test-msg-10',
      role: 'assistant',
      content: `<div data-type="batch2-response">${JSON.stringify(genAiPieChartPayload)}</div>`,
      timestamp: new Date(genAiTestCreatedAt.getTime() + 22000),
    },
    {
      id: 'genai-test-msg-11',
      role: 'user',
      content: 'Show me ticket sales by location - chart only',
      timestamp: new Date(genAiTestCreatedAt.getTime() + 25000),
    },
    {
      id: 'genai-test-msg-12',
      role: 'assistant',
      content: `<div data-type="batch2-response">${JSON.stringify(genAiTicketSalesChartOnlyPayload)}</div>`,
      timestamp: new Date(genAiTestCreatedAt.getTime() + 27000),
    },
    {
      id: 'genai-test-msg-13',
      role: 'user',
      content: 'Give me an overview of ticket sales by location',
      timestamp: new Date(genAiTestCreatedAt.getTime() + 30000),
    },
    {
      id: 'genai-test-msg-14',
      role: 'assistant',
      content: `<div data-type="batch2-response">${JSON.stringify(genAiTicketSalesWithParagraphPayload)}</div>`,
      timestamp: new Date(genAiTestCreatedAt.getTime() + 32000),
    },
    {
      id: 'genai-test-msg-15',
      role: 'user',
      content: 'Show me employees and their salaries with average trend',
      timestamp: new Date(genAiTestCreatedAt.getTime() + 35000),
    },
    {
      id: 'genai-test-msg-16',
      role: 'assistant',
      content: `<div data-type="batch2-response">${JSON.stringify(genAiEmployeeSalariesPayload)}</div>`,
      timestamp: new Date(genAiTestCreatedAt.getTime() + 37000),
    },
    {
      id: 'genai-test-msg-17',
      role: 'user',
      content: 'Show me top salaried employees with comparison and salary trends',
      timestamp: new Date(genAiTestCreatedAt.getTime() + 40000),
    },
    {
      id: 'genai-test-msg-18',
      role: 'assistant',
      content: `<div data-type="batch2-response">${JSON.stringify(genAiTopSalariedPayload)}</div>`,
      timestamp: new Date(genAiTestCreatedAt.getTime() + 42000),
    },
  ];

  conversations.push({
    id: 'conv-genai-test',
    title: 'Gen AI JSON Test - Top 5 Event Types',
    messages: genAiTestMessages,
    createdAt: genAiTestCreatedAt,
    updatedAt: new Date(now),
    starred: false,
  });

  // PRO mode - Employee stats mock (full API response format)
  const proModeCreatedAt = new Date(now);
  proModeCreatedAt.setMinutes(now.getMinutes() - 5);

  const proModeBatch2Payload = {
    type: 'batch2',
    blocks: [
      {
        type: 'kpi-card',
        title: 'Total Employees',
        value: '8',
        subtitle: 'Currently active',
      },
      {
        type: 'kpi-card',
        title: 'Average Employee Tenure',
        value: '1299 Days',
        subtitle: 'Average time since hire',
      },
      {
        type: 'chart',
        chartType: 'bar',
        title: 'Employees by Department',
        subtitle: 'Distribution of workforce across departments',
        height: 300,
        data: [
          { name: 'Department D001', Employees: 1 },
          { name: 'Department D002', Employees: 3 },
          { name: 'Department D003', Employees: 2 },
          { name: 'Department D004', Employees: 2 },
        ],
      },
      {
        type: 'table',
        headers: ['Employee ID', 'First Name', 'Last Name', 'Email', 'Phone Number', 'Hire Date'],
        rows: [
          ['E001', 'Fatima', 'AlSaud', 'fatima.alsaud@example.com', '+966500000001', '2021-01-10'],
          ['E005', 'Khalid', 'Ali', 'khalid.ali@example.com', '+966500000005', '2023-07-20'],
          ['E006', 'Omar', 'Abdullah', 'omar.abdullah@example.com', '+966500000006', '2022-11-11'],
          ['E002', 'Ahmed', 'Khan', 'ahmed.khan@example.com', '+966500000002', '2022-03-15'],
          ['E003', 'Sara', 'Yousef', 'sara.yousef@example.com', '+966500000003', '2021-06-01'],
          ['E008', 'Youssef', 'Rahman', 'youssef.rahman@example.com', '+966500000008', '2022-08-09'],
          ['E007', 'Rania', 'Saleh', 'rania.saleh@example.com', '+966500000007', '2024-01-18'],
          ['E004', 'Noura', 'Hassan', 'noura.hassan@example.com', '+966500000004', '2023-02-05'],
        ],
      },
      {
        type: 'paragraph-divider',
        paragraphs: [
          'The 5 most recently hired employees are Rania Saleh, Khalid Ali, Noura Hassan, Omar Abdullah, and Youssef Rahman, indicating recent growth in the workforce.',
        ],
      },
    ],
  };

  const proModeSuggestionsHtml = `

To go further:

<div data-type="suggestions">
<button data-type="suggestion">Show employees hired after 2022?</button>
<button data-type="suggestion">How many employees are there?</button>
<button data-type="suggestion">Can I export this list?</button>
</div>`;

  const proModeMessages: Message[] = [
    {
      id: 'pro-mode-msg-1',
      role: 'user',
      content: 'Show me employee statistics and the full employee list',
      timestamp: new Date(proModeCreatedAt),
    },
    {
      id: 'pro-mode-msg-2',
      role: 'assistant',
      content: `<div data-type="batch2-response">${JSON.stringify(proModeBatch2Payload)}</div>${proModeSuggestionsHtml}`,
      timestamp: new Date(proModeCreatedAt.getTime() + 2000),
    },
  ];

  conversations.push({
    id: 'conv-pro-mode',
    title: 'PRO Mode - Employee Stats',
    messages: proModeMessages,
    createdAt: proModeCreatedAt,
    updatedAt: new Date(now),
    starred: false,
  });

  // Normal mode - Employee list (KPI + table + paragraph, simpler than PRO)
  const normalModeCreatedAt = new Date(now);
  normalModeCreatedAt.setMinutes(now.getMinutes() - 3);

  const normalModeBatch2Payload = {
    type: 'batch2',
    blocks: [
      {
        type: 'kpi-card',
        title: 'Total Employees',
        value: '8',
        subtitle: 'Currently Active',
      },
      {
        type: 'table',
        headers: ['First Name', 'Last Name', 'Email', 'Phone Number', 'Hire Date', 'Job ID', 'Department ID', 'Manager ID'],
        rows: [
          ['Fatima', 'AlSaud', 'fatima.alsaud@example.com', '+966500000001', '2021-01-10', 'J001', 'D001', 'N/A'],
          ['Khalid', 'Ali', 'khalid.ali@example.com', '+966500000005', '2023-07-20', 'J006', 'D002', 'E002'],
          ['Omar', 'Abdullah', 'omar.abdullah@example.com', '+966500000006', '2022-11-11', 'J002', 'D002', 'E002'],
          ['Ahmed', 'Khan', 'ahmed.khan@example.com', '+966500000002', '2022-03-15', 'J002', 'D002', 'N/A'],
          ['Sara', 'Yousef', 'sara.yousef@example.com', '+966500000003', '2021-06-01', 'J003', 'D003', 'N/A'],
          ['Youssef', 'Rahman', 'youssef.rahman@example.com', '+966500000008', '2022-08-09', 'J003', 'D003', 'E003'],
          ['Rania', 'Saleh', 'rania.saleh@example.com', '+966500000007', '2024-01-18', 'J004', 'D004', 'E004'],
          ['Noura', 'Hassan', 'noura.hassan@example.com', '+966500000004', '2023-02-05', 'J004', 'D004', 'N/A'],
        ],
      },
      {
        type: 'paragraph-divider',
        paragraphs: [
          'This table provides a comprehensive list of all active employees, including their contact details, hire dates, job roles, and departmental assignments.',
        ],
      },
    ],
  };

  const normalModeSuggestionsHtml = `

To go further:

<div data-type="suggestions">
<button data-type="suggestion">How many employees are in each department?</button>
<button data-type="suggestion">Show employees hired after 2022.</button>
<button data-type="suggestion">Can you filter by department or job title?</button>
</div>`;

  // Normal mode - Tickets sold comparison (comparison + chart + paragraph)
  const normalModeTicketsBatch2Payload = {
    type: 'batch2',
    blocks: [
      {
        type: 'comparison',
        title: 'Total Tickets Sold Comparison',
        subtitle: 'Comparing total tickets sold between 2025 and 2026',
        items: [
          {
            label: 'Total Tickets Sold (2026)',
            currentValue: '385,379 Tickets',
            change: {
              value: '+193,438 Tickets',
              percentage: '+100.78%',
              direction: 'up',
            },
          },
        ],
      },
      {
        type: 'chart',
        chartType: 'bar',
        title: 'Tickets Sold by Year',
        subtitle: 'Comparison of tickets sold in 2025 vs 2026',
        height: 300,
        data: [
          { name: '2025', 'Tickets Sold': 191941 },
          { name: '2026', 'Tickets Sold': 385379 },
        ],
      },
      {
        type: 'paragraph-divider',
        paragraphs: [
          'Total tickets sold significantly increased from 191,941 in 2025 to 385,379 in 2026, representing a 100.78% growth.',
        ],
      },
    ],
  };

  const normalModeTicketsSuggestionsHtml = `

To go further:

<div data-type="suggestions">
<button data-type="suggestion">What is the percentage change year-over-year?</button>
<button data-type="suggestion">Show total tickets sold by region for both years.</button>
<button data-type="suggestion">What was the total revenue generated from these tickets?</button>
</div>`;

  const normalModeMessages: Message[] = [
    {
      id: 'normal-mode-msg-1',
      role: 'user',
      content: 'Show me the employee list',
      timestamp: new Date(normalModeCreatedAt),
    },
    {
      id: 'normal-mode-msg-2',
      role: 'assistant',
      content: `<div data-type="batch2-response">${JSON.stringify(normalModeBatch2Payload)}</div>${normalModeSuggestionsHtml}`,
      timestamp: new Date(normalModeCreatedAt.getTime() + 2000),
    },
    {
      id: 'normal-mode-msg-3',
      role: 'user',
      content: 'Compare tickets sold between 2025 and 2026',
      timestamp: new Date(normalModeCreatedAt.getTime() + 5000),
    },
    {
      id: 'normal-mode-msg-4',
      role: 'assistant',
      content: `<div data-type="batch2-response">${JSON.stringify(normalModeTicketsBatch2Payload)}</div>${normalModeTicketsSuggestionsHtml}`,
      timestamp: new Date(normalModeCreatedAt.getTime() + 7000),
    },
  ];

  conversations.push({
    id: 'conv-normal-mode',
    title: 'Normal Mode - Employee List',
    messages: normalModeMessages,
    createdAt: normalModeCreatedAt,
    updatedAt: new Date(now),
    starred: false,
  });

  // New Chat API test - Six Flags Ticket Sales (line chart with dual series)
  const sixFlagsTestCreatedAt = new Date(now);
  sixFlagsTestCreatedAt.setMinutes(now.getMinutes() - 1);

  const sixFlagsBatch2Payload = {
    type: 'batch2',
    blocks: [
      {
        type: 'chart',
        chartType: 'line',
        title: 'Six Flags Ticket Sales by Week',
        subtitle: 'Weekly tickets sold and net revenue from November 2025 to March 2026',
        height: 300,
        data: [
          { name: 'Nov 30', 'Tickets Sold': 31978, 'Net Sales': 10508376.18 },
          { name: 'Dec 07', 'Tickets Sold': 36075, 'Net Sales': 9553522.72 },
          { name: 'Dec 14', 'Tickets Sold': 50407, 'Net Sales': 17789318.5 },
          { name: 'Dec 21', 'Tickets Sold': 49960, 'Net Sales': 15530950.1 },
          { name: 'Dec 28', 'Tickets Sold': 46137, 'Net Sales': 9231582.25 },
          { name: 'Jan 04', 'Tickets Sold': 40209, 'Net Sales': 15756566.02 },
          { name: 'Jan 11', 'Tickets Sold': 40048, 'Net Sales': 16040812.39 },
          { name: 'Jan 18', 'Tickets Sold': 36078, 'Net Sales': 9599158.81 },
          { name: 'Jan 25', 'Tickets Sold': 39853, 'Net Sales': 12061940.31 },
          { name: 'Feb 01', 'Tickets Sold': 39837, 'Net Sales': 16942650.5 },
          { name: 'Feb 08', 'Tickets Sold': 39691, 'Net Sales': 10644418.67 },
          { name: 'Feb 15', 'Tickets Sold': 39995, 'Net Sales': 10373652.88 },
          { name: 'Feb 22', 'Tickets Sold': 40257, 'Net Sales': 12039390.22 },
          { name: 'Mar 01', 'Tickets Sold': 37051, 'Net Sales': 11257022.18 },
          { name: 'Mar 08', 'Tickets Sold': 15071, 'Net Sales': 3106509.87 },
        ],
      },
    ],
  };

  const sixFlagsSuggestionsHtml = `

To go further:

<div data-type="suggestions">
<button data-type="suggestion">Which Six Flags park location had the highest weekly sales?</button>
<button data-type="suggestion">How do these weekly sales compare to the same period last year?</button>
<button data-type="suggestion">Can we see these sales broken down by ticket type (e.g., single-day, season pass)?</button>
</div>`;

  const sixFlagsTestMessages: Message[] = [
    {
      id: 'six-flags-msg-1',
      role: 'user',
      content: 'Show me Six Flags ticket sales by week',
      timestamp: new Date(sixFlagsTestCreatedAt),
    },
    {
      id: 'six-flags-msg-2',
      role: 'assistant',
      content: `<div data-type="batch2-response">${JSON.stringify(sixFlagsBatch2Payload)}</div>${sixFlagsSuggestionsHtml}`,
      timestamp: new Date(sixFlagsTestCreatedAt.getTime() + 2000),
      is_pro: true,
    },
    {
      id: 'six-flags-msg-3',
      role: 'user',
      content: 'What was the total revenue in December?',
      timestamp: new Date(sixFlagsTestCreatedAt.getTime() + 5000),
    },
    {
      id: 'six-flags-msg-4',
      role: 'assistant',
      content: `Total net revenue for December 2025 was **SAR 52.9M** across the four weeks (Dec 7–28).

The highest week was Dec 14 with SAR 17.8M in net sales.`,
      timestamp: new Date(sixFlagsTestCreatedAt.getTime() + 7000),
    },
  ];

  conversations.push({
    id: 'conv-six-flags-test',
    title: 'New Chat API Test - Six Flags Sales',
    messages: sixFlagsTestMessages,
    createdAt: sixFlagsTestCreatedAt,
    updatedAt: new Date(now),
    starred: false,
  });

  // Demo: API response format (output.response + output.suggestions + output.is_pro)
  const apiResponseDemoCreatedAt = new Date(now);
  apiResponseDemoCreatedAt.setSeconds(now.getSeconds() - 45);

  const apiResponseDemoPayload = {
    type: 'batch2',
    blocks: [
      {
        type: 'chart',
        chartType: 'bar',
        title: 'Six Flags Ticket Sales by Week',
        subtitle: 'Weekly net sales from 2025-48 to 2026-10',
        height: 300,
        data: [
          { name: '2025-48', 'Total Net Sales': 11563530.06 },
          { name: '2025-49', 'Total Net Sales': 9510854.84 },
          { name: '2025-50', 'Total Net Sales': 18047778.0 },
          { name: '2025-51', 'Total Net Sales': 15546394.6 },
          { name: '2025-52', 'Total Net Sales': 3836296.5 },
          { name: '2026-00', 'Total Net Sales': 5163019.0 },
          { name: '2026-01', 'Total Net Sales': 17148734.27 },
          { name: '2026-02', 'Total Net Sales': 14222583.77 },
          { name: '2026-03', 'Total Net Sales': 10032021.31 },
          { name: '2026-04', 'Total Net Sales': 12044213.55 },
          { name: '2026-05', 'Total Net Sales': 16927603.38 },
          { name: '2026-06', 'Total Net Sales': 10649365.67 },
          { name: '2026-07', 'Total Net Sales': 10367675.26 },
          { name: '2026-08', 'Total Net Sales': 12026816.59 },
          { name: '2026-09', 'Total Net Sales': 11283200.05 },
          { name: '2026-10', 'Total Net Sales': 2065784.75 },
        ],
      },
    ],
  };

  const apiResponseDemoSuggestionsHtml = `

To go further:

<div data-type="suggestions">
<button data-type="suggestion">What are the weekly sales broken down by park location?</button>
<button data-type="suggestion">How do these weekly sales compare to the same weeks last year?</button>
<button data-type="suggestion">Which ticket types contributed most to these weekly sales?</button>
</div>`;

  const apiResponseDemoMessages: Message[] = [
    {
      id: 'api-demo-msg-1',
      role: 'user',
      content: 'Show me Six Flags ticket sales by week',
      timestamp: new Date(apiResponseDemoCreatedAt),
    },
    {
      id: 'api-demo-msg-2',
      role: 'assistant',
      content: `<div data-type="batch2-response">${JSON.stringify(apiResponseDemoPayload)}</div>${apiResponseDemoSuggestionsHtml}`,
      timestamp: new Date(apiResponseDemoCreatedAt.getTime() + 2000),
      is_pro: false,
    },
  ];

  conversations.push({
    id: 'conv-api-response-demo',
    title: 'API Response Demo - Six Flags Weekly Sales',
    messages: apiResponseDemoMessages,
    createdAt: apiResponseDemoCreatedAt,
    updatedAt: new Date(now),
    starred: false,
  });

  // Demo: Contract AVI batch2 payload (inner batch2 + wrapped output.response)
  const aviDemoCreatedAt = new Date(now);
  aviDemoCreatedAt.setSeconds(now.getSeconds() - 30);

  const aviInnerBatch2Payload = {
    type: 'batch2',
    blocks: [
      {
        type: 'paragraph-divider',
        paragraphs: [
          "Summary: An analysis of contract adjustments reveals that a significant number of projects have undergone variations from their original scope. Interpreting 'quantities' as the percentage change in Approved Variation Instructions (AVIs) from the original contract value, we found that 47 contracts have received AVIs exceeding 2% of their initial value. This indicates widespread adjustments across projects.",
        ],
      },
      {
        type: 'kpi-card',
        title: 'Contracts with Approved AVIs > 2% of Original Value',
        value: '47',
        subtitle: 'Number of contracts with significant Approved Variation Instructions',
        trend: {
          value: '47 of 48 total contracts',
          direction: 'up',
          color: 'green',
        },
      },
      {
        type: 'chart',
        chartType: 'pie',
        title: 'Approved AVI Significance Distribution',
        subtitle: 'Breakdown of projects by statistical significance of Approved AVIs percentage',
        height: 300,
        data: [
          { name: 'Significant Deviation', Count: 7 },
          { name: 'Not Significant Deviation', Count: 41 },
        ],
      },
      {
        type: 'table',
        headers: ['Project Name', 'Original Contract Value', 'Revised Contract Value', 'Approved AVIs Amount', 'Approved AVIs % Change'],
        rows: [
          ['Luxury Resort Construction', '269.45 M SAR', '291.85 M SAR', '22.40 M SAR', '8.31%'],
          ['Luxury Resort Construction', '144.98 M SAR', '174.05 M SAR', '29.07 M SAR', '20.05%'],
          ['Luxury Resort Construction', '218.22 M SAR', '237.77 M SAR', '19.55 M SAR', '8.96%'],
          ['Stadium Main Structure Build', '202.92 M SAR', '209.10 M SAR', '6.19 M SAR', '3.05%'],
          ['Theme Park Expansion Phase 1', '125.78 M SAR', '138.00 M SAR', '12.22 M SAR', '9.72%'],
          ['Water Park Infrastructure Upgrade', '134.44 M SAR', '151.41 M SAR', '16.97 M SAR', '12.63%'],
          ['Luxury Resort Construction', '41.34 M SAR', '62.12 M SAR', '20.78 M SAR', '50.28%'],
          ['Retail Boulevard Development', '26.16 M SAR', '48.99 M SAR', '22.83 M SAR', '87.24%'],
          ['Retail Boulevard Development', '34.25 M SAR', '53.08 M SAR', '18.83 M SAR', '54.99%'],
          ['Retail Boulevard Development', '21.44 M SAR', '35.14 M SAR', '13.71 M SAR', '63.94%'],
        ],
      },
    ],
  };

  const aviSuggestionsHtml = `

To go further:

<div data-type="suggestions">
<button data-type="suggestion">Do you want a breakdown by day/week/month?</button>
<button data-type="suggestion">Should I plot this as a chart?</button>
</div>`;

  const aviWrappedApiPayload = {
    output: {
      user_id: 'raj',
      session_id: '123456',
      is_pro: true,
      response: JSON.stringify(aviInnerBatch2Payload),
    },
  };

  const aviDemoMessages: Message[] = [
    {
      id: 'avi-demo-msg-1',
      role: 'user',
      content: 'how many contracts have received more than 2 quantities',
      timestamp: new Date(aviDemoCreatedAt),
    },
    {
      id: 'avi-demo-msg-2',
      role: 'assistant',
      content: `<div data-type="batch2-response">${JSON.stringify(aviInnerBatch2Payload)}</div>${aviSuggestionsHtml}`,
      timestamp: new Date(aviDemoCreatedAt.getTime() + 2000),
      is_pro: true,
    },
    {
      id: 'avi-demo-msg-3',
      role: 'user',
      content: 'Validate wrapped output.response format',
      timestamp: new Date(aviDemoCreatedAt.getTime() + 5000),
    },
    {
      id: 'avi-demo-msg-4',
      role: 'assistant',
      content: `<div data-type="response">${JSON.stringify(aviWrappedApiPayload)}</div>${aviSuggestionsHtml}`,
      timestamp: new Date(aviDemoCreatedAt.getTime() + 7000),
      is_pro: true,
    },
  ];

  conversations.push({
    id: 'conv-avi-api-formats-demo',
    title: 'AVI Batch2 Payload (Inner + Wrapped)',
    messages: aviDemoMessages,
    createdAt: aviDemoCreatedAt,
    updatedAt: new Date(now),
    starred: false,
  });

  // Add a complete test conversation with all UI features
  const testCreatedAt = new Date(now);
  testCreatedAt.setHours(now.getHours() - 1);

  const testMessages: Message[] = [
    {
      id: 'test-msg-1',
      role: 'user',
      content: 'Show me the total headcount across all Entertainment venues',
      timestamp: new Date(testCreatedAt),
    },
    {
      id: 'test-msg-2',
      role: 'assistant',
      content: `I found headcount data for 4 out of 7 Entertainment venues:

| Venue | Current Headcount | Last Updated |
|-------|-------------------|--------------|
| Six Flags | 342 | Nov 20, 2025 |
| Gaming & E-sports | 87 | Nov 18, 2025 |
| Aqua Park | 156 | Nov 19, 2025 |
| Speed Park | 93 | Nov 20, 2025 |

<div data-type="warning">
<p>I couldn't retrieve data for:</p>
<ul>
<li>Resort Core Entertainment venues</li>
<li>Lagoon Village attractions</li>
<li>Delta B entertainment facilities</li>
</ul>
<p>Possible reasons:</p>
<ul>
<li>Data not yet available in the system</li>
<li>These venues may still be in planning phase</li>
</ul>
</div>

To go further:

<div data-type="suggestions">
<button data-type="suggestion">Show you the total for available venues only?</button>
<button data-type="suggestion">Search for projected headcount instead?</button>
<button data-type="suggestion">Check which venues have reported data?</button>
</div>`,
      timestamp: new Date(testCreatedAt.getTime() + 3000),
    },
    {
      id: 'test-msg-3',
      role: 'user',
      content: 'Yes, show me the total for what you have',
      timestamp: new Date(testCreatedAt.getTime() + 8000),
    },
    {
      id: 'test-msg-4',
      role: 'assistant',
      content: `Total headcount across 4 Entertainment venues: **679 employees**

This represents approximately 60% of planned Entertainment district staffing based on available data. <span data-type="tag">HR Dashboard, Nov 2024</span>`,
      timestamp: new Date(testCreatedAt.getTime() + 11000),
    },
    {
      id: 'test-msg-5',
      role: 'user',
      content: 'Show me Entertainment district budget overview',
      timestamp: new Date(testCreatedAt.getTime() + 16000),
    },
    {
      id: 'test-msg-6',
      role: 'assistant',
      content: `Here's the Entertainment district budget overview for Q3 2024:

**Total Allocated Budget:** SAR 450M
**Actual Spend to Date:** SAR 312M
**Variance:** -SAR 23M (5.1% under budget)

Breakdown by category:
- **Personnel Costs:** SAR 145M
- **Operations & Maintenance:** SAR 98M
- **Marketing & Events:** SAR 45M
- **Infrastructure:** SAR 24M`,
      timestamp: new Date(testCreatedAt.getTime() + 19000),
    },
  ];

  conversations.push({
    id: 'conv-1',
    title: 'Entertainment District Analytics',
    messages: testMessages,
    createdAt: testCreatedAt,
    updatedAt: new Date(now), // Set to current time to ensure it appears first
    starred: true,
  });

  // Demo: Ticket Sales by Sales Channel (batch2 chart + paragraph-divider + suggestions)
  const ticketSalesCreatedAt = new Date(now);
  ticketSalesCreatedAt.setMinutes(now.getMinutes() - 10);

  conversations.push({
    id: 'conv-ticket-sales-by-channel',
    title: 'Ticket Sales by Sales Channel',
    messages: [
      {
        id: 'ticket-sales-by-channel-msg-1',
        role: 'user',
        content: 'Show ticket sales by sales channel',
        timestamp: new Date(ticketSalesCreatedAt),
      },
      {
        id: 'ticket-sales-by-channel-msg-2',
        role: 'assistant',
        content: `
<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "paragraph-divider",
      "paragraphs": [
        "Summary: The analysis of ticket sales by channel reveals that the 'Online' channel is currently the only active channel generating ticket sales, with a total of 1820.0. Other channels such as 'Call Center', 'POS', 'Kiosk', and 'Mobile App' reported 0.0 sales for the period."
      ]
    },
    {
      "type": "chart",
      "chartType": "bar",
      "title": "Ticket Sales by Sales Channel",
      "subtitle": "Online channel generates all ticket sales",
      "height": 300,
      "data": [
        { "name": "Online", "Ticket Sales": 1820.0 },
        { "name": "Call Center", "Ticket Sales": 0.0 },
        { "name": "POS", "Ticket Sales": 0.0 },
        { "name": "Kiosk", "Ticket Sales": 0.0 },
        { "name": "Mobile App", "Ticket Sales": 0.0 }
      ]
    }
  ]
}
</div>

To go further:

<div data-type="suggestions">
<button data-type="suggestion">What is the average ticket price by sales channel?</button>
<button data-type="suggestion">Show me ticket sales by product name for the online channel.</button>
<button data-type="suggestion">Compare total sales from this period to the previous one.</button>
</div>`,
        timestamp: new Date(ticketSalesCreatedAt.getTime() + 2000),
      },
    ],
    createdAt: ticketSalesCreatedAt,
    updatedAt: new Date(now.getTime() + 1), // ensure it appears at/near the top
    starred: false,
  });

  // Demo: Contracts with Approved AVIs > 2% (batch2: paragraph-divider + kpi-card + pie + table)
  const aviContractsCreatedAt = new Date(now);
  aviContractsCreatedAt.setMinutes(now.getMinutes() - 8);

  conversations.push({
    id: 'conv-approved-avis-2pct',
    title: 'Contracts with Approved AVIs > 2% of Original Value',
    messages: [
      {
        id: 'approved-avis-2pct-msg-1',
        role: 'user',
        content: 'How many contracts have received more than 2 quantities?',
        timestamp: new Date(aviContractsCreatedAt),
      },
      {
        id: 'approved-avis-2pct-msg-2',
        role: 'assistant',
        content: `
<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "paragraph-divider",
      "paragraphs": [
        "Summary: An analysis of contract adjustments reveals that a significant number of projects have undergone variations from their original scope. Interpreting 'quantities' as the percentage change in Approved Variation Instructions (AVIs) from the original contract value, we found that 47 contracts have received AVIs exceeding 2% of their initial value. This indicates widespread adjustments across projects."
      ]
    },
    {
      "type": "kpi-card",
      "title": "Contracts with Approved AVIs > 2% of Original Value",
      "value": "47",
      "subtitle": "Number of contracts with significant Approved Variation Instructions",
      "trend": {
        "value": "47 of 48 total contracts",
        "direction": "up",
        "color": "green"
      }
    },
    {
      "type": "chart",
      "chartType": "pie",
      "title": "Approved AVI Significance Distribution",
      "subtitle": "Breakdown of projects by statistical significance of Approved AVIs percentage",
      "height": 300,
      "data": [
        { "name": "Significant Deviation", "Count": 7 },
        { "name": "Not Significant Deviation", "Count": 41 }
      ]
    },
    {
      "type": "table",
      "headers": ["Project Name", "Original Contract Value", "Revised Contract Value", "Approved AVIs Amount", "Approved AVIs % Change"],
      "rows": [
        ["Luxury Resort Construction", "269.45 M SAR", "291.85 M SAR", "22.40 M SAR", "8.31%"],
        ["Luxury Resort Construction", "144.98 M SAR", "174.05 M SAR", "29.07 M SAR", "20.05%"],
        ["Luxury Resort Construction", "218.22 M SAR", "237.77 M SAR", "19.55 M SAR", "8.96%"]
      ]
    }
  ]
}
</div>

To go further:

<div data-type="suggestions">
<button data-type="suggestion">Do you want a breakdown by day/week/month?</button>
<button data-type="suggestion">Should I plot this as a chart?</button>
</div>`,
        timestamp: new Date(aviContractsCreatedAt.getTime() + 2000),
      },
    ],
    createdAt: aviContractsCreatedAt,
    updatedAt: new Date(now.getTime() + 2), // ensure it appears near the top
    starred: false,
  });

  // Demo: Summer marketing plan - policy_search JSON (paragraph-divider + suggestions)
  const summerMarketingCreatedAt = new Date(now);
  summerMarketingCreatedAt.setMinutes(now.getMinutes() - 6);

  conversations.push({
    id: 'conv-summer-marketing-heat-relief',
    title: 'Summer Marketing - Heat Relief',
    messages: [
      {
        id: 'summer-marketing-msg-1',
        role: 'user',
        content: 'Show me the summer marketing plan overview',
        timestamp: new Date(summerMarketingCreatedAt),
      },
      {
        id: 'summer-marketing-msg-2',
        role: 'assistant',
        content: `
<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "paragraph-divider",
      "paragraphs": [
        "Summary: For the summer, the marketing plan is centered around promoting water rides, specifically through 'Heat Relief' bundles. The overall marketing campaign strategy is designed to align with ticketing, various market events, and point-of-sale (POS) sales. The effectiveness and impact of this campaign will be measured primarily by analyzing ticketing market segments."
      ]
    }
  ]
}
</div>

To go further:

<div data-type="suggestions">
  <button data-type="suggestion">What are the expected results for the 'Heat Relief' bundles?</button>
  <button data-type="suggestion">Can you provide a breakdown of ticketing market segments?</button>
  <button data-type="suggestion">Show me the sales data from market events and POS sales.</button>
</div>`,
        timestamp: new Date(summerMarketingCreatedAt.getTime() + 2000),
      },
    ],
    createdAt: summerMarketingCreatedAt,
    updatedAt: new Date(now.getTime() + 3), // ensure it appears near the top
    starred: false,
  });

  // Demo: Enterprise analytics greeting (batch2 not used; text + suggestions)
  const greetingCreatedAt = new Date(now);
  greetingCreatedAt.setMinutes(now.getMinutes() - 4);

  conversations.push({
    id: 'conv-enterprise-analytics-greeting',
    title: 'Enterprise Analytics Assistant',
    messages: [
      {
        id: 'enterprise-greeting-msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(greetingCreatedAt),
      },
      {
        id: 'enterprise-greeting-msg-2',
        role: 'assistant',
        content: `Hello! I'm your enterprise analytics assistant.

How can I help you extract insights from your data today, or assist with any analytics questions you might have?

To go further:

<div data-type="suggestions">
  <button data-type="suggestion">give me ticket sales by channel</button>
  <button data-type="suggestion">give me ticket sales by channel</button>
  <button data-type="suggestion">give me ticket sales by day</button>
</div>`,
        timestamp: new Date(greetingCreatedAt.getTime() + 2000),
      },
    ],
    createdAt: greetingCreatedAt,
    updatedAt: new Date(now.getTime() + 4), // keep it near the top
    starred: false,
  });

  // Demo: Q-Brain capabilities welcome response (text + markdown bullets + suggestions)
  const qBrainWelcomeCreatedAt = new Date(now);
  qBrainWelcomeCreatedAt.setMinutes(now.getMinutes() - 2);

  conversations.push({
    id: 'conv-qbrain-capabilities-welcome',
    title: 'Q-Brain Capabilities Overview',
    messages: [
      {
        id: 'qbrain-capabilities-msg-1',
        role: 'user',
        content: 'What can you help me with?',
        timestamp: new Date(qBrainWelcomeCreatedAt),
      },
      {
        id: 'qbrain-capabilities-msg-2',
        role: 'assistant',
        content: `Hello! I'm Q-Brain, your Enterprise Data AI assistant. I'm here to help you navigate Qiddiya's comprehensive data.

I can provide insights across key business areas, including:
*   **Commercial & Park Operations:** Performance of our assets like Six Flags and AMC Cinemas, covering ticket sales, F&B, ride operations, and customer satisfaction.
*   **Human Resources & Workforce:** Employee demographics, payroll, performance, and attrition trends.
*   **Finance, Procurement & Payments:** Financial accounts, budgets, invoices, contracts, vendor performance, and cashflow.

**Trending Now:**
No trending insights found for this week.

**How to Start:**
You can ask me questions such as:
*   "What were the total ticket sales and F&B revenue across all AMC Cinemas last quarter?"
*   "Show me the current headcount and average salary by department."
*   "Which vendors have overdue invoices, and what is the total outstanding amount?"

To go further:

<div data-type="suggestions">
  <button data-type="suggestion">Show me the latest KPIs</button>
  <button data-type="suggestion">Search company policies</button>
</div>`,
        timestamp: new Date(qBrainWelcomeCreatedAt.getTime() + 2000),
      },
    ],
    createdAt: qBrainWelcomeCreatedAt,
    updatedAt: new Date(now.getTime() + 5), // keep it near the top
    starred: false,
  });

  // Demo: Pro financial metrics dashboard (batch2 paragraph + 3 bar charts + suggestions)
  const proFinancialMetricsCreatedAt = new Date(now);
  proFinancialMetricsCreatedAt.setMinutes(now.getMinutes() - 1);

  conversations.push({
    id: 'conv-pro-financial-metrics-dashboard',
    title: 'Pro Financial Metrics Dashboard',
    messages: [
      {
        id: 'pro-financial-metrics-msg-1',
        role: 'user',
        content: 'Show key project financial metrics',
        timestamp: new Date(proFinancialMetricsCreatedAt),
      },
      {
        id: 'pro-financial-metrics-msg-2',
        role: 'assistant',
        is_pro: true,
        content: `
<div data-type="batch2-response">
{
  "type": "batch2",
  "blocks": [
    {
      "type": "paragraph-divider",
      "paragraphs": [
        "Summary: This report provides an overview of key financial metrics for various projects. It details the Approved Budget, Total Delivered Cost, and Total Commitment for the top projects."
      ]
    },
    {
      "type": "chart",
      "chartType": "bar",
      "title": "Approved Budget by Project",
      "subtitle": "Top 5 Projects by Approved Budget",
      "height": 300,
      "data": [
        { "name": "Luxury Resort Construction", "Approved Budget": 8576868461.0 },
        { "name": "Retail Boulevard Development", "Approved Budget": 7894441460.0 },
        { "name": "Stadium Main Structure Build", "Approved Budget": 6374808248.0 },
        { "name": "Theme Park Expansion Phase 1", "Approved Budget": 3725766062.0 },
        { "name": "Water Park Infrastructure Upgrade", "Approved Budget": 3527270785.0 }
      ]
    },
    {
      "type": "chart",
      "chartType": "bar",
      "title": "Total Delivered Cost by Project",
      "subtitle": "Top 5 Projects by Total Delivered Cost",
      "height": 300,
      "data": [
        { "name": "Luxury Resort Construction", "Total Delivered Cost": 8712103050.0 },
        { "name": "Retail Boulevard Development", "Total Delivered Cost": 8127247515.0 },
        { "name": "Stadium Main Structure Build", "Total Delivered Cost": 6552248216.0 },
        { "name": "Theme Park Expansion Phase 1", "Total Delivered Cost": 3853102556.0 },
        { "name": "Water Park Infrastructure Upgrade", "Total Delivered Cost": 3528402470.0 }
      ]
    },
    {
      "type": "chart",
      "chartType": "bar",
      "title": "Total Commitment by Project",
      "subtitle": "Top 5 Projects by Total Commitment",
      "height": 300,
      "data": [
        { "name": "Luxury Resort Construction", "Total Commitment": 6613289953.0 },
        { "name": "Retail Boulevard Development", "Total Commitment": 6016610256.0 },
        { "name": "Stadium Main Structure Build", "Total Commitment": 4912277654.0 },
        { "name": "Theme Park Expansion Phase 1", "Total Commitment": 3013196618.0 },
        { "name": "Water Park Infrastructure Upgrade", "Total Commitment": 2587030874.0 }
      ]
    }
  ]
}
</div>

To go further:

<div data-type="suggestions">
  <button data-type="suggestion">What is the total Approved Budget for all projects?</button>
  <button data-type="suggestion">Show me a breakdown of commitments by Business Unit.</button>
  <button data-type="suggestion">Can you find data related to contract quantities?</button>
</div>`,
        timestamp: new Date(proFinancialMetricsCreatedAt.getTime() + 2000),
      },
    ],
    createdAt: proFinancialMetricsCreatedAt,
    updatedAt: new Date(now.getTime() + 6), // keep it near top
    starred: false,
  });

  // Create 50 conversations
  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(i / 2); // Spread conversations over time
    const hoursAgo = i % 24;
    const minutesAgo = (i * 3) % 60;

    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(createdAt.getHours() - hoursAgo);
    createdAt.setMinutes(createdAt.getMinutes() - minutesAgo);

    const updatedAt = new Date(createdAt);
    updatedAt.setMinutes(updatedAt.getMinutes() + Math.floor(Math.random() * 30));

    // Create some sample messages
    const messages: Message[] = [
      {
        id: `msg-${i}-1`,
        role: 'user',
        content: `Hello, I need help with ${conversationTitles[i]}`,
        timestamp: new Date(createdAt),
      },
      {
        id: `msg-${i}-2`,
        role: 'assistant',
        content: `I'd be happy to help you with ${conversationTitles[i]}. Let me provide you with some information and best practices.`,
        timestamp: new Date(createdAt.getTime() + 2000),
      },
    ];

    // Some conversations have more messages
    if (i % 5 === 0) {
      messages.push({
        id: `msg-${i}-3`,
        role: 'user',
        content: 'Can you provide more details?',
        timestamp: new Date(createdAt.getTime() + 5000),
      });
      messages.push({
        id: `msg-${i}-4`,
        role: 'assistant',
        content: 'Certainly! Here are additional details and examples...',
        timestamp: new Date(createdAt.getTime() + 7000),
      });
    }

    conversations.push({
      id: `conv-${1000 + i}`,
      title: conversationTitles[i],
      messages,
      createdAt,
      updatedAt,
      starred: i < 3, // First 4 conversations are starred
    });
  }

  // Sort by updatedAt descending (most recent first)
  return conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

export const mockConversations = generateMockConversations();

