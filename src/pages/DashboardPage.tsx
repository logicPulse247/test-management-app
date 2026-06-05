import { PageContainer } from '@/components/layout/PageContainer';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/ui/button';
import { useTestsQuery } from '@/queries/tests.queries';

const mockActivity = [
  { at: 'Today', text: 'Use the table below to manage tests.' },
  { at: 'Tip', text: 'Create a test, add questions, then publish.' },
  { at: 'Tip', text: 'Edits update instantly across the app.' },
] as const;

function Pill({ children, tone }: { children: string; tone: 'draft' | 'published' | 'scheduled' }) {
  const styles =
    tone === 'published'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : tone === 'scheduled'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-50 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles}`}>
      {children}
    </span>
  );
}

export default function DashboardPage() {
  const testsQuery = useTestsQuery();
  const tests = testsQuery.data ?? [];
  const total = tests.length;
  const published = tests.filter((t) => String(t.status).toLowerCase() === 'live').length;
  const drafts = tests.filter((t) => String(t.status).toLowerCase() === 'draft' || !t.status).length;

  return (
    <PageContainer>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-[14px] font-semibold text-[#111827]">Dashboard</div>
          <div className="mt-1 text-[12px] text-[#6B7280]">
            Overview of tests, activity and recent changes.
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Tests" value={String(total)} />
        <StatCard label="Published" value={String(published)} />
        <StatCard label="Drafts" value={String(drafts)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-lg border border-[#E5E7EB] bg-white">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-3">
            <div className="text-[13px] font-semibold text-[#111827]">Recent tests</div>
            <Button variant="secondary" size="sm" onClick={() => {}}>
              View all
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-[11px] font-semibold text-[#6B7280]">
                  <th className="px-5 py-3">Test</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="text-[13px] text-[#111827]">
                {tests.slice(0, 10).map((t) => (
                  <tr key={t.id} className="border-t border-[#E5E7EB]">
                    <td className="px-5 py-3">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-[11px] text-[#6B7280]">{t.id}</div>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-[#374151]">{String(t.subject ?? '—')}</td>
                    <td className="px-5 py-3">
                      <Pill
                        tone={
                          String(t.status).toLowerCase() === 'live'
                            ? 'published'
                            : String(t.status).toLowerCase() === 'scheduled'
                              ? 'scheduled'
                              : 'draft'
                        }
                      >
                        {String(t.status ?? 'draft')}
                      </Pill>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-[#6B7280]">
                      {t.updated_at || t.created_at || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-[#E5E7EB] bg-white">
          <div className="border-b border-[#E5E7EB] px-5 py-3">
            <div className="text-[13px] font-semibold text-[#111827]">Recent activity</div>
          </div>
          <div className="px-5 py-4">
            <ul className="space-y-3">
              {mockActivity.map((a, idx) => (
                <li key={idx} className="flex gap-3">
                  <div className="mt-1 size-2 rounded-full bg-[#5B7FFF]" />
                  <div>
                    <div className="text-[12px] text-[#111827]">{a.text}</div>
                    <div className="mt-0.5 text-[11px] text-[#6B7280]">{a.at}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
