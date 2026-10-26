const usersService = require("../services/users.service");
const {
  parsePagination,
  buildMeta,
  PAGINATION_ERROR,
} = require("../utils/pagination");

const SORTABLE_FIELDS = ["createdAt", "username", "fullname"];

// Parse a query param that must be "true" or "false"
function parseBoolean(value) {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

// POST /users — Create a user
async function create(req, res) {
  try {
    const { username, email, fullname, bio } = req.body;

    // Validate required fields
    if (!username || !email || !fullname) {
      return res
        .status(400)
        .json({ error: "username, email and fullname are required" });
    }

    // Only allow accepted fields (ignore id, createdAt, etc.)
    const data = { username, email, fullname };
    if (bio !== undefined) {
      data.bio = bio;
    }

    const user = await usersService.createUser(data);
    return res.status(201).json(user);
  } catch (error) {
    // Prisma unique constraint violation
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ error: "username or email already taken" });
    }
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /users — List users (pagination + sorting + filtering)
async function list(req, res) {
  try {
    const { sortBy, order, isPrivate, search, hasPosts } = req.query;

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

    // Filtering
    const isPrivateFilter = parseBoolean(isPrivate);
    if (isPrivateFilter === null) {
      return res.status(400).json({ error: "isPrivate must be true or false" });
    }
    const hasPostsFilter = parseBoolean(hasPosts);
    if (hasPostsFilter === null) {
      return res.status(400).json({ error: "hasPosts must be true or false" });
    }

    const options = {
      ...pagination,
      sortBy: sortBy ?? "createdAt",
      order: order ?? "desc",
      isPrivate: isPrivateFilter,
      search: search || undefined,
      hasPosts: hasPostsFilter,
    };

    const { data, total } = await usersService.listUsers(options);

    return res.status(200).json({ data, meta: buildMeta(pagination, total) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /users/:id — Get one user, with post and like counts
async function getOne(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await usersService.getUserWithCounts(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /users/:id/posts — One user's posts, paginated
async function listPosts(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const pagination = parsePagination(req.query);
    if (pagination === null) {
      return res.status(400).json({ error: PAGINATION_ERROR });
    }

    const existing = await usersService.getUserById(id);
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    const { data, total } = await usersService.listUserPosts(id, pagination);

    return res.status(200).json({ data, meta: buildMeta(pagination, total) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /users/:id/liked-posts — Posts this user has liked, paginated
async function listLikedPosts(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const pagination = parsePagination(req.query);
    if (pagination === null) {
      return res.status(400).json({ error: PAGINATION_ERROR });
    }

    const existing = await usersService.getUserById(id);
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    const { data, total } = await usersService.listLikedPosts(id, pagination);

    return res.status(200).json({ data, meta: buildMeta(pagination, total) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// PATCH /users/:id — Update a user (partial)
async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    // Check if user exists first
    const existing = await usersService.getUserById(id);
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    // Only allow editable fields: fullname, bio, isPrivate
    const { fullname, bio, isPrivate } = req.body;
    const data = {};
    if (fullname !== undefined) data.fullname = fullname;
    if (bio !== undefined) data.bio = bio;
    if (isPrivate !== undefined) data.isPrivate = isPrivate;

    const user = await usersService.updateUser(id, data);
    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// DELETE /users/:id — Delete a user (their posts and likes cascade away)
async function remove(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    // Check if user exists first
    const existing = await usersService.getUserById(id);
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    await usersService.deleteUser(id);
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  create,
  list,
  getOne,
  listPosts,
  listLikedPosts,
  update,
  remove,
};
