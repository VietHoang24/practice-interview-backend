export interface TemplateQuestion {
  topic: string;
  question: string;
  difficulty: number;
  orderIndex: number;
}

export interface TemplateDefinition {
  name: string;
  description: string;
  questions: TemplateQuestion[];
}

export const MOCK_TEMPLATES: Record<string, Record<string, TemplateDefinition[]>> = {
  frontend: {
    junior: [
      {
        name: 'React Web Development',
        description: 'Focuses on React core concepts, state management, hooks, and Virtual DOM.',
        questions: [
          { topic: 'react', question: 'What is React re-render?', difficulty: 2, orderIndex: 1 },
          { topic: 'react', question: 'What are React hooks? Can you explain useState and useEffect?', difficulty: 2, orderIndex: 2 },
          { topic: 'react', question: 'What is the Virtual DOM and how does React use it?', difficulty: 3, orderIndex: 3 },
          { topic: 'react', question: 'What is the difference between state and props in React?', difficulty: 2, orderIndex: 4 },
          { topic: 'react', question: 'Explain the difference between controlled and uncontrolled components.', difficulty: 2, orderIndex: 5 }
        ]
      },
      {
        name: 'JavaScript & CSS Fundamentals',
        description: 'Focuses on core JS promises, scope, event delegation, and CSS Box Model/Flexbox.',
        questions: [
          { topic: 'javascript', question: 'Can you explain the difference between let, const, and var?', difficulty: 1, orderIndex: 1 },
          { topic: 'javascript', question: 'What is a Promise in JavaScript? How does it differ from a callback?', difficulty: 3, orderIndex: 2 },
          { topic: 'css', question: 'What is the CSS Box Model?', difficulty: 1, orderIndex: 3 },
          { topic: 'css', question: 'How do you center an element using Flexbox?', difficulty: 2, orderIndex: 4 },
          { topic: 'javascript', question: 'Can you explain event delegation in JavaScript?', difficulty: 3, orderIndex: 5 },
          { topic: 'html', question: 'What are semantic HTML tags and why are they important?', difficulty: 2, orderIndex: 6 }
        ]
      }
    ],
    mid: [
      {
        name: 'Next.js & Performance',
        description: 'Focuses on server-side rendering, RSC, Next.js optimization, and page load speed.',
        questions: [
          { topic: 'react', question: 'Explain React Server Components and how they differ from Client Components.', difficulty: 3, orderIndex: 1 },
          { topic: 'nextjs', question: 'How does Next.js handle SSR and SSG? Explain ISR.', difficulty: 4, orderIndex: 2 },
          { topic: 'performance', question: 'How do you optimize a slow React application page?', difficulty: 4, orderIndex: 3 }
        ]
      },
      {
        name: 'Advanced JS & State Management',
        description: 'Focuses on the browser event loop, context API, and comparing Redux vs Zustand.',
        questions: [
          { topic: 'javascript', question: 'What is the Event Loop, microtasks, and macrotasks in browser execution?', difficulty: 4, orderIndex: 1 },
          { topic: 'state-management', question: 'Compare Redux, Zustand, and React Context. When would you use each?', difficulty: 3, orderIndex: 2 }
        ]
      }
    ],
    senior: [
      {
        name: 'Micro-frontends & Scale',
        description: 'Covers micro-frontends architecture, monorepos, and high list rendering performance.',
        questions: [
          { topic: 'architecture', question: 'How would you architect a large-scale micro-frontend application?', difficulty: 5, orderIndex: 1 },
          { topic: 'performance', question: 'Explain how you would optimize a React application with a large list of 10,000 items.', difficulty: 4, orderIndex: 2 }
        ]
      },
      {
        name: 'Security & App Quality',
        description: 'Covers client security vulnerabilities, XSS, CSRF, and end-to-end testing strategies.',
        questions: [
          { topic: 'security', question: 'How do you secure a React application against XSS and CSRF attacks?', difficulty: 4, orderIndex: 1 },
          { topic: 'testing', question: 'Explain your strategy for unit, integration, and E2E testing in a modern web app.', difficulty: 4, orderIndex: 2 }
        ]
      }
    ]
  },
  backend: {
    junior: [
      {
        name: 'Node.js & JS Core',
        description: 'Covers Node event loop, non-blocking I/O, and asynchronous promises.',
        questions: [
          { topic: 'nodejs', question: 'What is Node.js? Explain its event loop.', difficulty: 2, orderIndex: 1 },
          { topic: 'javascript', question: 'Explain asynchronous programming in Node.js (async/await vs promises).', difficulty: 2, orderIndex: 2 }
        ]
      },
      {
        name: 'APIs & Database Basics',
        description: 'Covers REST HTTP verbs, SQL vs NoSQL, and API routing.',
        questions: [
          { topic: 'database', question: 'What is the difference between SQL and NoSQL databases?', difficulty: 2, orderIndex: 1 },
          { topic: 'api', question: 'What are the main HTTP methods and their usage?', difficulty: 1, orderIndex: 2 }
        ]
      }
    ],
    mid: [
      {
        name: 'System Design & Databases',
        description: 'Covers database indexing, REST architecture, and token authentication.',
        questions: [
          { topic: 'database', question: 'Explain database indexes, indexing strategies, and how they work.', difficulty: 3, orderIndex: 1 },
          { topic: 'api', question: 'What is RESTful API? How do you implement robust JWT-based authentication?', difficulty: 3, orderIndex: 2 }
        ]
      },
      {
        name: 'Caching & Design Patterns',
        description: 'Covers Redis query cache and standard software patterns like Dependency Injection.',
        questions: [
          { topic: 'caching', question: 'What is Redis? How would you implement database query caching using Redis?', difficulty: 3, orderIndex: 1 },
          { topic: 'design-patterns', question: 'Explain some common software design patterns like Dependency Injection and Singleton.', difficulty: 3, orderIndex: 2 }
        ]
      }
    ],
    senior: [
      {
        name: 'Scalability & Message Queues',
        description: 'Covers distributed systems scaling, sharding, and messaging systems.',
        questions: [
          { topic: 'scalability', question: 'How would you scale a web application database layer (sharding, replication, partitioning)?', difficulty: 5, orderIndex: 1 },
          { topic: 'message-queues', question: 'Compare RabbitMQ, Kafka, and BullMQ. When would you choose which?', difficulty: 4, orderIndex: 2 }
        ]
      },
      {
        name: 'Distributed Architectures',
        description: 'Covers rate limiters and transaction handling (Saga pattern).',
        questions: [
          { topic: 'system-design', question: 'How would you design a rate limiter for a high-traffic API?', difficulty: 5, orderIndex: 1 },
          { topic: 'microservices', question: 'Explain the saga pattern for handling distributed transactions.', difficulty: 5, orderIndex: 2 }
        ]
      }
    ]
  },
  fullstack: {
    junior: [
      {
        name: 'Client-Server Communication',
        description: 'Basics of HTTP/HTTPS and browser networks.',
        questions: [
          { topic: 'web', question: 'What happens when you type a URL in the browser address bar?', difficulty: 2, orderIndex: 1 },
          { topic: 'api', question: 'How does client-server communication work over HTTPS?', difficulty: 2, orderIndex: 2 }
        ]
      }
    ],
    mid: [
      {
        name: 'Product Catalog & Auth',
        description: 'Database schema design and auth strategies.',
        questions: [
          { topic: 'database', question: 'How would you design a database schema for an e-commerce product catalog with variations?', difficulty: 3, orderIndex: 1 },
          { topic: 'auth', question: 'Compare OAuth2, Session-based auth, and JWT auth. What are the trade-offs?', difficulty: 4, orderIndex: 2 }
        ]
      }
    ],
    senior: [
      {
        name: 'Distributed Session & Scale',
        description: 'Multi-instance sessions and real-time design.',
        questions: [
          { topic: 'architecture', question: 'How do you handle scaling session data in a multi-instance production environment?', difficulty: 5, orderIndex: 1 },
          { topic: 'system-design', question: 'Design a real-time collaborative document editor like Google Docs.', difficulty: 5, orderIndex: 2 }
        ]
      }
    ]
  },
  devops: {
    junior: [
      {
        name: 'Containerization & OS Basics',
        description: 'Docker basics and Linux commands.',
        questions: [
          { topic: 'docker', question: 'What is the difference between a Docker container and a Docker image?', difficulty: 2, orderIndex: 1 },
          { topic: 'linux', question: 'Explain basic Linux commands for monitoring process resources (CPU, Memory, Disk).', difficulty: 2, orderIndex: 2 }
        ]
      }
    ],
    mid: [
      {
        name: 'CI/CD & Application Observability',
        description: 'Deployment pipelines and metrics.',
        questions: [
          { topic: 'ci-cd', question: 'Explain how you would set up a multi-stage CI/CD pipeline for a Node.js project.', difficulty: 3, orderIndex: 1 },
          { topic: 'monitoring', question: 'What are Prometheus and Grafana? How do you monitor application health?', difficulty: 3, orderIndex: 2 }
        ]
      }
    ],
    senior: [
      {
        name: 'Kubernetes & IaC Scaling',
        description: 'Kubernetes pods and managing cloud infrastructure via code.',
        questions: [
          { topic: 'kubernetes', question: 'Explain Kubernetes Pod lifecycle, ReplicaSets, and deployment rolling updates.', difficulty: 5, orderIndex: 1 },
          { topic: 'iac', question: 'How would you manage multi-environment cloud infrastructure using Terraform?', difficulty: 5, orderIndex: 2 }
        ]
      }
    ]
  },
  datascience: {
    junior: [
      {
        name: 'Python & Stats Core',
        description: 'Covers Python types and Central Limit Theorem.',
        questions: [
          { topic: 'python', question: 'What is the difference between lists and tuples in Python?', difficulty: 1, orderIndex: 1 },
          { topic: 'statistics', question: 'What is the Central Limit Theorem and why is it important?', difficulty: 2, orderIndex: 2 }
        ]
      }
    ],
    mid: [
      {
        name: 'ML Overfitting & Processing',
        description: 'Regularization and handling data noise.',
        questions: [
          { topic: 'machine-learning', question: 'Explain overfitting and how you can prevent it using regularization.', difficulty: 3, orderIndex: 1 },
          { topic: 'data-processing', question: 'How do you handle missing or noisy data in a dataset?', difficulty: 3, orderIndex: 2 }
        ]
      }
    ],
    senior: [
      {
        name: 'Transformers & Real-time AI Pipelines',
        description: 'Attention mechanisms and scale AI systems.',
        questions: [
          { topic: 'deep-learning', question: 'Explain the transformer architecture and self-attention mechanism.', difficulty: 5, orderIndex: 1 },
          { topic: 'system-design', question: 'How would you architect a real-time fraud detection pipeline?', difficulty: 5, orderIndex: 2 }
        ]
      }
    ]
  },
  mobile: {
    junior: [
      {
        name: 'Mobile Core Lifecycles',
        description: 'Screen lifecycles and offline networking.',
        questions: [
          { topic: 'mobile', question: 'What is the lifecycle of a mobile application screen (e.g. Android Activity)?', difficulty: 2, orderIndex: 1 },
          { topic: 'api', question: 'How do you perform API calls in a mobile app and handle network offline status?', difficulty: 2, orderIndex: 2 }
        ]
      }
    ],
    mid: [
      {
        name: 'Flutter vs React Native',
        description: 'Covers State widgets and mobile bridging.',
        questions: [
          { topic: 'flutter', question: 'What is the difference between StatefulWidget and StatelessWidget in Flutter?', difficulty: 3, orderIndex: 1 },
          { topic: 'react-native', question: 'Explain how the React Native bridge works compared to the new architecture.', difficulty: 4, orderIndex: 2 }
        ]
      }
    ],
    senior: [
      {
        name: 'Mobile Offline Storage & CI/CD',
        description: 'Offline caching and automated store deployments.',
        questions: [
          { topic: 'architecture', question: 'How would you design offline-first caching for a mobile application?', difficulty: 5, orderIndex: 1 },
          { topic: 'ci-cd', question: 'Explain how you set up automated mobile app builds and deployments to Play Store / App Store.', difficulty: 4, orderIndex: 2 }
        ]
      }
    ]
  }
};
