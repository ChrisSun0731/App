import { useQuery } from '@tanstack/react-query';

import { fetchDataFile, readCachedData } from '@/lib/remote-data';

import { buildTimetables, isGradeFile, type GradeFile, type Timetables } from './timetable';

const GRADE_FILES = [
  'schedules/gaoyi_schedules.json',
  'schedules/gaoer_schedules.json',
  'schedules/gaosan_schedules.json',
] as const;

const FRESH_FOR_MS = 60 * 60 * 1000;

function cachedGrades(): GradeFile[] {
  return GRADE_FILES.map((path) => readCachedData(path, isGradeFile)).filter(
    (grade): grade is GradeFile => grade !== null,
  );
}

/** Each grade file falls back to its own cached copy if its fetch fails. */
async function loadTimetables(signal?: AbortSignal): Promise<Timetables> {
  const results = await Promise.allSettled(
    GRADE_FILES.map((path) => fetchDataFile(path, isGradeFile, signal)),
  );
  const grades = results
    .map((result, index) =>
      result.status === 'fulfilled' ? result.value : readCachedData(GRADE_FILES[index], isGradeFile),
    )
    .filter((grade): grade is GradeFile => grade !== null);
  const timetables = buildTimetables(grades);
  if (!timetables) {
    throw new Error('Class timetables are unavailable.');
  }
  return timetables;
}

export function useTimetables() {
  return useQuery({
    queryKey: ['data', 'timetables'],
    queryFn: ({ signal }) => loadTimetables(signal),
    initialData: () => buildTimetables(cachedGrades()) ?? undefined,
    initialDataUpdatedAt: 0,
    staleTime: FRESH_FOR_MS,
  });
}
