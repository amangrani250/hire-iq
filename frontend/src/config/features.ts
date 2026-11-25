export interface Feature {
  key: string;
  label: string;
  path: string;
  description: string;
  enabled: boolean;
  comingSoon?: boolean;
}

const features: Feature[] = [
  {
    key: 'tech-interview',
    label: 'Tech Interview',
    path: '/tech-interview',
    description: 'Custom technical coding interviews',
    enabled: true,
  },
  {
    key: 'builder',
    label: 'Resume Builder',
    path: '/builder',
    description: 'Build and export ATS-optimized resumes',
    enabled: true,
  },
  {
    key: 'saved',
    label: 'Saved Resumes',
    path: '/saved',
    description: 'View your saved resumes',
    enabled: true,
  },
  {
    key: 'job-prep',
    label: 'Job Prep',
    path: '/job-prep',
    description: 'Job interview preparation roadmap',
    enabled: true,
  },
  {
    key: 'job-roadmap',
    label: 'Job Roadmap',
    path: '/job-roadmap',
    description: 'Step-by-step job roadmap',
    enabled: true,
  },
];

export function getEnabledFeatures(): Feature[] {
  return features.filter((f) => f.enabled);
}

export function isFeatureEnabled(key: string): boolean {
  const feature = features.find((f) => f.key === key);
  return feature ? feature.enabled : false;
}

export function getFeatureByPath(path: string): Feature | undefined {
  return features.find((f) => f.path === path);
}

export default features;
