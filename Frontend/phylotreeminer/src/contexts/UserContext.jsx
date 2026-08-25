import { createContext, useContext, useEffect, useState } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let storedId = localStorage.getItem('phylo_user_id');
    
    if (!storedId) {
      storedId = crypto.randomUUID();
      localStorage.setItem('phylo_user_id', storedId);
    }
    
    setUserId(storedId);
    console.log("User ID Active:", storedId);
  }, []);

  return (
    <UserContext.Provider value={{ userId }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);