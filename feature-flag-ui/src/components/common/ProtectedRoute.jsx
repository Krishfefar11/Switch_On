import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Spinner from './Spinner';

const ProtectedRoute = ({ children, roles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Spinner />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', margin: '2rem auto', maxWidth: '400px' }}>
        <h2>403 Forbidden</h2>
        <p>Insufficient role to access this page.</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
