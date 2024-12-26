import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import rateLimit from "express-rate-limit";
import sanitizeHtml from "sanitize-html";

// Convert the file URL to a directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const limiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});

app.use(limiter);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads"); // Ensure this directory exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

// Set EJS as templating engine
app.set("view engine", "ejs");

// Middleware for parsing request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Serve static files from the 'public' directory
app.use(express.static("public"));

// Font Awesome path for displaying icons
app.use(
  "/fonts",
  express.static(
    path.join(__dirname, "node_modules/@fortawesome/fontawesome-free")
  )
);

// Temporary storage for posts (now including both unpublished and published posts)
const posts = [];
let nextPostId = 1; // Initialize next post ID

// Function to generate unique post IDs
function generatePostId() {
  return nextPostId++;
}

// Home route
app.get("/", (req, res) => {
  // Only send published posts to the home view
  const publishedPosts = posts.filter((post) => post.status === "published");
  res.render("home", {
    posts: publishedPosts,
    showPublish: false,
    showDelete: false,
  });
});

// Route to display the post creation form
app.get("/posts/new", (req, res) => {
  res.render("postForm", {
    showPublish: true,
    post: null,
    pageTitle: "Create New Post",
    showDelete: false,
  });
});

// Route to manage all posts
app.get("/manage-posts", (req, res) => {
  // console.log(posts);
  // Send all posts to the manage posts view, regardless of status
  res.render("postslist", {
    posts: posts,
    showPublish: false,
    showDelete: false,
  });
});

// Route to display the form for editing an existing post
app.get("/posts/:id/review", (req, res) => {
  const postId = Number(req.params.id);
  const post = posts.find((post) => post.id === postId);

  if (post) {
    res.render("postForm", {
      showPublish: true,
      post: post,
      pageTitle: "",
      showDelete: true,
    });
  } else {
    // console.error(`Post with ID ${postId} not found in array:`, posts);
    res.status(404).send("Post not found");
  }
});

// Route to view a full blog post
app.get("/posts/:id", (req, res) => {
  const postId = Number(req.params.id);
  const post = posts.find(
    (post) => post.id === postId && post.status === "published"
  );

  if (post) {
    res.render("postDetail", {
      showDelete: false,
      showPublish: false,
      post: post,
      pageTitle: post.title,
    });
  } else {
    res.status(404).send("Post not found");
  }
});

// Route to handle post form submission (new draft)
app.post("/posts/create", upload.single("image"), (req, res) => {
  // console.log("Request body:", req.body);
  const newPostId = generatePostId();
  const { title, body } = req.body;
  const image = req.file; // File information from Multer

  // Sanitizing the title (typically, no HTML tags are allowed in the title)
  const cleanTitle = sanitizeHtml(title, {
    allowedTags: [], // No HTML tags allowed in the title
    allowedAttributes: {}, // No attributes allowed
  });

  // Sanitizing the body content
  const sanitizedBody = sanitizeHtml(body, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "ul",
      "li",
      "ol",
      "strong",
      "em",
      "span",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "title", "target"],
      img: ["src", "alt"],
    },
  });
  const newPost = {
    id: newPostId, // Simple ID assignment, consider a more robust method
    title: cleanTitle,
    body: sanitizedBody,
    image: image ? image.path : null, // Store image path if an image was uploaded
    createdAt: new Date(),
    status: "pending", // New posts are saved as drafts initially
    author: "Author Name",
  };

  // console.log(`Creating post: ${JSON.stringify(newPost)}`); // Log the new post being created

  posts.push(newPost); // Add the new post to the posts array
  // console.log(`Posts after adding new post: ${JSON.stringify(posts)}`); // Log the state of posts array after adding the new post

  res.json({ message: "Post created. Awaiting review" });
});

// Route to handle updating an existing post
app.post("/posts/:id/update", upload.single("image"), (req, res) => {
  const postId = Number(req.params.id);
  const postIndex = posts.findIndex((post) => post.id === postId);

  if (postIndex > -1) {
    const sanitizedBody = sanitizeHtml(req.body.body, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        "img",
        "h1",
        "h2",
        "p",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul",
        "li",
        "ol",
        "strong",
        "em",
        "span",
      ]),
      allowedAttributes: {
        a: ["href", "name", "title", "target"],
        img: ["src", "alt"],
      },
    });
    posts[postIndex].title = req.body.title;
    posts[postIndex].body = sanitizedBody;
    posts[postIndex].status = "published"; // Update the status to 'published'
    posts[postIndex].updatedAt = new Date();
    res.json({ message: "Published!" });
  } else {
    res.status(404).send("Post not found");
  }
});

// Route to handle deleting a post
app.post("/posts/:id/delete", upload.none(), (req, res) => {
  const postId = Number(req.params.id);
  const postIndex = posts.findIndex((post) => post.id === postId);

  console.log("Found post at index:", postIndex);

  if (postIndex > -1) {
    posts.splice(postIndex, 1); // Remove the post from the array
    console.log("Post deleted successfully. Remaining posts:", posts);
    res.json({ success: true, message: "Post deleted successfully" }); // Include success property
  } else {
    console.log("Post not found for deletion.");
    res.json({ success: false, message: "Post not found" }); // Send success false if not found
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
