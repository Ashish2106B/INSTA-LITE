const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const PAGINATION_ERROR = "page and limit must be positive integers";

// A query param that must be a positive integer; undefined if absent, null if invalid
function parsePositiveInt(value) {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed > 0 ? parsed : null;
}

// Returns { page, limit } with defaults applied and limit capped, or null if invalid
function parsePagination({ page: rawPage, limit: rawLimit }) {
  const page = parsePositiveInt(rawPage);
  const limit = parsePositiveInt(rawLimit);
  if (page === null || limit === null) return null;

  return {
    page: page ?? 1,
    limit: Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT),
  };
}

// The meta block that goes next to `data` in every paginated response
function buildMeta({ page, limit }, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

module.exports = { parsePagination, buildMeta, PAGINATION_ERROR };
