const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
const port = 3000;

let books = [];
let users = [];

const initializeUsers = new Promise((resolve, reject) => {
  setTimeout(() => {
    const initialUsers = [
      {
        username: "user1",
        password:
          "$2b$10$qAbBVAsn4wHKhNYQheS.8u7IKqfF9a/omtOzLQVNBHW0HgfIv6h4a",
      }, // hashed password for 'password1'
      {
        username: "user2",
        password:
          "$2b$10$QMyz1vL3jNTmHsXnXtSG1eucCwW1q6Y.QwdJRCz52I8O3tyQU8RX.",
      }, // hashed password for 'password2'
    ];
    resolve(initialUsers);
  }, 1000);
});

const initializeBooks = new Promise((resolve, reject) => {
  setTimeout(() => {
    const initialBooks = [
      {
        id: 1,
        title: "Book 1",
        author: "Author 1",
        ISBN: "1234567890",
        reviews: [],
      },
      {
        id: 2,
        title: "Book 2",
        author: "Author 2",
        ISBN: "0987654321",
        reviews: [],
      },
    ];
    resolve(initialBooks);
  }, 1000);
});

Promise.all([initializeUsers, initializeBooks])
  .then(([initializedUsers, initializedBooks]) => {
    users = initializedUsers;
    books = initializedBooks;

    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Error initializing data:", err);
  });

app.use(bodyParser.json());

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, "secret", (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = decoded.user;
    next();
  });
};

app.post("/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  bcrypt
    .hash(password, 10)
    .then((hashedPassword) => {
      users.push({ username, password: hashedPassword });
      res.status(201).json({ message: "User registered successfully" });
    })
    .catch((err) => {
      console.error("Error while hashing password:", err);
      res.status(500).json({ message: "Internal Server Error" });
    });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  bcrypt
    .compare(password, user.password)
    .then((result) => {
      if (!result) {
        return res
          .status(401)
          .json({ message: "Invalid username or password" });
      }

      const token = jwt.sign({ user: username }, "secret", { expiresIn: "1h" });
      res.json({ token });
    })
    .catch((err) => {
      console.error("Error while comparing passwords:", err);
      res.status(500).json({ message: "Internal Server Error" });
    });
});

app.get("/books", (req, res) => {
  getBooks()
    .then((books) => {
      res.json(books);
    })
    .catch((err) => {
      console.error("Error getting books:", err);
      res.status(500).json({ message: "Internal Server Error" });
    });
});

function getBooks() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(books);
    }, 1000); // Simulate delay of 1 second
  });
}

app.get("/books/search", (req, res) => {
  const { query } = req.query;

  searchBooks(query)
    .then((results) => {
      res.json(results);
    })
    .catch((err) => {
      console.error("Error searching books:", err);
      res.status(500).json({ message: "Internal Server Error" });
    });
});

function searchBooks(query) {
  return new Promise((resolve, reject) => {
    // Simulate an asynchronous operation to search books data
    setTimeout(() => {
      const results = books.filter((book) => {
        return (
          book.ISBN.includes(query) ||
          book.author.toLowerCase().includes(query.toLowerCase()) ||
          book.title.toLowerCase().includes(query.toLowerCase())
        );
      });
      resolve(results);
    }, 1000); // Simulate delay of 1 second
  });
}
app.get("/books/:id/reviews", (req, res) => {
  const bookId = parseInt(req.params.id);
  const book = books.find((book) => book.id === bookId);

  if (!book) {
    return res.status(404).json({ message: "Book not found" });
  }

  res.json(book.reviews);
});

app.post("/books/:id/reviews", authenticateUser, (req, res) => {
  const bookId = parseInt(req.params.id);
  const { review } = req.body;

  const book = books.find((book) => book.id === bookId);
  if (!book) {
    return res.status(404).json({ message: "Book not found" });
  }

  const reviewId = ++lastReviewId; // Generate auto-incrementing review ID
  book.reviews.push({ id: reviewId, user: req.user, review }); // Include review ID

  res.status(201).json({ message: "Review added successfully", reviewId });
});

app.delete("/books/:id/reviews/:reviewId", authenticateUser, (req, res) => {
  const bookId = parseInt(req.params.id);
  const reviewId = parseInt(req.params.reviewId);

  const book = books.find((book) => book.id === bookId);
  if (!book) {
    return res.status(404).json({ message: "Book not found" });
  }

  const deletedReviewIndex = book.reviews.findIndex(
    (review) => review.id === reviewId && review.user === req.user
  );
  if (deletedReviewIndex === -1) {
    return res
      .status(404)
      .json({ message: "Review not found or unauthorized" });
  }

  book.reviews.splice(deletedReviewIndex, 1);

  res.json({ message: "Review deleted successfully" });
});
