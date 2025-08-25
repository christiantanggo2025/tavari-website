import React, { createContext, useContext, useState, useEffect } from 'react';

const BusinessContext = createContext();

export const BusinessProvider = ({ children }) => {
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);

  // Load previously selected business from localStorage (if any)
  useEffect(() => {
    const stored = localStorage.getItem('selectedBusinessId');
    if (stored) {
      setSelectedBusinessId(stored);
    }
  }, []);

  // Update localStorage when business changes
  useEffect(() => {
    if (selectedBusinessId) {
      localStorage.setItem('selectedBusinessId', selectedBusinessId);
    }
  }, [selectedBusinessId]);

  return (
    <BusinessContext.Provider value={{ selectedBusinessId, setSelectedBusinessId }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const { selectedBusinessId, setSelectedBusinessId } = useContext(BusinessContext);
  return {
    business: { id: selectedBusinessId },
    setBusiness: setSelectedBusinessId,
  };
};

export const useBusinessContext = () => useContext(BusinessContext);