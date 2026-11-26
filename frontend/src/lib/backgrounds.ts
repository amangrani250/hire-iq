import type { VirtualBackgroundId } from '../types';

export interface BackgroundOption {
  id: VirtualBackgroundId;
  label: string;
  description: string;
  image?: string;
  gradient?: boolean;
}

export const BACKGROUNDS: BackgroundOption[] = [
  {
    id: 'none',
    label: 'None',
    description: 'Your real room',
  },
  {
    id: 'blur',
    label: 'Blur',
    description: 'Soft focus',
  },
  {
    id: 'office',
    label: 'Office',
    description: 'Bright workspace',
    image: '/backgrounds/office.jpg',
  },
  {
    id: 'lounge',
    label: 'Lounge',
    description: 'Warm studio',
    image: '/backgrounds/lounge.jpg',
  },
  {
    id: 'study',
    label: 'Living',
    description: 'Warm living room',
    image: '/backgrounds/study.jpg',
  },
  {
    id: 'studio',
    label: 'Studio',
    description: 'Indigo gradient',
    gradient: true,
  },
];

export const DEFAULT_BACKGROUND: VirtualBackgroundId = 'office';

export function getBackground(id: VirtualBackgroundId): BackgroundOption {
  return BACKGROUNDS.find((option) => option.id === id) ?? BACKGROUNDS[0];
}
