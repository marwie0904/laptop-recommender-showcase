/**
 * Persisted store migration. Version 0 stored USD budgets and `budgetMin`, so its brief is dropped and the peso
 * defaults load (useFitlap's merge fills them in). Selected and compared laptops keep their slugs.
 */
export function migratePersisted(persisted: unknown, version: number): Record<string, unknown> {
  const p = (persisted ?? {}) as Record<string, unknown>;
  return version < 1 ? { ...p, brief: undefined } : p;
}
