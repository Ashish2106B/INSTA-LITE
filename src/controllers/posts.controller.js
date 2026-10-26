const postsService = require("../services/posts.service");
const {
  parsePagination,
  buildMeta,
  PAGINATION_ERROR,
} = require("../utils/pagination");

const SORTABLE_FIELDS = ["createdAt", "updatedAt", "likes"];

// Parse a date query param, or undefined if absent
function parseDate(value) {
  if (value === undefined) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// POST /posts — Create a post
async function create(req, res) {
  try {
    const { imageUrl, authorId, caption, location } = req.body;

    // Validate required fields
    if (!imageUrl || authorId === undefined || authorId === null) {
      return res
        .status(400)
        .json({ error: "imageUrl and authorId are required" });
    }

    // Only allow accepted fields
    const data = { imageUrl, authorId: Number(authorId) };
    if (caption !== undefined) data.caption = caption;
    if (location !== undefined) data.location = location;

    const post = await postsService.createPost(data);
    return res.status(201).json(post);
  } catch (error) {
    // Foreign key violation — no user with that authorId. Letting the database
    // tell us saves a lookup on the happy path.
    if (error.code === "P2003") {
      return res.status(404).json({ error: "User not found" });
    }
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /posts — List posts (pagination + sorting + filtering)
async function list(req, res) {
  try {
    const { sortBy, order, location, search, from: rawFrom, to: rawTo } =
      req.query;

    // Pagination
    const pagination = parsePagination(req.query);
    if (pagination === null) {
      return res.status(400).json({ error: PAGINATION_ERROR });
    }

    // Sorting
    if (sortBy !== undefined && !SORTABLE_FIELDS.includes(sortBy)) {
      return res
        .status(400)
        .json({ error: `sortBy must be one of: ${SORTABLE_FIELDS.join(", ")}` });
    }
    if (order !== undefined && order !== "asc" && order !== "desc") {
      return res.status(400).json({ error: "order must be asc or desc" });
    }

    // Date range filter
    const from = parseDate(rawFrom);
    const to = parseDate(rawTo);
    if (from === null || to === null) {
      return res.status(400).json({ error: "from and to must be valid dates" });
    }

    const options = {
      ...pagination,
      sortBy: sortBy ?? "createdAt",
      order: order ?? "desc",
      location: location || undefined,
      search: search || undefined,
      from,
      to,
    };

    const { data, total } = await postsService.listPosts(options);

    return res.status(200).json({ data, meta: buildMeta(pagination, total) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /posts/:id — Get one post with its author and like count
async function getOne(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const post = await postsService.getPostById(id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    return res.status(200).json(post);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// PATCH /posts/:id — Update a post (partial)
async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    // Check if post exists first
    const exists = await postsService.postExists(id);
    if (!exists) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Only editable fields: caption, location. imageUrl and authorId are
    // silently ignored — you can't steal someone's post.
    const { caption, location } = req.body;
    const data = {};
    if (caption !== undefined) data.caption = caption;
    if (location !== undefined) data.location = location;

    const post = await postsService.updatePost(id, data);
    return res.status(200).json(post);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// DELETE /posts/:id — Delete a post
async function remove(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    // Check if post exists first
    const exists = await postsService.postExists(id);
    if (!exists) {
      return res.status(404).json({ error: "Post not found" });
    }

    await postsService.deletePost(id);
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { create, list, getOne, update, remove };
