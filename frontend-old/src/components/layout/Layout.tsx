import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const Layout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-2xl font-bold text-primary-600">
                Tripo
              </Link>
              <Link to="/" className="text-gray-700 hover:text-primary-600">
                Feed
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Hello, {user?.name}</span>
              <Link
                to="/profile"
                className="text-gray-700 hover:text-primary-600"
              >
                Profile
              </Link>
              <button
                onClick={logout}
                className="btn btn-secondary"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};
