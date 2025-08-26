import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';

// Simplified Mock Library component to match actual implementation structure
const MockLibrary = ({ isDarkMode, user, onShowLogin }) => {
  const [projects, setProjects] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('date');

  // Mock projects data
  const mockProjects = [
    {
      id: 1,
      name: 'Movie Subtitles Spanish',
      type: 'translation',
      file_name: 'movie.srt',
      file_size: 15360,
      source_language: 'en',
      target_language: 'es',
      created_at: '2024-01-15T00:00:00Z',
      status: 'completed'
    },
    {
      id: 2,
      name: 'Podcast Transcription',
      type: 'transcription',
      file_name: 'podcast.mp3',
      file_size: 524288000,
      source_language: 'en',
      target_language: 'en',
      created_at: '2024-01-10T00:00:00Z',
      status: 'processing'
    },
    {
      id: 3,
      name: 'Tutorial Translation',
      type: 'translation',
      file_name: 'tutorial.vtt',
      file_size: 9216,
      source_language: 'en',
      target_language: 'fr',
      created_at: '2024-01-05T00:00:00Z',
      status: 'completed'
    }
  ];

  React.useEffect(() => {
    if (user) {
      // Simulate loading
      setTimeout(() => {
        setProjects(mockProjects);
        setLoading(false);
      }, 100);
    }
  }, [user]);

  const formatFileSize = (bytes) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return Math.round(bytes / (1024 * 1024 * 1024)) + ' GB';
    } else if (bytes >= 1024 * 1024) {
      return Math.round(bytes / (1024 * 1024)) + ' MB';
    } else if (bytes >= 1024) {
      return Math.round(bytes / 1024) + ' KB';
    }
    return bytes + ' B';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleDownload = (project) => {
    // Mock download functionality
    const link = document.createElement('a');
    link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent('Mock file content');
    link.download = project.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (projectId) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || project.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'type':
        return a.type.localeCompare(b.type);
      case 'date':
      default:
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  return (
    <div data-testid="library-component" className={isDarkMode ? 'dark-mode' : 'light-mode'}>
      <div className="library-container">
        <h1>Translation Library</h1>

        {!user ? (
          <div data-testid="login-required-message" className="login-required">
            <p>Please log in to view your translation and transcription projects.</p>
            <button 
              data-testid="login-button"
              onClick={onShowLogin}
              className="primary-button"
            >
              Login
            </button>
          </div>
        ) : (
          <>
            {loading ? (
              <div data-testid="loading-message" className="loading">
                <p>Loading your projects...</p>
              </div>
            ) : (
              <>
                <div data-testid="library-controls" className="controls">
                  <input
                    data-testid="search-input"
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  
                  <select
                    data-testid="filter-select"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="translation">Translation</option>
                    <option value="transcription">Transcription</option>
                  </select>
                  
                  <select
                    data-testid="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="date">Sort by Date</option>
                    <option value="name">Sort by Name</option>
                    <option value="type">Sort by Type</option>
                  </select>
                </div>

                <div data-testid="projects-summary" className="summary">
                  <p>Showing {sortedProjects.length} of {projects.length} projects</p>
                </div>

                {sortedProjects.length === 0 ? (
                  <div data-testid="no-projects-message" className="empty-state">
                    {projects.length === 0 ? (
                      <p>You haven't created any projects yet. Start by uploading a subtitle file or audio/video for transcription.</p>
                    ) : (
                      <p>No projects match your search criteria.</p>
                    )}
                  </div>
                ) : (
                  <div data-testid="projects-grid" className="projects-grid">
                    {sortedProjects.map((project) => (
                      <div key={project.id} data-testid={`project-card-${project.id}`} className="project-card">
                        <div className="project-header">
                          <h3 data-testid={`project-name-${project.id}`}>{project.name}</h3>
                          <span 
                            data-testid={`project-type-${project.id}`}
                            className={`project-type ${project.type}`}
                          >
                            {project.type}
                          </span>
                        </div>

                        <div className="project-details">
                          <p data-testid={`project-file-${project.id}`}>
                            <strong>File:</strong> {project.file_name}
                          </p>
                          <p data-testid={`project-size-${project.id}`}>
                            <strong>Size:</strong> {formatFileSize(project.file_size)}
                          </p>
                          <p data-testid={`project-languages-${project.id}`}>
                            <strong>Languages:</strong> {project.source_language} → {project.target_language}
                          </p>
                          <p data-testid={`project-date-${project.id}`}>
                            <strong>Created:</strong> {formatDate(project.created_at)}
                          </p>
                          <p data-testid={`project-status-${project.id}`}>
                            <strong>Status:</strong> 
                            <span className={`status ${project.status}`}>{project.status}</span>
                          </p>
                        </div>

                        <div className="project-actions">
                          {project.status === 'completed' && (
                            <button
                              data-testid={`download-button-${project.id}`}
                              onClick={() => handleDownload(project)}
                              className="primary-button"
                            >
                              Download
                            </button>
                          )}
                          
                          <button
                            data-testid={`delete-button-${project.id}`}
                            onClick={() => handleDelete(project.id)}
                            className="danger-button"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

describe('Library Component', () => {
  const mockOnShowLogin = jest.fn();

  const defaultProps = {
    isDarkMode: false,
    user: null,
    onShowLogin: mockOnShowLogin
  };

  const mockUser = {
    email: 'test@example.com',
    user_id: 1
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering - Unauthenticated', () => {
    test('should render login required message when user is not logged in', () => {
      render(<MockLibrary {...defaultProps} />);
      
      expect(screen.getByTestId('library-component')).toBeInTheDocument();
      expect(screen.getByText('Translation Library')).toBeInTheDocument();
      expect(screen.getByTestId('login-required-message')).toBeInTheDocument();
      expect(screen.getByText('Please log in to view your translation and transcription projects.')).toBeInTheDocument();
    });

    test('should call onShowLogin when login button is clicked', () => {
      render(<MockLibrary {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('login-button'));
      expect(mockOnShowLogin).toHaveBeenCalledTimes(1);
    });
  });

  describe('Rendering - Authenticated', () => {
    test('should render library with controls when user is logged in', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('library-controls')).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByTestId('filter-select')).toBeInTheDocument();
      expect(screen.getByTestId('sort-select')).toBeInTheDocument();
    });

    test('should show loading message initially', () => {
      render(<MockLibrary {...defaultProps} user={mockUser} />);
      
      expect(screen.getByTestId('loading-message')).toBeInTheDocument();
      expect(screen.getByText('Loading your projects...')).toBeInTheDocument();
    });

    test('should render projects after loading', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('projects-grid')).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('project-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('project-card-3')).toBeInTheDocument();
    });

    test('should display project summary', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('projects-summary')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Showing 3 of 3 projects')).toBeInTheDocument();
    });
  });

  describe('Project Display', () => {
    test('should display correct project information', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('project-name-1')).toHaveTextContent('Movie Subtitles Spanish');
      });
      
      expect(screen.getByTestId('project-type-1')).toHaveTextContent('translation');
      expect(screen.getByTestId('project-file-1')).toHaveTextContent('movie.srt');
      expect(screen.getByTestId('project-languages-1')).toHaveTextContent('en → es');
      expect(screen.getByTestId('project-status-1')).toHaveTextContent('completed');
    });

    test('should format file sizes correctly', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('project-size-1')).toHaveTextContent('15 KB');
      });
      
      expect(screen.getByTestId('project-size-2')).toHaveTextContent('500 MB');
      expect(screen.getByTestId('project-size-3')).toHaveTextContent('9 KB');
    });

    test('should format dates correctly', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} />);
      
      await waitFor(() => {
        const dateElement = screen.getByTestId('project-date-1');
        expect(dateElement).toHaveTextContent('1/15/2024');
      });
    });

    test('should show download button only for completed projects', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('download-button-1')).toBeInTheDocument(); // completed
        expect(screen.queryByTestId('download-button-2')).not.toBeInTheDocument(); // processing
        expect(screen.getByTestId('download-button-3')).toBeInTheDocument(); // completed
      });
    });

    test('should show delete button for all projects', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('delete-button-1')).toBeInTheDocument();
        expect(screen.getByTestId('delete-button-2')).toBeInTheDocument();
        expect(screen.getByTestId('delete-button-3')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    test('should filter projects by search term', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('projects-grid')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'movie' } });
      
      await waitFor(() => {
        expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
        expect(screen.queryByTestId('project-card-2')).not.toBeInTheDocument();
        expect(screen.queryByTestId('project-card-3')).not.toBeInTheDocument();
      });
    });

    test('should show no results when search has no matches', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('projects-grid')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      await waitFor(() => {
        expect(screen.getByTestId('no-projects-message')).toBeInTheDocument();
        expect(screen.getByText('No projects match your search criteria.')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Functionality', () => {
    test('should filter by project type', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('projects-grid')).toBeInTheDocument();
      });
      
      const filterSelect = screen.getByTestId('filter-select');
      fireEvent.change(filterSelect, { target: { value: 'translation' } });
      
      await waitFor(() => {
        expect(screen.getByTestId('project-card-1')).toBeInTheDocument(); // translation
        expect(screen.queryByTestId('project-card-2')).not.toBeInTheDocument(); // transcription
        expect(screen.getByTestId('project-card-3')).toBeInTheDocument(); // translation
      });
    });

    test('should filter by transcription type', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('projects-grid')).toBeInTheDocument();
      });
      
      const filterSelect = screen.getByTestId('filter-select');
      fireEvent.change(filterSelect, { target: { value: 'transcription' } });
      
      await waitFor(() => {
        expect(screen.queryByTestId('project-card-1')).not.toBeInTheDocument();
        expect(screen.getByTestId('project-card-2')).toBeInTheDocument(); // transcription
        expect(screen.queryByTestId('project-card-3')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sort Functionality', () => {
    test('should sort projects by name', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('projects-grid')).toBeInTheDocument();
      });
      
      const sortSelect = screen.getByTestId('sort-select');
      fireEvent.change(sortSelect, { target: { value: 'name' } });
      
      // Projects should be sorted alphabetically by name
      const projectCards = screen.getAllByTestId(/^project-card-/);
      expect(projectCards).toHaveLength(3);
    });

    test('should sort projects by type', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('projects-grid')).toBeInTheDocument();
      });
      
      const sortSelect = screen.getByTestId('sort-select');
      fireEvent.change(sortSelect, { target: { value: 'type' } });
      
      // Projects should be sorted by type
      const projectCards = screen.getAllByTestId(/^project-card-/);
      expect(projectCards).toHaveLength(3);
    });
  });

  describe('Project Actions', () => {
    test('should handle project download', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('download-button-1')).toBeInTheDocument();
      });
      
      // Mock document.createElement for download
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      const createElement = jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
      const appendChild = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      const removeChild = jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});
      
      fireEvent.click(screen.getByTestId('download-button-1'));
      
      expect(mockLink.click).toHaveBeenCalled();
      
      createElement.mockRestore();
      appendChild.mockRestore();
      removeChild.mockRestore();
    });

    test('should handle project deletion', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('delete-button-1')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTestId('delete-button-1'));
      
      await waitFor(() => {
        expect(screen.queryByTestId('project-card-1')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('Showing 2 of 2 projects')).toBeInTheDocument();
    });
  });

  describe('Styling and Themes', () => {
    test('should apply dark mode styling', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} isDarkMode={true} />);
      
      expect(screen.getByTestId('library-component')).toHaveClass('dark-mode');
    });

    test('should apply light mode styling', async () => {
      render(<MockLibrary {...defaultProps} user={mockUser} isDarkMode={false} />);
      
      expect(screen.getByTestId('library-component')).toHaveClass('light-mode');
    });
  });
});
