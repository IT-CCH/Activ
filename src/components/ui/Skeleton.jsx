import React from 'react';

const Skeleton = ({ className = '', children }) => (
  <div className={`animate-pulse ${className}`}>{children}</div>
);

export default Skeleton;
