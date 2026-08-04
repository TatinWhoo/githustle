import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/primitives/PageHeader';
import { PageShellSection } from '@/components/primitives/PageShellSection';
import { EmptyState } from '@/components/primitives/EmptyState';
import { HelpSearch } from '../components/HelpSearch';
import { FaqAccordion, type FaqItem } from '../components/FaqAccordion';
import { ContactForm } from '../components/ContactForm';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const FAQ: FaqItem[] = [
  {
    id: 'f1',
    title: 'How does escrow work?',
    body: 'Funds sit in escrow until the milestone is approved by the client. Once approved, the amount is released to the freelancer automatically.',
    category: 'Escrow',
  },
  {
    id: 'f2',
    title: 'When am I paid?',
    body: 'Upon client approval of a submitted milestone, or after admin resolution of a dispute in your favor.',
    category: 'Payments',
  },
  {
    id: 'f3',
    title: 'What is the refund policy?',
    body: 'Refunds are handled through the dispute resolution process. Open a dispute on the milestone and the admin team will mediate.',
    category: 'Payments',
  },
  {
    id: 'f4',
    title: 'How do I submit a deliverable?',
    body: 'In your project workspace under Milestones, click "Submit Deliverable" on a pending milestone, attach a file reference, and add a description.',
    category: 'Milestones',
  },
  {
    id: 'f5',
    title: 'Can I edit my proposal after submitting?',
    body: 'Proposals cannot be edited once submitted. You can withdraw and resubmit if the job is still open.',
    category: 'Proposals',
  },
  {
    id: 'f6',
    title: 'How do I contact my client or freelancer?',
    body: 'Navigate to Conversations in the sidebar. Select the project to open the thread and send messages.',
    category: 'Communication',
  },
];

function scrollToContact() {
  document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
}

export function HelpPage() {
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 200);

  const filtered = useMemo(() => {
    if (!dq) return FAQ;
    const lower = dq.toLowerCase();
    return FAQ.filter((f) => (f.title + ' ' + f.body).toLowerCase().includes(lower));
  }, [dq]);

  const userHasFiltered = dq.length > 0;

  return (
    <PageShellSection>
      <PageHeader
        title="Help Center"
        subtitle="Search FAQs or reach out to support."
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 mt-6">
        {/* Left: search + FAQ */}
        <div className="flex flex-col gap-4">
          <HelpSearch value={q} onChange={setQ} />
          {userHasFiltered && filtered.length === 0 ? (
            <EmptyState
              illustration="search"
              title="No results"
              description="Try different keywords or contact support."
              primaryAction={{ label: 'Contact support', onClick: scrollToContact }}
            />
          ) : (
            <FaqAccordion items={filtered} />
          )}
        </div>

        {/* Right: contact form */}
        <aside id="contact-section" className="border border-border rounded-2xl p-5 self-start">
          <h2 className="font-display text-lg font-semibold mb-4">Contact support</h2>
          <ContactForm />
        </aside>
      </div>
    </PageShellSection>
  );
}

export default HelpPage;
