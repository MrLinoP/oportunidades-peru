export function paginationPages(current: number, total: number): (number | "ellipsis")[] {
  const pages = new Set<number>([1, 2, total - 1, total]);
  for (let page = current - 3; page <= current + 3; page++) pages.add(page);
  const visible = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  visible.forEach((page, index) => {
    const previous = visible[index - 1];
    if (previous !== undefined && page - previous > 1) result.push("ellipsis");
    result.push(page);
  });
  return result;
}