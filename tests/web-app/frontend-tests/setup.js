/**
 * Frontend test setup configuration
 * Sets up Jest environment for React component testing
 */

// Mock environment variables
process.env.VITE_BACKEND_URL = 'http://localhost:8000';

// Mock axios globally
import { jest } from '@jest/globals';

const mockAxios = {
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
  patch: jest.fn(() => Promise.resolve({ data: {} })),
  create: jest.fn(() => mockAxios),
  defaults: {
    headers: {
      common: {}
    }
  },
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() }
  }
};

// Mock axios
global.axios = mockAxios;

// Mock react-router-dom
const mockNavigate = jest.fn();
const mockLocation = { pathname: '/dashboard', search: '', hash: '', state: null };

global.mockNavigate = mockNavigate;
global.mockLocation = mockLocation;

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  BrowserRouter: ({ children }) => children,
  Routes: ({ children }) => children,
  Route: ({ element }) => element
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Globe: () => '<Globe />',
  Menu: () => '<Menu />',
  User: () => '<User />',
  Upload: () => '<Upload />',
  Download: () => '<Download />',
  Play: () => '<Play />',
  Pause: () => '<Pause />',
  Settings: () => '<Settings />',
  LogOut: () => '<LogOut />',
  Bell: () => '<Bell />',
  X: () => '<X />',
  Check: () => '<Check />',
  AlertCircle: () => '<AlertCircle />',
  Info: () => '<Info />',
  FileText: () => '<FileText />',
  Mic: () => '<Mic />',
  Eye: () => '<Eye />',
  EyeOff: () => '<EyeOff />',
  ChevronDown: () => '<ChevronDown />',
  ChevronUp: () => '<ChevronUp />',
  Search: () => '<Search />',
  Filter: () => '<Filter />',
  MoreVertical: () => '<MoreVertical />'
}));

// Mock notification service
const mockNotificationService = {
  addNotification: jest.fn(),
  removeNotification: jest.fn(),
  clearAll: jest.fn(),
  getNotifications: jest.fn(() => []),
  subscribe: jest.fn(() => () => {}),
  unsubscribe: jest.fn()
};

global.notificationService = mockNotificationService;

// Mock window methods
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

// Mock file operations
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock fetch
global.fetch = jest.fn();

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  mockNavigate.mockClear();
});
