import { PageHeader } from '@/components/primitives/PageHeader';
import { PageShellSection } from '@/components/primitives/PageShellSection';
import { AccountSection } from '../components/AccountSection';
import { PreferencesSection } from '../components/PreferencesSection';
import { NotificationsSection } from '../components/NotificationsSection';
import { PaymentMethodsSection } from '../components/PaymentMethodsSection';
import { DangerZone } from '../components/DangerZone';

const ANCHORS = [
  { id: '#account', label: 'Account' },
  { id: '#preferences', label: 'Preferences' },
  { id: '#notifications', label: 'Notifications' },
  { id: '#payments', label: 'Payments' },
  { id: '#danger', label: 'Danger' },
];

export function SettingsPage() {
  return (
    <PageShellSection>
      <PageHeader title="Settings" />
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        <nav aria-label="Sections">
          <ul className="flex flex-col gap-1 text-sm sticky top-24">
            {ANCHORS.map((a) => (
              <li key={a.id}>
                <a href={a.id} className="block px-3 py-1.5 rounded-md hover:bg-surface-0">
                  {a.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-8">
          <AccountSection />
          <PreferencesSection />
          <NotificationsSection />
          <PaymentMethodsSection />
          <DangerZone />
        </div>
      </div>
    </PageShellSection>
  );
}

export default SettingsPage;
