import {
  Sparkles,
  Zap,
  Wrench,
  PaintRoller,
  Trees,
  Hammer,
  GraduationCap,
  Laptop,
  Truck,
  SprayCan,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';

const KEYWORD_ICONS: Array<{ keyword: string; icon: LucideIcon }> = [
  { keyword: 'limpeza', icon: SprayCan },
  { keyword: 'elétric', icon: Zap },
  { keyword: 'eletric', icon: Zap },
  { keyword: 'encanad', icon: Wrench },
  { keyword: 'pintura', icon: PaintRoller },
  { keyword: 'jardim', icon: Trees },
  { keyword: 'reforma', icon: Hammer },
  { keyword: 'aula', icon: GraduationCap },
  { keyword: 'professor', icon: GraduationCap },
  { keyword: 'beleza', icon: Sparkles },
  { keyword: 'tecnologia', icon: Laptop },
  { keyword: 'transporte', icon: Truck },
];

export function getCategoryIcon(categoryName: string): LucideIcon {
  const normalized = categoryName.toLowerCase();
  const match = KEYWORD_ICONS.find(({ keyword }) => normalized.includes(keyword));
  return match?.icon ?? LayoutGrid;
}
