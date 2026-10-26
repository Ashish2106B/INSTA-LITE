const prisma = require("../db");

// What a user looks like when nested inside another object — never the email
const USER_SUMMARY = { id: true, username: true, fullname: true };

// Create a new user
async function createUser(data) {
  return prisma.user.create({ data });
}

// List users with pagination, sorting and filtering
async function listUsers({ page, limit, sortBy, order, isPrivate, search, hasPosts }) {
  // Build the where clause from the filters that were actually provided
  const where = {};
  if (isPrivate !== undefined) {
    where.isPrivate = isPrivate;
  }
  if (search !== undefined) {
    where.OR = [
      { username: { contains: search, mode: "insensitive" } },
      { fullname: { contains: search, mode: "insensitive" } },
    ];
  }
  if (hasPosts !== undefined) {
    where.posts = hasPosts ? { some: {} } : { none: {} };
  }

  // Rows and total count in a single round trip
  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { data, total };
}

// Get a single user by id
async function getUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}

// Get a user with how many posts they wrote and how many posts they liked
async function getUserWithCounts(id) {
  return prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { posts: true, likes: true } } },
  });
}

// One user's posts, newest first — no author, we already know who it is
async function listUserPosts(id, { page, limit }) {
  const where = { authorId: id };

  const [data, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      include: { _count: { select: { likes: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return { data, total };
}

// Posts this user has liked, newest post first
async function listLikedPosts(id, { page, limit }) {
  const where = { likes: { some: { userId: id } } };

  const [data, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      include: {
        author: { select: USER_SUMMARY },
        _count: { select: { likes: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return { data, total };
}

// Update a user by id (partial update)
async function updateUser(id, data) {
  return prisma.user.update({ where: { id }, data });
}

// Delete a user by id
async function deleteUser(id) {
  return prisma.user.delete({ where: { id } });
}

module.exports = {
  createUser,
  listUsers,
  getUserById,
  getUserWithCounts,
  listUserPosts,
  listLikedPosts,
  updateUser,
  deleteUser,
};
