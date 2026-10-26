const prisma = require("../src/db");
const { users, posts, likes } = require("./seed-data");

// "https://picsum.photos/seed/insta01/600/600" → "insta01"
function postKey(imageUrl) {
  return imageUrl.split("/")[4];
}

async function main() {
  // Wipe everything, children first. Cascade would handle it, but deleting in
  // dependency order keeps the seed working if a relation ever becomes Restrict.
  await prisma.like.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  // Users first — we need their generated ids to resolve post authors
  const createdUsers = await prisma.user.createManyAndReturn({ data: users });
  const userIdByUsername = new Map(
    createdUsers.map((user) => [user.username, user.id])
  );

  // Swap each post's `author` username for the real authorId
  const createdPosts = await prisma.post.createManyAndReturn({
    data: posts.map(({ author, ...post }) => ({
      ...post,
      authorId: userIdByUsername.get(author),
    })),
  });
  const postIdByKey = new Map(
    createdPosts.map((post) => [postKey(post.imageUrl), post.id])
  );

  // Likes reference both lookups
  const createdLikes = await prisma.like.createMany({
    data: likes.map(({ user, post }) => ({
      userId: userIdByUsername.get(user),
      postId: postIdByKey.get(post),
    })),
  });

  console.log(
    `🌱 Seeded ${createdUsers.length} users, ${createdPosts.length} posts and ${createdLikes.count} likes`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
