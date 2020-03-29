import React, { useEffect } from 'react';
import './index.less';

const Index = ({ children, count }: any) => {
  useEffect(() => {
    return () => {
    };
  }, []);

  const overflowCount = 99;

  const getNumberedDisplayCount = function() {
    const displayCount =
      (count as number) > (overflowCount as number) ? `${overflowCount}+` : count;
    return displayCount as string | number | null;
  };

  const isHidden = function() {
    const displayCount = getNumberedDisplayCount();
    const isZero = displayCount === '0' || displayCount === 0;

    const isEmpty = displayCount === null || displayCount === undefined || displayCount === '';
    return (isEmpty || (isZero));
  };

  const hidden = isHidden();

  let showNumber = null;

  if (!hidden) {
    showNumber = (
      <span className="badge-count">
        {count}
      </span>
    );
  }

  return (
    <span className="badge">
      {children}
      {showNumber}
    </span>
  );
};

export default Index;
