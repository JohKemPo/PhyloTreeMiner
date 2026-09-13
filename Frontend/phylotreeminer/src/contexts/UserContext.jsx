import { createContext, useContext, useEffect, useState } from 'react';

// Chave única do id de usuário no localStorage — `services/http.js` lê a
// mesma chave para montar o header `X-User-ID` fora de componentes React.
export const USER_ID_STORAGE_KEY = 'phylo_user_id';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let storedId = localStorage.getItem(USER_ID_STORAGE_KEY);

    if (!storedId) {
      storedId = crypto.randomUUID();
      localStorage.setItem(USER_ID_STORAGE_KEY, storedId);
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