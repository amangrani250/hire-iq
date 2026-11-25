export const queryKeys = {
  generate: {
    resume: (input: string) => ['generate', 'resume', input] as const,
  },
  improve: {
    section: (section: string) => ['improve', section] as const,
  },
} as const;

export type QueryKeyType = ReturnType<(typeof queryKeys)[keyof typeof queryKeys][keyof (typeof queryKeys)[keyof typeof queryKeys]]>;
