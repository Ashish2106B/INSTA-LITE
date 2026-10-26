const express = require("express");
const router = express.Router();
const usersController = require("../controllers/users.controller");

router.post("/", usersController.create);
router.get("/", usersController.list);
router.get("/:id", usersController.getOne);
router.get("/:id/posts", usersController.listPosts);
router.get("/:id/liked-posts", usersController.listLikedPosts);
router.patch("/:id", usersController.update);
router.delete("/:id", usersController.remove);

module.exports = router;
