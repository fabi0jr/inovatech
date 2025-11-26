export interface Detection {
    id: string;
    time: string;
    type: string;
    category: 'A' | 'B' | 'C';
    confidence: number;
    status: string;
  }
  
  export interface TrainingSession {
    id: string;
    name: string;
    timeAgo: string;
    status: 'complete' | 'processing' | 'failed';
  }
  
  export const mockDetections: Detection[] = [
    {
      id: '1',
      time: '12:34:45',
      type: 'Metal Component',
      category: 'A',
      confidence: 97.8,
      status: 'Category A'
    },
    {
      id: '2',
      time: '12:34:32',
      type: 'Plastic Part',
      category: 'B',
      confidence: 94.2,
      status: 'Category B'
    },
    {
      id: '3',
      time: '12:34:18',
      type: 'Electronic Module',
      category: 'C',
      confidence: 98.1,
      status: 'Category C'
    }
  ];
  
  export const mockTrainingSessions: TrainingSession[] = [
    {
      id: '1',
      name: 'Conveyor Belt Detection',
      timeAgo: '2 hours ago',
      status: 'complete'
    },
    {
      id: '2',
      name: 'Safety Equipment',
      timeAgo: '1 day ago',
      status: 'complete'
    },
    {
      id: '3',
      name: 'Quality Control',
      timeAgo: '3 days ago',
      status: 'failed'
    }
  ];
  
  export const mockStats = {
    itemSeparation: {
      categoryA: 342,
      categoryB: 589,
      categoryC: 156,
      unclassified: 12
    },
    performance: {
      classificationRate: 98.9,
      processingSpeed: 32
    },
    systemStatus: {
      aiModel: 'online',
      cameraFeed: 'active',
      dataStorage: 78
    }
  };