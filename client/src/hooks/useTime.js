import { useContext } from 'react';
import { TimeContext } from '../context/TimeContext';

export const useTime = () => {
  const context = useContext(TimeContext);
  if (!context) {
    throw new Error('useTime must be used within a TimeProvider');
  }
  return context;
};

export default useTime;
