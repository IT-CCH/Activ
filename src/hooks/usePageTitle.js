import { useEffect } from 'react';

const usePageTitle = (title) => {
  useEffect(() => {
    const originalTitle = document.title;
    
    if (title) {
      document.title = `${title} - Meal Manager`;
    } else {
      document.title = 'Meal Manager by Capital Care Homes';
    }
    
    return () => {
      document.title = originalTitle;
    };
  }, [title]);
};

export default usePageTitle;
