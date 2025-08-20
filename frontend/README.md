## 🛠️ Tech Stack

- **React**: 18.2+ (Frontend framework)
- **JavaScript**: ES6+ (Programming language)
- **Tailwind CSS**: 3.0+ (Utility-first CSS framework)
- **Lucide React**: Latest (Beautiful icons library)
- **Fetch API**: Native browser API for HTTP requests

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js**: Version 16.0 or higher
- **npm**: Version 8.0 or higher (comes with Node.js)

### Check Your Versions

```bash
# Check Node.js version
node --version

# Check npm version
npm --version
```

## 🚀 Installation & Setup



###  Install Dependencies

```bash
npm install
```

###  Install Required Packages (if starting fresh)

```bash
# Core React dependencies (usually pre-installed)
npm install react react-dom react-scripts

# Styling framework
npm install -D tailwindcss postcss autoprefixer

# Icons library
npm install lucide-react

# Initialize Tailwind CSS (if not already configured)
npx tailwindcss init -p
```

### Configure Tailwind CSS

Create or update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Add Tailwind directives to your `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

###  Backend Configuration

Update the API base URL in your main component if your backend runs on a different port:

```javascript
// In your React component
const API_BASE_URL = 'http://localhost:8000';  // Update if needed
```

### 6. Run the Development Server

```bash
npm run dev
```

The application will open at: `http://localhost:`



## 🎯 Usage

### 1. Start the Application

```bash
npm run dev
```

### 2. Backend Connection

The app will automatically attempt to connect to the backend at `http://localhost:8000`. You'll see:

- ✅ **"Backend Status: Connected"** (green) - Ready to use
- ❌ **"Backend Status: Disconnected"** (red) - Backend not available

### Customizing the Backend URL

If your backend runs on a different port or domain, update the API configuration:

```javascript
// Option 1: Direct update in component
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Option 2: Environment-based configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-api.com' 
  : 'http://localhost:8000';
```
