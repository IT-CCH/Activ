import { useEffect } from 'react';

const usePageTitle = (title) => {
  useEffect(() => {
    if (title) {
      document.title = `${title} - Activity Planner`;
    } else {
      document.title = 'Activity Planner';
    }
  }, [title]);
};

export default usePageTitle;
