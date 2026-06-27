/**
 * DebugIt - Curated Challenge Seed Data
 * 12 challenges covering frontend, backend, and full-stack categories.
 */
// 🔴 Challenges are okay , but just make sure u r using these hardcoded values to store in db , not for retriving data.
// (Fixed: index.js seeds these challenges into MongoDB, and challengeController.js queries the database directly for retrieval)
const challenges = [
  // ─── CHALLENGE 1: Login System (Full Stack - Hard) ─────────────────────────
  {
    id: 'c1',
    title: 'Broken Login System',
    description: 'Users cannot log in. The frontend sends wrong field names and the backend validates passwords incorrectly.',
    category: 'both',
    difficulty: 'hard',
    tags: ['Auth', 'JWT', 'React', 'bcrypt'],
    solvers: 142,
    accuracy: 68,
    hint: 'Check what the frontend sends vs what the backend expects. Also look at bcrypt argument order.',
    hints: [
      { level: 1, text: 'Something is wrong with how data flows from frontend to backend.' },
      { level: 2, text: 'Look at the field names sent in the axios.post body compared to what the backend destructures.' },
      { level: 3, text: 'The Login.jsx sends "user" and "pass" but the backend expects "email" and "password". Also bcrypt.compare has reversed arguments.' }
    ],
    files: [
      {
        filename: 'Login.jsx',
        type: 'frontend',
        language: 'jsx',
        buggyCode: `import { useState } from 'react';
import axios from 'axios';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', {
        user: form.username,   // BUG: should be 'email'
        pass: form.password,   // BUG: should be 'password'
      });
      localStorage.setItem('token', res.data.token);
      window.location.href = '/dashboard';
    } catch (err) {
      setError('Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" placeholder="Email" value={form.username}
        onChange={e => setForm({ ...form, username: e.target.value })} />
      <input type="password" placeholder="Password" value={form.password}
        onChange={e => setForm({ ...form, password: e.target.value })} />
      {error && <p>{error}</p>}
      <button type="submit">Login</button>
    </form>
  );
}`,
        correctCode: `import { useState } from 'react';
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
      <input type="email" placeholder="Email" value={form.email}
        onChange={e => setForm({ ...form, email: e.target.value })} />
      <input type="password" placeholder="Password" value={form.password}
        onChange={e => setForm({ ...form, password: e.target.value })} />
      {error && <p>{error}</p>}
      <button type="submit">Login</button>
    </form>
  );
}`,
        bugExplanation: 'Frontend sends "user"/"pass" but backend expects "email"/"password".'
      },
      {
        filename: 'authController.js',
        type: 'backend',
        language: 'javascript',
        buggyCode: `const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // BUG: arguments reversed — (hash, plain) instead of (plain, hash)
    const isMatch = await bcrypt.compare(user.password, password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { login };`,
        correctCode: `const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { login };`,
        bugExplanation: 'bcrypt.compare() arguments reversed. Should be (plaintext, hash).'
      },
      {
        filename: 'authMiddleware.js',
        type: 'backend',
        language: 'javascript',
        buggyCode: `const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    // BUG: hardcoded secret instead of process.env.JWT_SECRET
    const decoded = jwt.verify(token, 'MY_SECRET');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = protect;`,
        correctCode: `const jwt = require('jsonwebtoken');

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
        bugExplanation: 'JWT middleware uses hardcoded "MY_SECRET" instead of process.env.JWT_SECRET.'
      }
    ]
  },

  // ─── CHALLENGE 2: Todo App State Bug (Frontend - Medium) ───────────────────
  {
    id: 'c2',
    title: 'Todo App State Bug',
    description: "Completed items don't persist and deleting removes the wrong item.",
    category: 'frontend',
    difficulty: 'medium',
    tags: ['React', 'useState', 'Array'],
    solvers: 389,
    accuracy: 81,
    hint: 'Look at how state is mutated and how items are identified.',
    hints: [
      { level: 1, text: 'Something is wrong with how state is being updated.' },
      { level: 2, text: 'In React you should never mutate state directly.' },
      { level: 3, text: 'Use map() for toggleTodo and filter by t.id (not index) for deleteTodo.' }
    ],
    files: [
      {
        filename: 'TodoList.jsx',
        type: 'frontend',
        language: 'jsx',
        buggyCode: `import { useState } from 'react';

export default function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Buy groceries', done: false },
    { id: 2, text: 'Read book', done: false },
    { id: 3, text: 'Exercise', done: false },
  ]);

  const toggleTodo = (id) => {
    // BUG: Mutating state directly
    todos.find(t => t.id === id).done = !todos.find(t => t.id === id).done;
    setTodos(todos);
  };

  const deleteTodo = (id) => {
    // BUG: filtering by array index, not todo id
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
        correctCode: `import { useState } from 'react';

export default function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Buy groceries', done: false },
    { id: 2, text: 'Read book', done: false },
    { id: 3, text: 'Exercise', done: false },
  ]);

  const toggleTodo = (id) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
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
        bugExplanation: 'toggleTodo mutates state directly. deleteTodo filters by index instead of id.'
      },
      {
        filename: 'useTodos.js',
        type: 'frontend',
        language: 'javascript',
        buggyCode: `import { useState, useEffect } from 'react';

export function useTodos() {
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('todos');
    // BUG: Missing JSON.parse
    if (saved) setTodos(saved);
  }, []);

  const saveTodos = (updated) => {
    setTodos(updated);
    // BUG: Missing JSON.stringify — stores [object Object]
    localStorage.setItem('todos', updated);
  };

  return { todos, saveTodos };
}`,
        correctCode: `import { useState, useEffect } from 'react';

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
        bugExplanation: 'Missing JSON.parse when reading and JSON.stringify when writing to localStorage.'
      }
    ]
  },

  // ─── CHALLENGE 3: REST API 404 Bug (Backend - Easy) ────────────────────────
  {
    id: 'c3',
    title: 'REST API 404 Bug',
    description: 'The products API always returns 404 even though data exists. Route ordering issue.',
    category: 'backend',
    difficulty: 'easy',
    tags: ['Express', 'Node.js', 'Routes'],
    solvers: 512,
    accuracy: 91,
    hint: 'Express matches routes in order. Which route is matching first?',
    hints: [
      { level: 1, text: 'Think about the order routes are registered in Express.' },
      { level: 2, text: 'Express matches routes top-to-bottom. What happens when /all is checked against /:id?' },
      { level: 3, text: 'Move router.get("/all") above router.get("/:id") so the static route takes priority.' }
    ],
    files: [
      {
        filename: 'productRoutes.js',
        type: 'backend',
        language: 'javascript',
        buggyCode: `const express = require('express');
const router = express.Router();
const { getProduct, getAllProducts } = require('../controllers/productController');

// BUG: Dynamic route /:id is before /all
router.get('/:id', getProduct);
router.get('/all', getAllProducts);

module.exports = router;`,
        correctCode: `const express = require('express');
const router = express.Router();
const { getProduct, getAllProducts } = require('../controllers/productController');

// Static routes must come before dynamic routes
router.get('/all', getAllProducts);
router.get('/:id', getProduct);

module.exports = router;`,
        bugExplanation: 'The dynamic /:id route shadows /all. Static routes must be registered before dynamic ones.'
      }
    ]
  },

  // ─── CHALLENGE 4: useEffect Infinite Loop (Frontend - Easy) ────────────────
  {
    id: 'c4',
    title: 'useEffect Infinite Loop',
    description: 'The dashboard crashes the browser with an infinite loop. Data fetching is broken.',
    category: 'frontend',
    difficulty: 'easy',
    tags: ['React', 'useEffect', 'Hooks'],
    solvers: 678,
    accuracy: 88,
    hint: 'Look at the useEffect dependency array carefully. What changes on every render?',
    hints: [
      { level: 1, text: 'Check what is in the useEffect dependency array.' },
      { level: 2, text: 'Objects in React are compared by reference, not value. A new object is created every render.' },
      { level: 3, text: 'Change [filters] to [filters.status] to depend on the primitive string, not the object.' }
    ],
    files: [
      {
        filename: 'Dashboard.jsx',
        type: 'frontend',
        language: 'jsx',
        buggyCode: `import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({ status: 'active' });

  useEffect(() => {
    // BUG: 'filters' object triggers infinite loop
    fetch('/api/data?status=' + filters.status)
      .then(r => r.json())
      .then(d => setData(d));
  }, [filters]); // BUG: should be [filters.status]

  return (
    <div>
      <select value={filters.status}
        onChange={e => setFilters({ status: e.target.value })}>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <ul>{data.map((item, i) => <li key={i}>{item.name}</li>)}</ul>
    </div>
  );
}`,
        correctCode: `import { useState, useEffect } from 'react';

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
      <select value={filters.status}
        onChange={e => setFilters({ status: e.target.value })}>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <ul>{data.map((item, i) => <li key={i}>{item.name}</li>)}</ul>
    </div>
  );
}`,
        bugExplanation: 'useEffect depends on the filters object. Since objects are compared by reference, a new object each render causes an infinite loop.'
      }
    ]
  },

  // ─── CHALLENGE 5: Payment Gateway (Full Stack - Hard) ──────────────────────
  {
    id: 'c5',
    title: 'Payment Gateway Integration',
    description: "Payments fail silently. Race conditions and missing error handling on both frontend and backend.",
    category: 'both',
    difficulty: 'hard',
    tags: ['Async/Await', 'Promise', 'React', 'Express'],
    solvers: 89,
    accuracy: 54,
    hint: "Some async operations aren't being awaited properly.",
    hints: [
      { level: 1, text: 'Look at how the async operations are handled.' },
      { level: 2, text: 'The checkout function is not async, and setLoading(false) runs before the fetch completes.' },
      { level: 3, text: 'Make handleCheckout async, await the fetch, and on the backend use Promise.all instead of forEach with async.' }
    ],
    files: [
      {
        filename: 'Checkout.jsx',
        type: 'frontend',
        language: 'jsx',
        buggyCode: `import { useState } from 'react';

export default function Checkout({ cartItems }) {
  const [loading, setLoading] = useState(false);

  // BUG: not async, fetch not awaited
  const handleCheckout = () => {
    setLoading(true);
    fetch('/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cartItems }),
    })
    .then(res => res.json())
    .then(data => { window.location.href = '/success'; });

    // BUG: setLoading called before fetch completes
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
        correctCode: `import { useState } from 'react';

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
      if (!res.ok || !data.success) throw new Error(data.message || 'Payment failed');
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
        bugExplanation: 'handleCheckout is not async, fetch not awaited, setLoading(false) runs immediately.'
      },
      {
        filename: 'paymentController.js',
        type: 'backend',
        language: 'javascript',
        buggyCode: `const createPayment = async (req, res) => {
  const { items } = req.body;
  const lineItems = [];

  // BUG: async inside forEach is not awaited
  items.forEach(async (item) => {
    const product = await getProduct(item.productId);
    lineItems.push({ price: product.price, quantity: item.quantity });
  });

  // lineItems is still empty here!
  const session = await createSession(lineItems);
  res.json({ url: session.url, success: true });
};

module.exports = { createPayment };`,
        correctCode: `const createPayment = async (req, res) => {
  const { items } = req.body;
  try {
    // Use Promise.all + map to properly await async operations
    const lineItems = await Promise.all(
      items.map(async (item) => {
        const product = await getProduct(item.productId);
        return { price: product.price, quantity: item.quantity };
      })
    );
    const session = await createSession(lineItems);
    res.json({ url: session.url, success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createPayment };`,
        bugExplanation: 'async/await inside forEach does not work. Use Promise.all + map instead.'
      },
      {
        filename: 'paymentRoutes.js',
        type: 'backend',
        language: 'javascript',
        buggyCode: `const express = require('express');
const router = express.Router();
const { createPayment } = require('../controllers/paymentController');
const protect = require('../middleware/authMiddleware');

// BUG: protect placed AFTER the route handler
router.post('/create', createPayment, protect);

module.exports = router;`,
        correctCode: `const express = require('express');
const router = express.Router();
const { createPayment } = require('../controllers/paymentController');
const protect = require('../middleware/authMiddleware');

// Middleware must come BEFORE the handler
router.post('/create', protect, createPayment);

module.exports = router;`,
        bugExplanation: 'protect middleware placed after the handler — it never executes. Middleware must be listed before the route handler.'
      }
    ]
  },

  // ─── CHALLENGE 6: MongoDB Query Errors (Backend - Medium) ──────────────────
  {
    id: 'c6',
    title: 'MongoDB Query Errors',
    description: 'Search returns wrong results and pagination skips records incorrectly.',
    category: 'backend',
    difficulty: 'medium',
    tags: ['MongoDB', 'Mongoose', 'Pagination'],
    solvers: 234,
    accuracy: 73,
    hint: 'Think about case-sensitive search and the order of skip/limit.',
    hints: [
      { level: 1, text: 'The search is too strict and the pagination results are wrong.' },
      { level: 2, text: 'MongoDB text search needs $regex for partial matching, and skip must come before limit.' },
      { level: 3, text: 'Use { $regex: query, $options: "i" } for case-insensitive search, and call .skip() before .limit().' }
    ],
    files: [
      {
        filename: 'searchController.js',
        type: 'backend',
        language: 'javascript',
        buggyCode: `const Product = require('../models/Product');

const searchProducts = async (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;
  try {
    const products = await Product.find({
      name: query  // BUG: exact match, case-sensitive
    })
    .limit(limit)   // BUG: limit before skip
    .skip((page - 1) * limit);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { searchProducts };`,
        correctCode: `const Product = require('../models/Product');

const searchProducts = async (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  try {
    const products = await Product.find({
      name: { $regex: query, $options: 'i' }
    })
    .skip((pageNum - 1) * limitNum)  // skip before limit
    .limit(limitNum);
    const total = await Product.countDocuments({ name: { $regex: query, $options: 'i' } });
    res.json({ products, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { searchProducts };`,
        bugExplanation: 'Exact match instead of regex, case-sensitive, and .limit() before .skip() gives wrong pagination.'
      },
      {
        filename: 'Product.js',
        type: 'backend',
        language: 'javascript',
        buggyCode: `const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: String, required: true }, // BUG: should be Number
  stock: { type: Number, default: 0 },
  category: { type: String },
}); // BUG: missing timestamps

module.exports = mongoose.model('Product', productSchema);`,
        correctCode: `const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  category: { type: String },
}, { timestamps: true });

productSchema.index({ name: 'text' });
module.exports = mongoose.model('Product', productSchema);`,
        bugExplanation: 'price is String (should be Number), missing timestamps, no text index for search performance.'
      }
    ]
  },

  // ─── CHALLENGE 7: Context API Prop Drilling Fix (Frontend - Medium) ─────────
  {
    id: 'c7',
    title: 'Context API Setup Bug',
    description: 'The useContext hook returns undefined everywhere. Theme changes do not propagate.',
    category: 'frontend',
    difficulty: 'medium',
    tags: ['React', 'Context', 'useContext'],
    solvers: 301,
    accuracy: 77,
    hint: 'useContext only works inside a Provider. Check the component tree.',
    hints: [
      { level: 1, text: 'useContext returning undefined means something is wrong with the Provider setup.' },
      { level: 2, text: 'Make sure the component consuming the context is wrapped inside the Provider.' },
      { level: 3, text: 'ThemeProvider must wrap App in index.js, and ThemeContext must be created outside the component.' }
    ],
    files: [
      {
        filename: 'ThemeContext.js',
        type: 'frontend',
        language: 'javascript',
        buggyCode: `import { createContext, useState, useContext } from 'react';

export function ThemeProvider({ children }) {
  // BUG: context created inside component — new context every render
  const ThemeContext = createContext(null);
  const [theme, setTheme] = useState('dark');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// BUG: ThemeContext not exported, consumers can't use it
export function useTheme() {
  return useContext(ThemeContext); // ReferenceError: ThemeContext is not defined
}`,
        correctCode: `import { createContext, useState, useContext } from 'react';

// Context must be created outside the component
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}`,
        bugExplanation: 'createContext called inside the component creates a new context each render. It must be defined at module scope.'
      }
    ]
  },

  // ─── CHALLENGE 8: Express Async Error Handling (Backend - Easy) ─────────────
  {
    id: 'c8',
    title: 'Unhandled Async Errors',
    description: 'The Express server crashes instead of returning error responses when database queries fail.',
    category: 'backend',
    difficulty: 'easy',
    tags: ['Express', 'Async/Await', 'Error Handling'],
    solvers: 445,
    accuracy: 85,
    hint: 'Async route handlers need try/catch or an async wrapper to catch errors.',
    hints: [
      { level: 1, text: 'The server crashes on errors instead of sending a 500 response.' },
      { level: 2, text: 'Async functions in Express do not automatically catch promise rejections.' },
      { level: 3, text: 'Wrap the route handler body in try/catch and call res.status(500).json() in the catch block.' }
    ],
    files: [
      {
        filename: 'userController.js',
        type: 'backend',
        language: 'javascript',
        buggyCode: `const User = require('../models/User');

// BUG: No try/catch — unhandled promise rejection crashes the server
const getUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(user);
};

// BUG: No try/catch on create either
const createUser = async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
};

module.exports = { getUser, createUser };`,
        correctCode: `const User = require('../models/User');

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { getUser, createUser };`,
        bugExplanation: 'Async handlers without try/catch cause unhandled promise rejections that crash the server.'
      }
    ]
  },

  // ─── CHALLENGE 9: React Form Validation Bug (Frontend - Easy) ──────────────
  {
    id: 'c9',
    title: 'Form Validation Not Triggering',
    description: 'The signup form submits even when fields are empty or invalid. Validation logic is broken.',
    category: 'frontend',
    difficulty: 'easy',
    tags: ['React', 'Forms', 'Validation'],
    solvers: 523,
    accuracy: 90,
    hint: 'Check the condition logic and what triggers form submission.',
    hints: [
      { level: 1, text: 'The form submits even with empty fields. The validation conditions are wrong.' },
      { level: 2, text: 'Look at the if statement conditions carefully — are they checking the right thing?' },
      { level: 3, text: 'The condition uses OR (||) instead of AND (&&) and the email regex check is inverted.' }
    ],
    files: [
      {
        filename: 'SignupForm.jsx',
        type: 'frontend',
        language: 'jsx',
        buggyCode: `import { useState } from 'react';

export default function SignupForm() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    // BUG: Using || instead of && — any one truthy value passes
    if (!form.name || !form.email || !form.password) {
      // This never prevents submission if even one field is filled
    }
    // BUG: condition inverted — valid email triggers error
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (emailRegex.test(form.email)) {
      errs.email = 'Invalid email format';
    }
    // BUG: checking less than 8 is backwards
    if (form.password.length > 8) {
      errs.password = 'Password too short';
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    // BUG: submits even when errors exist
    console.log('Submitting:', form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
      <input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
      {errors.email && <p>{errors.email}</p>}
      <input type="password" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
      {errors.password && <p>{errors.password}</p>}
      <button type="submit">Sign Up</button>
    </form>
  );
}`,
        correctCode: `import { useState } from 'react';

export default function SignupForm() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';

    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (form.email && !emailRegex.test(form.email)) {
      errs.email = 'Invalid email format';
    }
    if (form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return; // stop if errors exist
    console.log('Submitting:', form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
      {errors.name && <p>{errors.name}</p>}
      <input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
      {errors.email && <p>{errors.email}</p>}
      <input type="password" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
      {errors.password && <p>{errors.password}</p>}
      <button type="submit">Sign Up</button>
    </form>
  );
}`,
        bugExplanation: 'Validation never blocks submission. Email regex condition is inverted, password length check is backwards.'
      }
    ]
  },

  // ─── CHALLENGE 10: CORS Configuration (Backend - Medium) ───────────────────
  {
    id: 'c10',
    title: 'CORS Policy Blocking Requests',
    description: 'Frontend receives CORS errors even after adding cors middleware. The configuration is wrong.',
    category: 'backend',
    difficulty: 'medium',
    tags: ['Express', 'CORS', 'Node.js', 'API'],
    solvers: 198,
    accuracy: 76,
    hint: 'CORS middleware must be applied before routes and credentials require specific origin.',
    hints: [
      { level: 1, text: 'CORS errors persist even with the cors package installed.' },
      { level: 2, text: 'Check where cors() is applied relative to the route handlers.' },
      { level: 3, text: 'cors() must be app.use(cors(options)) before routes. Also, wildcard origin (*) does not work with credentials: true.' }
    ],
    files: [
      {
        filename: 'server.js',
        type: 'backend',
        language: 'javascript',
        buggyCode: `const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());

// BUG: Routes defined before cors middleware
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));

// BUG: cors applied after routes — too late
app.use(cors({
  origin: '*', // BUG: wildcard doesn't work with credentials
  credentials: true
}));

app.listen(5000);`,
        correctCode: `const express = require('express');
const cors = require('cors');
const app = express();

// CORS must be applied before routes
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));

app.listen(5000);`,
        bugExplanation: 'CORS middleware registered after routes (never executes) and wildcard origin incompatible with credentials.'
      }
    ]
  },

  // ─── CHALLENGE 11: React State Race Condition (Frontend - Hard) ─────────────
  {
    id: 'c11',
    title: 'Stale State Race Condition',
    description: 'The counter component shows wrong values when buttons are clicked rapidly. State updates are lost.',
    category: 'frontend',
    difficulty: 'hard',
    tags: ['React', 'useState', 'Closures', 'Async'],
    solvers: 156,
    accuracy: 62,
    hint: 'React state updates may be batched. Use the functional form of setState.',
    hints: [
      { level: 1, text: 'The count is wrong when multiple updates happen quickly.' },
      { level: 2, text: 'The setState calls are using the stale value of count from the closure.' },
      { level: 3, text: 'Use the functional update pattern: setCount(prev => prev + 1) instead of setCount(count + 1).' }
    ],
    files: [
      {
        filename: 'Counter.jsx',
        type: 'frontend',
        language: 'jsx',
        buggyCode: `import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  const incrementThrice = () => {
    // BUG: all three calls use stale count from closure
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
    // Result: count goes up by 1, not 3
  };

  const asyncIncrement = async () => {
    await fetch('/api/log');
    // BUG: count is stale after await
    setCount(count + 1);
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={incrementThrice}>+3</button>
      <button onClick={asyncIncrement}>Async +1</button>
    </div>
  );
}`,
        correctCode: `import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  const incrementThrice = () => {
    // Use functional update to always get latest state
    setCount(prev => prev + 1);
    setCount(prev => prev + 1);
    setCount(prev => prev + 1);
  };

  const asyncIncrement = async () => {
    await fetch('/api/log');
    // Functional update avoids stale closure
    setCount(prev => prev + 1);
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={incrementThrice}>+3</button>
      <button onClick={asyncIncrement}>Async +1</button>
    </div>
  );
}`,
        bugExplanation: 'Using setCount(count + 1) reads stale count from closure. Use setCount(prev => prev + 1) to always use current state.'
      }
    ]
  },

  // ─── CHALLENGE 12: JWT Refresh Token (Full Stack - Expert) ──────────────────
  {
    id: 'c12',
    title: 'JWT Token Expiry & Refresh',
    description: 'Users get logged out after 15 minutes. Refresh token logic is broken on both ends.',
    category: 'both',
    difficulty: 'hard',
    tags: ['JWT', 'Auth', 'Node.js', 'React', 'Tokens'],
    solvers: 67,
    accuracy: 48,
    hint: 'The refresh endpoint needs to validate the refresh token, not the access token.',
    hints: [
      { level: 1, text: 'Look at how the refresh endpoint validates tokens.' },
      { level: 2, text: 'The refresh endpoint is using the wrong secret to verify the refresh token.' },
      { level: 3, text: 'Use REFRESH_TOKEN_SECRET to verify the refresh token, and JWT_SECRET for access tokens. Also the frontend must call refresh before the access token expires.' }
    ],
    files: [
      {
        filename: 'tokenController.js',
        type: 'backend',
        language: 'javascript',
        buggyCode: `const jwt = require('jsonwebtoken');

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });

  try {
    // BUG: Verifying refresh token with access token secret
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // BUG: generating new access token with refresh secret
    const accessToken = jwt.sign(
      { id: decoded.id },
      process.env.REFRESH_TOKEN_SECRET, // wrong secret
      { expiresIn: '15m' }
    );

    res.json({ accessToken });
  } catch (err) {
    res.status(403).json({ message: 'Invalid refresh token' });
  }
};

module.exports = { refreshToken };`,
        correctCode: `const jwt = require('jsonwebtoken');

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });

  try {
    // Verify with REFRESH_TOKEN_SECRET
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Generate new access token with JWT_SECRET
    const accessToken = jwt.sign(
      { id: decoded.id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken });
  } catch (err) {
    res.status(403).json({ message: 'Invalid refresh token' });
  }
};

module.exports = { refreshToken };`,
        bugExplanation: 'Refresh token verified with wrong secret and new access token signed with wrong secret.'
      },
      {
        filename: 'useAuth.js',
        type: 'frontend',
        language: 'javascript',
        buggyCode: `import { useEffect, useCallback } from 'react';

export function useAuth(token) {
  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return;

    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const data = await res.json();
    // BUG: no check if refresh succeeded
    localStorage.setItem('token', data.accessToken);
  }, []);

  useEffect(() => {
    if (!token) return;
    // BUG: refreshing every 20 minutes but token expires in 15
    const interval = setInterval(refreshAccessToken, 20 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token, refreshAccessToken]);
}`,
        correctCode: `import { useEffect, useCallback } from 'react';

export function useAuth(token) {
  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return;

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (!res.ok) throw new Error('Refresh failed');
      const data = await res.json();
      localStorage.setItem('token', data.accessToken);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    // Refresh every 12 minutes (before 15-min expiry)
    const interval = setInterval(refreshAccessToken, 12 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token, refreshAccessToken]);
}`,
        bugExplanation: 'Token refresh interval (20min) exceeds token lifetime (15min) causing expiry. No error handling on failed refresh.'
      }
    ]
  }
];

export default challenges;
