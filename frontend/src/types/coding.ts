export type CodingDifficulty = 'easy' | 'medium' | 'hard';
export type CodingRunMode = 'run' | 'submit';
export type CodingTestStatus = 'passed' | 'failed' | 'runtime_error' | 'timeout';
export type CodingRunStatus = 'passed' | 'failed' | 'compile_error';

export interface CodingLanguage {
  id: string;
  label: string;
  extension: string;
  version: string;
  available: boolean;
}

export interface CodingExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface CodingTest {
  name: string;
  input: string;
  expected: string;
  sample?: boolean;
}

export interface CodingChallenge {
  id: string;
  title: string;
  difficulty: CodingDifficulty;
  summary: string;
  prompt: string;
  constraints: string[];
  examples: CodingExample[];
  hints: string[];
  expected_complexity: string;
  estimated_minutes: number;
  starters: Record<string, string>;
  sample_tests: CodingTest[];
}

export interface CodingWarmup {
  id: string;
  category: string;
  question: string;
}

export interface CodingCatalog {
  languages: CodingLanguage[];
  challenges: CodingChallenge[];
  warmups: CodingWarmup[];
  limits: {
    code_bytes: number;
    test_timeout_seconds: number;
    compile_timeout_seconds: number;
  };
}

export interface CodingTestResult {
  name: string;
  passed: boolean;
  status: CodingTestStatus;
  input: string;
  expected: string;
  actual: string;
  stderr: string;
  hidden: boolean;
  duration_ms: number;
}

export interface CodingRunResult {
  status: CodingRunStatus;
  compile_output: string;
  tests: CodingTestResult[];
  passed: number;
  total: number;
  duration_ms: number;
  language: string;
  challenge_id: string;
  mode: CodingRunMode;
}

export interface CodingReview {
  verdict: 'correct' | 'almost' | 'incorrect' | 'not_attempted';
  summary: string;
  strengths: string[];
  issues: string[];
  complexity: string;
  next_steps: string[];
}

export interface CodingWarmupAnswer {
  question_id: string;
  question: string;
  answer: string;
}

export interface CodingReviewPayload {
  language: string;
  challenge_id: string;
  code: string;
  results?: CodingRunResult | null;
  warmup_answers?: CodingWarmupAnswer[];
}
