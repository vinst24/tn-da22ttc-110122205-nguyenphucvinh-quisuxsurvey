export type PaginationQuery = {
  page?: string;
  pageSize?: string;
};

export const parsePagination = (query: PaginationQuery) => {
  const page = Math.max(1, Number(query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 20)));
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
};

