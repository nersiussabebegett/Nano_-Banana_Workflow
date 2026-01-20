
export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO'
}

export interface PromptConfig {
  concept: string;
  style: string;
  lighting: string;
  aspectRatio: string;
  mediaType: MediaType;
}

export interface WorkflowState {
  config: PromptConfig;
  optimizedPrompt: string;
  generatedUrl: string | null;
  isLoading: boolean;
  status: string;
}

export enum Step {
  INPUT = 1,
  OPTIMIZE = 2,
  GENERATE = 3
}
