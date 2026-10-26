const prisma = require("../db");

// What a user looks like when nested inside another object — never the email
const USER_SUMMARY = { id: true, username: true, fullname: true };

// Everyone who liked a post, by username
async function listPostLikers(postId) {
  return prisma.user.findMany({
    where: { likes: { some: { postId } } },
    select: USER_SUMMARY,
    orderBy: { username: "asc" },
  });
}

// Like a post. The composite primary key makes a duplicate throw P2002.
async function createLike(userId, postId) {
  return prisma.like.create({ data: { userId, postId } });
}

// Unlike a post. Throws P2025 if there is no such like.
async function deleteLike(userId, postId) {
  return prisma.like.delete({ where: { userId_postId: { userId, postId } } });
}

module.exports = { listPostLikers, createLike, deleteLike };
