export async function fetchQuickSqftPresets(): Promise<number[]> {
  return [500, 1000, 1500, 2000, 3000, 5000];
}
export async function saveQuickSqftPresets(_values: number[]): Promise<void> {}
