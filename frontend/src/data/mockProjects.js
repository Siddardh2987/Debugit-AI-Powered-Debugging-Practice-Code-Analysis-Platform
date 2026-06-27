export const mockProjects = [
  {
    id: 'p1',
    project_title: 'Login System',
    description: 'Users cannot login to the app. The authentication seems broken — frontend sends wrong data and backend validates incorrectly.',
    category: 'both',
    difficulty: 'hard',
    tags: ['Auth', 'JWT', 'React', 'bcrypt'],
    solvers: 142,
    accuracy: 68,
    hint: 'Check what the frontend is sending vs what backend expects. Also look at the bcrypt comparison order.',
    files: [
      {
        filename: 'Login.jsx',
        type: 'frontend',
        language: 'jsx',
        buggy_code: `import { useState } from 'react';
import axios from 'axios';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', {
        user: form.username,   // BUG: should be 'email' not 'user'
        pass: form.password,   // BUG: should be 'password' not 'pass'
      });
      localStorage.setItem('token', res.data.token);
      window.location.href = '/dashboard';
    } catch (err) {
      setError('Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Email"
        value={form.username}
        onChange={e => setForm({ ...form, username: e.target.value })}
      />
      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={e => setForm({ ...form, password: e.target.value })}
      />
      {error && <p>{error}</p>}
      <button type="submit">Login</button>
    </form>
  );
}`,
        correct_code: `import { useState } from 'react';
import axios from 'axios';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', {
        email: form.email,
        password: form.password,
      });
      localStorage.setItem('token', res.data.token);
      window.location.href = '/dashboard';
    } catch (err) {
      setError('Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={e => setForm({ ...form, email: e.target.value })}
      />
      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={e => setForm({ ...form, password: e.target.value })}
      />
      {error && <p>{error}</p>}
      <button type="submit">Login</button>
    </form>
  );
}`,
        bug_explanation: 'Frontend sends wrong field names: "user" instead of "email" and "pass" instead of "password".',
      },
      {
        filename: 'authController.js',
        type: 'backend',
        language: 'javascript',
        buggy_code: `const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // BUG: bcrypt.compare arguments reversed — (hash, plain) instead of (plain, hash)
    const isMatch = await bcrypt.compare(user.password, password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { login };`,
        correct_code: `const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { login };`,
        bug_explanation: 'bcrypt.compare() has arguments reversed. It should be (plaintext, hash) but was written as (hash, plaintext).',
      },
      {
        filename: 'authMiddleware.js',
        type: 'backend',
        language: 'javascript',
        buggy_code: `const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    // BUG: Uses 'MY_SECRET' hardcoded instead of process.env.JWT_SECRET
    const decoded = jwt.verify(token, 'MY_SECRET');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = protect;`,
        correct_code: `const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = protect;`,
        bug_explanation: 'JWT middleware uses a hardcoded secret "MY_SECRET" instead of process.env.JWT_SECRET, causing token verification to always fail.',
      },
    ],
  },
  {
    id: 'p2',
    project_title: 'Todo App State Bug',
    description: "The todo app is not updating correctly. Completed items don't persist and deleting items removes the wrong one.",
    category: 'frontend',
    difficulty: 'medium',
    tags: ['React', 'useState', 'Array'],
    solvers: 389,
    accuracy: 81,
    hint: 'Look carefully at how state is being mutated and how items are being identified.',
    files: [
      {
        filename: 'TodoList.jsx',
        type: 'frontend',
        language: 'jsx',
        buggy_code: `import { useState } from 'react';

export default function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Buy groceries', done: false },
    { id: 2, text: 'Read book', done: false },
    { id: 3, text: 'Exercise', done: false },
  ]);

  const toggleTodo = (id) => {
    // BUG: Mutating state directly instead of creating new array
    todos.find(t => t.id === id).done = !todos.find(t => t.id === id).done;
    setTodos(todos);
  };

  const deleteTodo = (id) => {
    // BUG: Using index instead of id to filter
    setTodos(todos.filter((_, index) => index !== id));
  };

  return (
    <div>
      <h2>My Todos</h2>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            <span
              style={{ textDecoration: todo.done ? 'line-through' : 'none' }}
              onClick={() => toggleTodo(todo.id)}
            >
              {todo.text}
            </span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}`,
        correct_code: `import { useState } from 'react';

export default function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Buy groceries', done: false },
    { id: 2, text: 'Read book', done: false },
    { id: 3, text: 'Exercise', done: false },
  ]);

  const toggleTodo = (id) => {
    setTodos(todos.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    ));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  return (
    <div>
      <h2>My Todos</h2>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            <span
              style={{ textDecoration: todo.done ? 'line-through' : 'none' }}
              onClick={() => toggleTodo(todo.id)}
            >
              {todo.text}
            </span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}`,
        bug_explanation: 'Two bugs: 1) toggleTodo mutates state directly instead of mapping to a new array. 2) deleteTodo filters by array index instead of todo id.',
      },
      {
        filename: 'useTodos.js',
        type: 'frontend',
        language: 'javascript',
        buggy_code: `import { useState, useEffect } from 'react';

export function useTodos() {
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('todos');
    // BUG: Missing JSON.parse — assigns raw string to state
    if (saved) setTodos(saved);
  }, []);

  const saveTodos = (updated) => {
    setTodos(updated);
    // BUG: Missing JSON.stringify — stores [object Object] in localStorage
    localStorage.setItem('todos', updated);
  };

  return { todos, saveTodos };
}`,
        correct_code: `import { useState, useEffect } from 'react';

export function useTodos() {
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('todos');
    if (saved) setTodos(JSON.parse(saved));
  }, []);

  const saveTodos = (updated) => {
    setTodos(updated);
    localStorage.setItem('todos', JSON.stringify(updated));
  };

  return { todos, saveTodos };
}`,
        bug_explanation: 'Missing JSON.parse when reading from localStorage and missing JSON.stringify when writing to it.',
      },
    ],
  },
  {
    id: 'p3',
    project_title: 'REST API 404 Bug',
    description: 'The products API always returns 404 even though data exists in the database. Route ordering issue.',
    category: 'backend',
    difficulty: 'easy',
    tags: ['Express', 'Node.js', 'Routes'],
    solvers: 512,
    accuracy: 91,
    hint: 'Express matches routes in order. Think about which route is matching first.',
    files: [
      {
        filename: 'productRoutes.js',
        type: 'backend',
        language: 'javascript',
        buggy_code: `const express = require('express');
const router = express.Router();
const { getProduct, getAllProducts } = require('../controllers/productController');

// BUG: Dynamic route :id is defined BEFORE the /all route
// Express will match /all as an id parameter
router.get('/:id', getProduct);
router.get('/all', getAllProducts);

module.exports = router;`,
        correct_code: `const express = require('express');
const router = express.Router();
const { getProduct, getAllProducts } = require('../controllers/productController');

// Static routes must come before dynamic routes
router.get('/all', getAllProducts);
router.get('/:id', getProduct);

module.exports = router;`,
        bug_explanation: 'Route order matters in Express. The dynamic /:id route was placed before /all, so /all was being matched as an id parameter, calling getProduct with id="all" which returns 404.',
      },
    ],
  },
  {
    id: 'p4',
    project_title: 'useEffect Infinite Loop',
    description: 'The dashboard component crashes the browser with an infinite loop. Data fetching is broken.',
    category: 'frontend',
    difficulty: 'easy',
    tags: ['React', 'useEffect', 'Hooks'],
    solvers: 678,
    accuracy: 88,
    hint: 'Look at the useEffect dependency array carefully. What changes on every render?',
    files: [
      {
        filename: 'Dashboard.jsx',
        type: 'frontend',
        language: 'jsx',
        buggy_code: `import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({ status: 'active' });

  useEffect(() => {
    // BUG: 'filters' object is in dependency array
    // A new object is created every render, triggering infinite loop
    fetch('/api/data?status=' + filters.status)
      .then(r => r.json())
      .then(d => setData(d));
  }, [filters]); // BUG: should be [filters.status]

  return (
    <div>
      <select
        value={filters.status}
        onChange={e => setFilters({ status: e.target.value })}
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <ul>
        {data.map((item, i) => <li key={i}>{item.name}</li>)}
      </ul>
    </div>
  );
}`,
        correct_code: `import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({ status: 'active' });

  useEffect(() => {
    fetch('/api/data?status=' + filters.status)
      .then(r => r.json())
      .then(d => setData(d));
  }, [filters.status]); // Only depend on the primitive value

  return (
    <div>
      <select
        value={filters.status}
        onChange={e => setFilters({ status: e.target.value })}
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <ul>
        {data.map((item, i) => <li key={i}>{item.name}</li>)}
      </ul>
    </div>
  );
}`,
        bug_explanation: 'The useEffect depends on the entire filters object. Since objects are compared by reference in JavaScript, a new object is created every render cycle, causing an infinite loop. Fix: depend on filters.status (a string primitive) instead.',
      },
    ],
  },
  {
    id: 'p5',
    project_title: 'Payment Gateway Integration',
    description: "Payments fail silently. The checkout flow has race conditions and missing error handling on both frontend and backend.",
    category: 'both',
    difficulty: 'hard',
    tags: ['Async/Await', 'Promise', 'React', 'Express'],
    solvers: 89,
    accuracy: 54,
    hint: "Check Promise handling patterns. Some async operations aren't being awaited properly.",
    files: [
      {
        filename: 'Checkout.jsx',
        type: 'frontend',
        language: 'jsx',
        buggy_code: `import { useState } from 'react';

export default function Checkout({ cartItems }) {
  const [loading, setLoading] = useState(false);

  // BUG: async function not awaited properly, missing try/catch
  const handleCheckout = () => {
    setLoading(true);

    // BUG: fetch is not awaited — function continues immediately
    fetch('/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cartItems }),
    })
    .then(res => res.json())
    .then(data => {
      // BUG: No check if payment actually succeeded
      window.location.href = '/success';
    });

    // BUG: setLoading(false) called immediately, not after fetch
    setLoading(false);
  };

  return (
    <div>
      <h2>Checkout</h2>
      <button onClick={handleCheckout} disabled={loading}>
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </div>
  );
}`,
        correct_code: `import { useState } from 'react';

export default function Checkout({ cartItems }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartItems }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Payment failed');
      }

      window.location.href = '/success';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Checkout</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handleCheckout} disabled={loading}>
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </div>
  );
}`,
        bug_explanation: 'Three bugs: 1) handleCheckout is not async, 2) fetch not awaited — setLoading(false) runs before fetch completes, 3) No check on response success status before redirecting.',
      },
      {
        filename: 'paymentController.js',
        type: 'backend',
        language: 'javascript',
        buggy_code: `const stripe = require('stripe')(process.env.STRIPE_KEY);

const createPayment = async (req, res) => {
  const { items } = req.body;

  // BUG: forEach with async callback — not properly awaited
  const lineItems = [];
  items.forEach(async (item) => {
    // This async operation is not awaited
    const product = await stripe.products.retrieve(item.productId);
    lineItems.push({
      price: product.default_price,
      quantity: item.quantity,
    });
  });

  // BUG: lineItems will be empty here because forEach doesn't await
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: process.env.SUCCESS_URL,
    cancel_url: process.env.CANCEL_URL,
  });

  res.json({ url: session.url, success: true });
};

module.exports = { createPayment };`,
        correct_code: `const stripe = require('stripe')(process.env.STRIPE_KEY);

const createPayment = async (req, res) => {
  const { items } = req.body;

  try {
    // Use Promise.all with map instead of forEach for async operations
    const lineItems = await Promise.all(
      items.map(async (item) => {
        const product = await stripe.products.retrieve(item.productId);
        return {
          price: product.default_price,
          quantity: item.quantity,
        };
      })
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: process.env.SUCCESS_URL,
      cancel_url: process.env.CANCEL_URL,
    });

    res.json({ url: session.url, success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createPayment };`,
        bug_explanation: 'Using async/await inside forEach() does not work correctly — forEach ignores returned promises. Replace with Promise.all + map to properly await all async operations.',
      },
      {
        filename: 'paymentRoutes.js',
        type: 'backend',
        language: 'javascript',
        buggy_code: `const express = require('express');
const router = express.Router();
const { createPayment } = require('../controllers/paymentController');
const protect = require('../middleware/authMiddleware');

// BUG: protect middleware placed AFTER the route handler
router.post('/create', createPayment, protect);

module.exports = router;`,
        correct_code: `const express = require('express');
const router = express.Router();
const { createPayment } = require('../controllers/paymentController');
const protect = require('../middleware/authMiddleware');

// Middleware must come BEFORE the route handler
router.post('/create', protect, createPayment);

module.exports = router;`,
        bug_explanation: 'The auth middleware protect is placed after the route handler createPayment. Middleware must be ordered before the handler it is supposed to guard.',
      },
    ],
  },
  {
    id: 'p6',
    project_title: 'MongoDB Query Errors',
    description: 'Search and pagination APIs are broken. Search returns wrong results and pagination skips records.',
    category: 'backend',
    difficulty: 'medium',
    tags: ['MongoDB', 'Mongoose', 'Aggregation'],
    solvers: 234,
    accuracy: 73,
    hint: 'Think about how MongoDB text search works and the difference between skip/limit order.',
    files: [
      {
        filename: 'searchController.js',
        type: 'backend',
        language: 'javascript',
        buggy_code: `const Product = require('../models/Product');

const searchProducts = async (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;

  try {
    // BUG: Using regex on all fields without index — very slow
    // BUG: Case sensitive search
    const products = await Product.find({
      name: query  // BUG: Exact match, not search
    })
    // BUG: limit applied before skip — wrong pagination
    .limit(limit)
    .skip((page - 1) * limit);

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { searchProducts };`,
        correct_code: `const Product = require('../models/Product');

const searchProducts = async (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  try {
    // Use regex for case-insensitive partial matching
    const products = await Product.find({
      name: { $regex: query, $options: 'i' }
    })
    // skip must come before limit for correct pagination
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

    const total = await Product.countDocuments({
      name: { $regex: query, $options: 'i' }
    });

    res.json({ products, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { searchProducts };`,
        bug_explanation: 'Three bugs: 1) Exact match instead of regex search, 2) Case-sensitive search, 3) .limit() called before .skip() causing incorrect pagination results.',
      },
      {
        filename: 'Product.js',
        type: 'backend',
        language: 'javascript',
        buggy_code: `const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: String, required: true }, // BUG: price should be Number not String
  stock: { type: Number, default: 0 },
  category: { type: String },
  // BUG: Missing createdAt — timestamps not enabled
}, {
  // BUG: No timestamps option
});

// BUG: No index on name for search performance
module.exports = mongoose.model('Product', productSchema);`,
        correct_code: `const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true }, // Number for arithmetic operations
  stock: { type: Number, default: 0 },
  category: { type: String },
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
});

// Index on name for faster search queries
productSchema.index({ name: 'text' });

module.exports = mongoose.model('Product', productSchema);`,
        bug_explanation: 'Three bugs: 1) price type is String instead of Number (breaks price math), 2) Missing timestamps option, 3) No text index on name field for efficient search.',
      },
    ],
  },
];

export const mockUser = {
  name: 'Alex Chen',
  email: 'alex@example.com',
  avatar: 'AC',
  problems_solved: {
    frontend: 14,
    backend: 9,
    both: 6,
  },
  accuracy: 82,
  streak: 7,
  weak_areas: ['Authentication', 'Async/Await', 'Database Queries'],
  recent_activity: [
    { project: 'Todo App State Bug', category: 'frontend', score: 95, date: '2024-01-15' },
    { project: 'REST API 404 Bug', category: 'backend', score: 100, date: '2024-01-14' },
    { project: 'useEffect Infinite Loop', category: 'frontend', score: 88, date: '2024-01-13' },
    { project: 'MongoDB Query Errors', category: 'backend', score: 72, date: '2024-01-12' },
    { project: 'Login System', category: 'both', score: 65, date: '2024-01-10' },
    { project: 'Payment Gateway Integration', category: 'both', score: 58, date: '2024-01-08' },
  ],
  monthly_progress: [
    { month: 'Aug', solved: 4 },
    { month: 'Sep', solved: 7 },
    { month: 'Oct', solved: 5 },
    { month: 'Nov', solved: 9 },
    { month: 'Dec', solved: 12 },
    { month: 'Jan', solved: 8 },
  ],
};
