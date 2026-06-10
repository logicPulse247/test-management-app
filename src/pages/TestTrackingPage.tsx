import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useDeleteTestMutation,
  useTestsQuery,
} from '@/queries/tests.queries';
import { queryKeys } from '@/queries/queryKeys';
import { fetchSubjects } from '@/services/catalog.service';
import { fetchTestById } from '@/services/tests.service';
import { getLinkedQuestionCount } from '@/lib/testEntity';
import { buildCreateTestFormValuesFromEntity } from '@/lib/testFormHydration';
import { getErrorMessage } from '@/lib/api';
import { formatTrackingUpdatedAt } from '@/lib/formatDateTime';
import { useTestCreationStore } from '@/store/testCreation.store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye,Pencil,Trash  } from 'lucide-react';
export default function TestTrackingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const setCurrentTestId = useTestCreationStore((s) => s.setCurrentTestId);
  const setCurrentTest = useTestCreationStore((s) => s.setCurrentTest);
  const setReturnToPath = useTestCreationStore((s) => s.setReturnToPath);
  const setTestFlowMode = useTestCreationStore((s) => s.setTestFlowMode);
  const applyTestFormHydration = useTestCreationStore(
    (s) => s.applyTestFormHydration,
  );
  const beginCreateFlow = useTestCreationStore((s) => s.beginCreateFlow);

  const testsQuery = useTestsQuery();
  const deleteMutation = useDeleteTestMutation();

  const tests = testsQuery.data ?? [];
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'draft' | 'live' | 'scheduled'>(
    'all',
  );
  const [subject, setSubject] = useState<'all' | string>('all');
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return tests.map((t) => ({
      id: t.id,
      name: t.name,
      subject: String(t.subject ?? '—'),
      status: String(t.status ?? 'draft').toLowerCase(),
      questions: getLinkedQuestionCount(t),
      updatedAt: t.updated_at || t.created_at || '—',
    }));
  }, [tests]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (subject !== 'all' && r.subject !== subject) return false;
      if (!qq) return true;
      return (
        r.id.toLowerCase().includes(qq) ||
        r.name.toLowerCase().includes(qq) ||
        r.subject.toLowerCase().includes(qq)
      );
    });
  }, [q, rows, status, subject]);

  const statusLabel: Record<string, string> = {
    draft: 'Draft',
    live: 'Published',
    scheduled: 'Scheduled',
  };

  async function prefetchTest(testId: string) {
    return queryClient.fetchQuery({
      queryKey: queryKeys.testById(testId),
      queryFn: () => fetchTestById(testId),
    });
  }

  async function handleView(testId: string) {
    setActionError(null);
    try {
      const test = await prefetchTest(testId);
      setCurrentTestId(testId);
      setCurrentTest(test);
      setReturnToPath('/test-tracking');
      setTestFlowMode('view');
      navigate(`/preview/${testId}`);
    } catch (e: unknown) {
      setActionError(
        getErrorMessage(e, 'Failed to load test for preview.'),
      );
    }
  }

  async function handleEdit(testId: string) {
    setActionError(null);
    try {
      const test = await prefetchTest(testId);

      const subjects = await queryClient.fetchQuery({
        queryKey: queryKeys.subjects(),
        queryFn: fetchSubjects,
      });
      const formValues = buildCreateTestFormValuesFromEntity(test, {
        subjects,
        fallbackTestType: String(test.type ?? ''),
      });
      applyTestFormHydration(formValues);

      setCurrentTestId(testId);
      setCurrentTest(test);
      setReturnToPath('/test-tracking');
      setTestFlowMode('edit');
      navigate(`/questions/${testId}`);
    } catch (e: unknown) {
      setActionError(
        getErrorMessage(e, 'Failed to load test for editing.'),
      );
    }
  }

  async function handleDelete(testId: string, testName: string) {
    setActionError(null);
    const confirmed = window.confirm(
      `Delete "${testName}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(testId);
    try {
      await deleteMutation.mutateAsync(testId);
      const activeId = useTestCreationStore.getState().currentTestId;
      if (activeId === testId) {
        beginCreateFlow();
      }
    } catch (e: unknown) {
      setActionError(
        getErrorMessage(e, 'Failed to delete test. Please try again.'),
      );
    } finally {
      setDeletingId(null);
    }
  }

  function handleNewTest() {
    setActionError(null);
    beginCreateFlow();
    navigate('/test-creation');
  }

  return (
    <PageContainer>
      <div className="mb-5">
        <div className="text-[14px] font-semibold text-[#111827]">Test Tracking</div>
        <div className="mt-1 text-[12px] text-[#6B7280]">
          Search, filter and manage created tests.
        </div>
      </div>

      {actionError ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          {actionError}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#E5E7EB] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#E5E7EB] p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
            <div className="w-full md:max-w-[320px]">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by test name"
              />
            </div>
            <div className="flex gap-3">
              <div className="w-[160px]">
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="live">Published</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[180px]">
                <Select value={subject} onValueChange={(v) => setSubject(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All subjects</SelectItem>
                    {Array.from(new Set(rows.map((r) => r.subject)))
                      .filter((s) => s && s !== '—')
                      .map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" type="button" onClick={handleNewTest}>
              New Test
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {testsQuery.isLoading ? (
            <div className="px-5 py-10 text-center text-[12px] text-[#6B7280]">
              Loading tests…
            </div>
          ) : null}

          {testsQuery.isError ? (
            <div className="px-5 py-10 text-center text-[12px] text-red-600">
              Failed to load tests.
            </div>
          ) : null}

          <table className="w-full min-w-[820px] border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-[11px] font-semibold text-[#6B7280]">
                <th className="px-5 py-3">Test</th>
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Questions</th>
                <th className="px-5 py-3">Updated</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[13px] text-[#111827]">
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-[#E5E7EB]">
                  <td className="px-5 py-3">
                    <div className="font-medium">{r.name}</div>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-[#374151]">
                    {r.subject}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5 text-[11px] font-medium text-[#374151]">
                      {statusLabel[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-[#374151]">
                    {r.questions}
                  </td>
                  <td className="px-5 py-3 text-[12px] text-[#6B7280]">
                    {formatTrackingUpdatedAt(r.updatedAt)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => void handleView(r.id)}
                      >
                        <Eye className='font-normal text-[#6B7280] h-[17px]'/>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => void handleEdit(r.id)}
                      >
                        <Pencil className='font-normal text-[#6B7280] h-[17px]'/>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        className='bg-transparent'
                        disabled={deletingId === r.id || deleteMutation.isPending}
                        onClick={() => void handleDelete(r.id, r.name)}
                      >
                        <Trash className='font-normal text-[#6B7280] h-[17px]'/>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {!testsQuery.isLoading && filtered.length === 0 ? (
                <tr>
                  <td
                    className="px-5 py-10 text-center text-[12px] text-[#6B7280]"
                    colSpan={6}
                  >
                    No tests match your filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}
