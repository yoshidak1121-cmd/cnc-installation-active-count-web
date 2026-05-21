export function calculateDerivedFields(
  installedCount: number,
  activeCount: number,
  previousActiveCount: number | null | undefined
) {
  const inactiveCount = installedCount - activeCount
  const activeRate = installedCount > 0 ? activeCount / installedCount : 0
  const differenceFromPrevious =
    previousActiveCount != null ? activeCount - previousActiveCount : null
  const differenceRate =
    previousActiveCount != null && previousActiveCount > 0 && differenceFromPrevious != null
      ? differenceFromPrevious / previousActiveCount
      : null
  return { inactiveCount, activeRate, differenceFromPrevious, differenceRate }
}
