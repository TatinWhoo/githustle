import { Compass, ChatTeardropText, Notebook, Database, Lightning, BookmarkSimple, UserCircle, CrownSimple, Question, GearSix, type Icon } from '@phosphor-icons/react';

export interface NavEntry {
  to: string;
  label: string;
  icon: Icon;
  adminOnly?: boolean;
}

export const primaryNav: NavEntry[] = [
  { to: '/hub', label: 'Public Hub', icon: Compass },
  { to: '/conversations', label: 'Conversations', icon: ChatTeardropText },
  { to: '/personal', label: 'Personal Space', icon: Notebook },
  { to: '/live', label: 'Live Workspaces', icon: Lightning },
  { to: '/saved', label: 'Saved Posts', icon: BookmarkSimple },
  { to: '/admin', label: 'Admin Desk', icon: Database, adminOnly: true },
];

export const utilityNav: NavEntry[] = [
  { to: '/profile', label: 'Profile', icon: UserCircle },
  { to: '/premium', label: 'Premium', icon: CrownSimple },
  { to: '/help', label: 'Help', icon: Question },
  { to: '/settings', label: 'Settings', icon: GearSix },
];
