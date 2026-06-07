import { createContext, useState, useEffect, useContext } from 'react';
import { getMe, login as apiLogin, register as apiRegister, logout as apiLogout, refresh } from '../api/authApi';
import axiosInstance, { setAccessToken } from '../api/axiosInstance';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const { data } = await getMe();
      setUser(data);
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const responseInterceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
          originalRequest._retry = true;
          try {
            const { data } = await refresh();
            setAccessToken(data.accessToken);
            return axiosInstance(originalRequest);
          } catch (refreshError) {
            setUser(null);
            setAccessToken(null);
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    refresh()
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return fetchUser();
      })
      .catch(() => {
        setIsLoading(false);
      });

    return () => {
      axiosInstance.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await apiLogin(email, password);
    setAccessToken(data.accessToken);
    await fetchUser();
  };

  const register = async (email, password) => {
    const { data } = await apiRegister(email, password);
    setAccessToken(data.accessToken);
    await fetchUser();
  };

  // Used by InviteAcceptPage: sets the access token in memory AND
  // fetches the user profile so AuthContext.user is populated before navigation.
  const loginWithToken = async (accessToken) => {
    setAccessToken(accessToken);
    await fetchUser();
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (err) {}
    setUser(null);
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, loginWithToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
