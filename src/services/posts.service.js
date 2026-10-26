const prisma = require("../db");

// What a user looks like when nested inside another object — never the email
const USER_SUMMARY = { id: true, username: true, fullname: true };

// Create a new post
async function createPost(data) {
  return prisma.post.create({ data });
}

// List posts with pagination, sorting and filtering
async function listPosts({ page, limit, sortBy, order, location, search, from, to }) {
  // Build the where clause from the filters that were actually provided
  const where = {};
  if (location !== undefined) {
    where.location = { equals: location, mode: "insensitive" };
  }
  if (search !== undefined) {
    where.caption = { contains: search, mode: "insensitive" };
  }
  if (from !== undefined || to !== undefined) {
    where.createdAt = {};
    if (from !== undefined) where.createdAt.gte = from;
    if (to !== undefined) where.createdAt.lt = to;
  }

  // Sorting by likes counts the relation; ties always break newest first
  const orderBy =
    sortBy === "likes"
      ? [{ likes: { _count: order } }, { createdAt: "desc" }]
      : { [sortBy]: order };

  // Rows and total count in a single round trip
  const [data, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      include: {
        author: { select: USER_SUMMARY },
        _count: { select: { likes: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return { data, total };
}

// Get a single post with its author and like count, in one query
async function getPostById(id) {
  return prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: USER_SUMMARY },
      _count: { select: { likes: true } },
    },
  });
}

// Cheap existence check for the routes that only need to 404
async function postExists(id) {
  return (await prisma.post.count({ where: { id } })) > 0;
}

// Update a post by id (partial update)
async function updatePost(id, data) {
  return prisma.post.update({ where: { id }, data });
}

// Delete a post by id
async function deletePost(id) {
  return prisma.post.delete({ where: { id } });
}

module.exports = {
  createPost,
  listPosts,
  getPostById,
  postExists,
  updatePost,
  deletePost,
};
